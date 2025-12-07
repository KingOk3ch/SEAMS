from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from datetime import date, timedelta
from .models import House, Tenant, Contract, Payment
from .serializers import HouseSerializer, TenantSerializer, ContractSerializer, PaymentSerializer


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