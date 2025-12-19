from rest_framework import serializers
from .models import House, Tenant, Contract, Payment
from users.serializers import UserSerializer

class HouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = House
        fields = '__all__'

class TenantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    house_details = HouseSerializer(source='house', read_only=True)
    
    class Meta:
        model = Tenant
        fields = ['id', 'user', 'house', 'house_details', 'move_in_date', 
                  'contract_start', 'contract_end', 'emergency_contact', 
                  'emergency_phone', 'status']

class ContractSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.user.get_full_name', read_only=True)
    house_number = serializers.CharField(source='house.house_number', read_only=True)
    
    class Meta:
        model = Contract
        fields = ['id', 'tenant', 'tenant_name', 'house', 'house_number', 
                  'start_date', 'end_date', 'monthly_rent', 'deposit_paid', 
                  'contract_document', 'created_at']

class PaymentSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.user.get_full_name', read_only=True)
    house_number = serializers.CharField(source='tenant.house.house_number', read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'tenant', 'tenant_name', 'house_number', 'amount', 'payment_date', 
                  'payment_method', 'payment_type', 'reference_number', 'month_for', 'created_at']