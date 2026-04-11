from rest_framework import serializers
from .models import House, Tenant, Contract, Payment, Bill
from django.contrib.auth import get_user_model
from users.serializers import UserSerializer
from datetime import date
from django.db.models import Q
from django.core.exceptions import ObjectDoesNotExist 
import re
import os

User = get_user_model()

class HouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = House
        fields = '__all__'

    def validate_rent_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Rent amount must be greater than 0.")
        if value > 1000000:
            raise serializers.ValidationError("Rent amount seems unusually high. Please verify.")
        return value

    def validate_status(self, value):
        if value == 'vacant' and self.instance:
            has_occupants = self.instance.tenants.exclude(
                status__in=['moved_out', 'rejected', 'evicted', 'history']
            ).exists()
            if has_occupants:
                raise serializers.ValidationError("Cannot mark house as Vacant while it has active or pending tenants.")
        return value

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
    
    def validate(self, data):
        start = data.get('contract_start')
        end = data.get('contract_end')
        if start and end and end <= start:
            raise serializers.ValidationError({"contract_end": "Contract End Date must be after Start Date."})
        return data

class ContractSerializer(serializers.ModelSerializer):
    tenant_name = serializers.SerializerMethodField()
    house_details = serializers.SerializerMethodField()
    house_number = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        # --- FIXED: Added 'is_accepted' and 'date_accepted' to the serializer ---
        fields = [
            'id', 'tenant', 'tenant_name', 'house', 'house_details', 'house_number',
            'start_date', 'end_date', 'monthly_rent', 'deposit_paid',
            'terms', 'is_accepted', 'date_accepted', 'contract_document', 'created_at'
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

    def validate(self, data):
        start = data.get('start_date')
        end = data.get('end_date')
        house = data.get('house')

        if start and end and end <= start:
            raise serializers.ValidationError({"end_date": "End Date must be after Start Date."})
        
        if start and end and house:
            overlaps = Contract.objects.filter(house=house).filter(
                Q(start_date__lte=end) & Q(end_date__gte=start)
            )
            if self.instance:
                overlaps = overlaps.exclude(id=self.instance.id)
            
            if overlaps.exists():
                raise serializers.ValidationError(f"House {house.house_number} is already booked for these dates.")

        return data

    def validate_contract_document(self, value):
        if not value: return value
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("File size too large. Limit is 5MB.")
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ['.pdf', '.doc', '.docx']:
            raise serializers.ValidationError("Only PDF and Word documents are allowed.")
        return value

class PaymentSerializer(serializers.ModelSerializer):
    tenant_name = serializers.SerializerMethodField()
    house_number = serializers.SerializerMethodField()
    
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
            'month_for', 'is_verified', 'admin_has_viewed', 'status', 'rejection_reason', 'created_at'
        ]

    def get_tenant_name(self, obj):
        try:
            if obj.tenant_id is not None and obj.tenant:
                if obj.tenant.user:
                    full_name = obj.tenant.user.get_full_name()
                    return full_name if full_name.strip() else obj.tenant.user.username
        except ObjectDoesNotExist:
            pass 
        
        return obj.archived_tenant_name or "Unknown Tenant"
    
    def get_house_number(self, obj):
        try:
            if obj.tenant_id is not None and obj.tenant and obj.tenant.house:
                return obj.tenant.house.house_number
        except ObjectDoesNotExist:
            pass
        return "N/A"

    def validate_amount(self, value):
        if value <= 0: raise serializers.ValidationError("Payment amount must be positive.")
        return value

    def validate_payment_date(self, value):
        if value > date.today(): raise serializers.ValidationError("Date cannot be in the future.")
        return value

    def validate_reference_number(self, value):
        if not value: return value
        
        # Updated to safely accept both standard M-Pesa receipts and automated CheckoutRequestIDs (e.g., ws_CO_...)
        if not re.match(r'^[A-Za-z0-9_]+$', value):
            raise serializers.ValidationError("Transaction code must be alphanumeric or a valid STK request ID.")
        if len(value) < 4:
            raise serializers.ValidationError("Code is too short.")
        return value

class BillSerializer(serializers.ModelSerializer):
    tenant_name = serializers.SerializerMethodField()
    house_number = serializers.SerializerMethodField()
    
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, source='balance_due', read_only=True)

    class Meta:
        model = Bill
        fields = [
            'id', 'tenant', 'tenant_name', 'house_number', 'bill_type', 'amount',
            'amount_paid', 'balance',
            'month_for', 'description', 'is_paid', 
            'created_at'
        ]

    def get_tenant_name(self, obj):
        try:
            if obj.tenant_id is not None and obj.tenant:
                if obj.tenant.user:
                    full_name = obj.tenant.user.get_full_name()
                    return full_name if full_name.strip() else obj.tenant.user.username
        except ObjectDoesNotExist:
            pass
        return obj.archived_tenant_name or "Unknown Tenant"
    
    def get_house_number(self, obj):
        try:
            if obj.tenant_id is not None and obj.tenant and obj.tenant.house:
                return obj.tenant.house.house_number
        except ObjectDoesNotExist:
            pass
        return "N/A"

    def validate_amount(self, value):
        if value <= 0: raise serializers.ValidationError("Bill amount must be positive.")
        return value