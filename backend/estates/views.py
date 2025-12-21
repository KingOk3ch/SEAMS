from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from datetime import date, timedelta
from .models import House, Tenant, Contract, Payment, Bill
from .serializers import HouseSerializer, TenantSerializer, ContractSerializer, PaymentSerializer, BillSerializer

class HouseViewSet(viewsets.ModelViewSet):
    queryset = House.objects.all()
    serializer_class = HouseSerializer
    permission_classes = [IsAuthenticated]

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
        """
        Optimize performance and security: 
        Tenants only see their own profile. Admins see all.
        """
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

    def destroy(self, request, *args, **kwargs):
        tenant = self.get_object()
        house = tenant.house
        
        response = super().destroy(request, *args, **kwargs)
        
        if response.status_code == 204:
            house.status = 'vacant'
            house.save()
        
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
    permission_classes = [IsAuthenticated]


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'tenant':
            # Tenants only see their own payments
            return Payment.objects.filter(tenant__user=user)
        return Payment.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        # Security Logic: Admin -> Verified, Tenant -> Pending
        is_verified = False
        if getattr(user, 'role', None) == 'estate_admin':
            is_verified = True
        serializer.save(is_verified=is_verified)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        Admin action to verify a payment manually.
        Automatically finds and clears matching Bills.
        """
        if getattr(request.user, 'role', None) != 'estate_admin':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        payment = self.get_object()
        
        if payment.is_verified:
             return Response({'status': 'warning', 'message': 'Payment was already verified'})

        payment.is_verified = True
        payment.save()

        # --- LOGIC TO LINK PAYMENT TO BILL ---
        # If this payment is for a specific bill type (e.g. Water), mark that bill as paid.
        if payment.payment_type in ['water', 'electricity', 'garbage', 'damage', 'other']:
            # Find unpaid bills for this tenant, same type, matching month/year
            matching_bills = Bill.objects.filter(
                tenant=payment.tenant,
                bill_type=payment.payment_type,
                is_paid=False,
                month_for__year=payment.month_for.year,
                month_for__month=payment.month_for.month
            )

            # Check if payment covers the bill
            bills_cleared = 0
            remaining_amount = payment.amount

            for bill in matching_bills:
                if remaining_amount >= bill.amount:
                    bill.is_paid = True
                    bill.save()
                    remaining_amount -= bill.amount
                    bills_cleared += 1
            
            if bills_cleared > 0:
                return Response({'status': 'verified', 'message': f'Payment verified. {bills_cleared} Bill(s) marked as Paid.'})

        return Response({'status': 'verified', 'message': 'Payment verified successfully'})


class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'tenant':
            # Tenant sees only their bills
            return Bill.objects.filter(tenant__user=user)
        return Bill.objects.all()