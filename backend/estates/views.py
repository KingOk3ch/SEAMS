from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q, Sum
from datetime import date, timedelta
from django.db import IntegrityError, transaction
from decimal import Decimal
from django.utils import timezone
from .models import House, Tenant, Contract, Payment, Bill
from .serializers import HouseSerializer, TenantSerializer, ContractSerializer, PaymentSerializer, BillSerializer
from users.models import Notification
from users.permissions import IsEstateAdminOrReadOnly

class HouseViewSet(viewsets.ModelViewSet):
    queryset = House.objects.all()
    serializer_class = HouseSerializer
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

    @action(detail=True, methods=['post'], permission_classes=[IsEstateAdminOrReadOnly])
    def remind_debtor(self, request, pk=None):
        tenant = self.get_object()
        custom_message = request.data.get('message', '').strip()
        
        if custom_message:
            Notification.objects.create(
                recipient=tenant.user,
                message=custom_message,
                link='/tenant-payments'
            )
            return Response({'message': 'Custom notification sent successfully.'}, status=status.HTTP_200_OK)
        else:
            unpaid_bills = Bill.objects.filter(tenant=tenant, is_paid=False)
            total_due = sum((b.amount - b.amount_paid) for b in unpaid_bills)
            
            if total_due <= 0:
                return Response({'message': 'This tenant has no outstanding balance and no custom message was provided.'}, status=status.HTTP_400_BAD_REQUEST)
                
            Notification.objects.create(
                recipient=tenant.user,
                message=f"REMINDER: You have an outstanding balance of KES {total_due}. Please clear your dues at your earliest convenience.",
                link='/tenant-payments'
            )
            
            return Response({'message': f'Financial reminder sent successfully for KES {total_due}.'}, status=status.HTTP_200_OK)


class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'tenant':
            return Contract.objects.filter(tenant__user=user)
        return Contract.objects.all()

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        contract = self.get_object()
        
        if getattr(request.user, 'role', None) == 'tenant':
            if contract.tenant.user != request.user:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        if contract.is_accepted:
            return Response({'message': 'Contract already accepted'}, status=status.HTTP_400_BAD_REQUEST)
            
        contract.is_accepted = True
        contract.date_accepted = timezone.now()
        contract.save()
        
        return Response({
            'message': 'Contract accepted successfully', 
            'is_accepted': True
        }, status=status.HTTP_200_OK)


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
            
            if tenant_obj:
                if tenant_obj.user:
                    tenant_name = tenant_obj.user.get_full_name() or tenant_obj.user.username
                
                serializer.save(
                    is_verified=True, 
                    status='verified', 
                    archived_tenant_name=tenant_name,
                    tenant=tenant_obj 
                )
            else:
                serializer.save(is_verified=True, status='verified', archived_tenant_name=tenant_name)
            
        elif getattr(user, 'role', None) == 'tenant':
            try:
                tenant_profile = Tenant.objects.get(user=user)
                if tenant_profile.user:
                    tenant_name = tenant_profile.user.get_full_name() or tenant_profile.user.username
                
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

        with transaction.atomic():
            payment.is_verified = True
            payment.status = 'verified'
            payment.rejection_reason = None
            payment.save()

            matching_bills = Bill.objects.filter(
                tenant=payment.tenant,
                bill_type=payment.payment_type,
                is_paid=False
            ).order_by('month_for')

            remaining_credit = payment.amount
            bills_updated_count = 0

            for bill in matching_bills:
                if remaining_credit <= 0:
                    break
                
                bill_balance = bill.amount - bill.amount_paid
                amount_to_pay = min(remaining_credit, bill_balance)
                bill.amount_paid += amount_to_pay
                
                if bill.amount_paid >= bill.amount:
                    bill.is_paid = True
                
                bill.save()
                
                remaining_credit -= amount_to_pay
                bills_updated_count += 1
            
            message = f'Payment Verified. {bills_updated_count} bill(s) updated.'
            if remaining_credit > 0:
                message += f' (KES {remaining_credit} credit remaining)'

            return Response({'status': 'verified', 'message': message})

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


class DashboardStatsView(APIView):
    """
    Calculates all the heavy dashboard metrics directly on the database.
    This prevents the UI from freezing when dealing with thousands of records.
    """
    permission_classes = [IsEstateAdminOrReadOnly]

    def get(self, request):
        from django.contrib.auth import get_user_model
        from maintenance.models import MaintenanceRequest
        from maintenance.serializers import MaintenanceRequestSerializer
        from users.serializers import UserSerializer

        User = get_user_model()

        total_houses = House.objects.count()
        occupied_houses = House.objects.filter(status='occupied').count()
        vacant_houses_qs = House.objects.filter(status='vacant')
        
        total_tenants = Tenant.objects.count()
        
        pending_users_qs = User.objects.filter(approval_status='pending', role='tenant')
        
        active_requests_qs = MaintenanceRequest.objects.filter(
            status__in=['new', 'pending', 'assigned', 'in_progress']
        ).order_by('-created_at')
        
        revenue_data = Payment.objects.filter(
            Q(status='verified') | Q(is_verified=True)
        ).aggregate(total=Sum('amount'))
        
        total_revenue = revenue_data['total'] or Decimal('0.00')

        return Response({
            "stats": {
                "totalHouses": total_houses,
                "occupiedHouses": occupied_houses,
                "vacantHouses": vacant_houses_qs.count(),
                "totalTenants": total_tenants,
                "pendingApprovals": pending_users_qs.count(),
                "activeMaintenanceRequests": active_requests_qs.count(),
                "totalRevenue": total_revenue
            },
            "vacantHouses": HouseSerializer(vacant_houses_qs, many=True).data,
            "pendingUsers": UserSerializer(pending_users_qs, many=True).data,
            "maintenanceRequests": MaintenanceRequestSerializer(active_requests_qs[:5], many=True).data
        })