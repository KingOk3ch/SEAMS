from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from datetime import date, timedelta
from django.db import IntegrityError
from .models import House, Tenant, Contract, Payment, Bill
from .serializers import HouseSerializer, TenantSerializer, ContractSerializer, PaymentSerializer, BillSerializer
from users.models import Notification
from users.permissions import IsEstateAdminOrReadOnly # NEW IMPORT

class HouseViewSet(viewsets.ModelViewSet):
    queryset = House.objects.all()
    serializer_class = HouseSerializer
    # LOCK: Only Admins can create/edit/delete. Tenants can only View (GET).
    permission_classes = [IsEstateAdminOrReadOnly] 

    @action(detail=False, methods=['get'])
    def vacant(self, request):
        vacant_houses = House.objects.filter(status='vacant')
        serializer = self.get_serializer(vacant_houses, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = House.objects.count()
        occupied = House.objects.filter(status='occupied').count()
        vacant = House.objects.filter(status='vacant').count()
        under_repair = House.objects.filter(status='under_repair').count()
        
        occupancy_rate = round((occupied / total * 100), 1) if total > 0 else 0
        
        return Response({
            'total': total,
            'occupied': occupied,
            'vacant': vacant,
            'under_repair': under_repair,
            'occupancy_rate': occupancy_rate
        })


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'tenant':
            return Tenant.objects.filter(user=user)
        return Tenant.objects.all()

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            house_id = request.data.get('house')
            try:
                house = House.objects.get(id=house_id)
                house.status = 'occupied'
                house.save()
            except House.DoesNotExist:
                pass
        return response

    @action(detail=False, methods=['get'])
    def expiring(self, request):
        thirty_days_later = date.today() + timedelta(days=30)
        expiring_tenants = Tenant.objects.filter(
            contract_end__lte=thirty_days_later,
            contract_end__gte=date.today()
        )
        serializer = self.get_serializer(expiring_tenants, many=True)
        return Response(serializer.data)


class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer
    # LOCK: Contracts should ideally be managed by Admins only
    permission_classes = [IsEstateAdminOrReadOnly]


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'tenant':
            return Payment.objects.filter(tenant__user=user).order_by('-payment_date')
        return Payment.objects.all().order_by('-payment_date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        user = self.request.user
        tenant_name = "Unknown"
        
        if getattr(user, 'role', None) == 'estate_admin':
            tenant_obj = serializer.validated_data.get('tenant')
            if tenant_obj and tenant_obj.user:
                tenant_name = tenant_obj.user.get_full_name() or tenant_obj.user.username
            
            # Admin payments are auto-verified
            serializer.save(is_verified=True, status='verified', archived_tenant_name=tenant_name)
            
        elif getattr(user, 'role', None) == 'tenant':
            try:
                tenant_profile = Tenant.objects.get(user=user)
                if tenant_profile.user:
                    tenant_name = tenant_profile.user.get_full_name() or tenant_profile.user.username
                
                # Tenant payments are pending by default
                serializer.save(is_verified=False, status='pending', tenant=tenant_profile, archived_tenant_name=tenant_name)
            except Tenant.DoesNotExist:
                raise IntegrityError("No Tenant Profile found for this user.")
        
        else:
            serializer.save(is_verified=False, status='pending', archived_tenant_name=tenant_name)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        if getattr(request.user, 'role', None) != 'estate_admin':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        payment = self.get_object()
        if payment.status == 'verified':
             return Response({'status': 'warning', 'message': 'Payment was already verified'})

        payment.is_verified = True
        payment.status = 'verified'
        payment.rejection_reason = None
        payment.save()

        # Link Payment to Bill Logic
        if payment.payment_type in ['water', 'electricity', 'garbage', 'damage', 'other', 'rent', 'penalty']:
            matching_bills = Bill.objects.filter(
                tenant=payment.tenant,
                bill_type=payment.payment_type,
                is_paid=False
            )
            
            if payment.month_for:
                 matching_bills = matching_bills.filter(
                    month_for__year=payment.month_for.year,
                    month_for__month=payment.month_for.month
                 )

            bills_cleared = 0
            remaining_amount = payment.amount

            for bill in matching_bills:
                if remaining_amount >= bill.amount:
                    bill.is_paid = True
                    bill.save()
                    remaining_amount -= bill.amount
                    bills_cleared += 1
            
            if bills_cleared > 0:
                return Response({'status': 'verified', 'message': f'Verified. {bills_cleared} Bill(s) paid.'})

        return Response({'status': 'verified', 'message': 'Payment verified successfully'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if getattr(request.user, 'role', None) != 'estate_admin':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        payment = self.get_object()
        reason = request.data.get('reason', 'Invalid details provided.')
        
        payment.status = 'rejected'
        payment.is_verified = False
        payment.rejection_reason = reason
        payment.save()
        
        # PING THE TENANT
        if payment.tenant and payment.tenant.user:
            Notification.objects.create(
                recipient=payment.tenant.user,
                message=f"❌ Payment Rejected: {payment.payment_type.upper()} of KES {payment.amount}. Reason: {reason}",
                link='/tenant-payments'
            )
            
        return Response({'status': 'rejected', 'message': 'Payment rejected and tenant notified.'})


class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    # LOCK: Only Admins create bills. Tenants view only.
    permission_classes = [IsEstateAdminOrReadOnly] 
    
    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'tenant':
            return Bill.objects.filter(tenant__user=user).order_by('-created_at')
        return Bill.objects.all().order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        tenant_obj = serializer.validated_data.get('tenant')
        tenant_name = "Unknown"
        
        if tenant_obj and tenant_obj.user:
            tenant_name = tenant_obj.user.get_full_name() or tenant_obj.user.username
            
        serializer.save(archived_tenant_name=tenant_name)