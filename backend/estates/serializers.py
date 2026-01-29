from rest_framework import serializers
from .models import House, Tenant, Contract, Payment, Bill
from django.contrib.auth import get_user_model
from users.serializers import UserSerializer

User = get_user_model()

class HouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = House
        fields = '__all__'

class TenantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    
    tenant_name = serializers.SerializerMethodField()
    house_number = serializers.SerializerMethodField()
    house_details = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'user', 'user_id', 'tenant_name', 
            'house', 'house_number', 'house_details', 
            'move_in_date', 'contract_start', 'contract_end', 
            'emergency_contact', 'emergency_phone', 'status',
            'created_at', 'updated_at'
        ]

    def get_tenant_name(self, obj):
        if obj.user:
            full_name = obj.user.get_full_name()
            return full_name if full_name.strip() else obj.user.username
        return "Unknown User"

    def get_house_number(self, obj):
        return obj.house.house_number if obj.house else "Not Assigned"

    def get_house_details(self, obj):
        if obj.house:
            return f"{obj.house.house_number} ({obj.house.get_house_type_display()})"
        return "No House Assigned"

class ContractSerializer(serializers.ModelSerializer):
    tenant_name = serializers.SerializerMethodField()
    house_details = serializers.SerializerMethodField()
    house_number = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            'id', 'tenant', 'tenant_name', 'house', 'house_details', 'house_number',
            'start_date', 'end_date', 'monthly_rent', 'deposit_paid',
            'contract_document', 'created_at'
        ]

    def get_tenant_name(self, obj):
        if obj.tenant and obj.tenant.user:
            full_name = obj.tenant.user.get_full_name()
            return full_name if full_name.strip() else obj.tenant.user.username
        return "Unknown Tenant"

    def get_house_details(self, obj):
        if obj.house:
            return f"{obj.house.house_number} ({obj.house.get_house_type_display()})"
        return "Unknown House"
        
    def get_house_number(self, obj):
        return obj.house.house_number if obj.house else "N/A"

class PaymentSerializer(serializers.ModelSerializer):
    tenant_name = serializers.SerializerMethodField()
    house_number = serializers.SerializerMethodField()
    
    # FIX: Explicitly allow tenant to be null/missing in input 
    # (because Backend assigns it for Tenants, Admin sends it manually)
    tenant = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(), 
        required=False, 
        allow_null=True
    )

    class Meta:
        model = Payment
        fields = [
            'id', 'tenant', 'tenant_name', 'house_number', 'amount', 'payment_date',
            'payment_method', 'payment_type', 'reference_number',
            'month_for', 'is_verified', 'created_at'
        ]

    def get_tenant_name(self, obj):
        if obj.tenant and obj.tenant.user:
            full_name = obj.tenant.user.get_full_name()
            return full_name if full_name.strip() else obj.tenant.user.username
        return "Unknown Tenant"
    
    def get_house_number(self, obj):
        if obj.tenant and obj.tenant.house:
            return obj.tenant.house.house_number
        return "N/A"

class BillSerializer(serializers.ModelSerializer):
    tenant_name = serializers.SerializerMethodField()
    house_number = serializers.SerializerMethodField()

    class Meta:
        model = Bill
        fields = [
            'id', 'tenant', 'tenant_name', 'house_number', 'bill_type', 'amount',
            'month_for', 'description', 'is_paid', 
            'created_at'
        ]

    def get_tenant_name(self, obj):
        if obj.tenant and obj.tenant.user:
            full_name = obj.tenant.user.get_full_name()
            return full_name if full_name.strip() else obj.tenant.user.username
        return "Unknown Tenant"
    
    def get_house_number(self, obj):
        if obj.tenant and obj.tenant.house:
            return obj.tenant.house.house_number
        return "N/A"