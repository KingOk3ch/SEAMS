from rest_framework import serializers
from .models import House, Tenant, Contract, Payment, Bill
from users.serializers import UserSerializer

class HouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = House
        fields = '__all__'

class TenantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    house_number = serializers.CharField(source='house.house_number', read_only=True)
    
    class Meta:
        model = Tenant
        fields = '__all__'

class ContractSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.user.get_full_name', read_only=True)
    house_number = serializers.CharField(source='house.house_number', read_only=True)
    
    class Meta:
        model = Contract
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.user.get_full_name', read_only=True)
    house_number = serializers.CharField(source='tenant.house.house_number', read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'tenant', 'tenant_name', 'house_number', 'amount', 'payment_date', 
                  'payment_method', 'payment_type', 'reference_number', 'month_for', 'is_verified', 'created_at']

class BillSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.user.get_full_name', read_only=True)
    house_number = serializers.CharField(source='tenant.house.house_number', read_only=True)

    class Meta:
        model = Bill
        fields = ['id', 'tenant', 'tenant_name', 'house_number', 'bill_type', 'amount', 'month_for', 'description', 'is_paid', 'created_at']