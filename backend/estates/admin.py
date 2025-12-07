from django.contrib import admin
from .models import House, Tenant, Contract, Payment

@admin.register(House)
class HouseAdmin(admin.ModelAdmin):
    list_display = ['house_number', 'house_type', 'status', 'rent_amount', 'created_at']
    list_filter = ['status', 'house_type']
    search_fields = ['house_number', 'location']
    ordering = ['house_number']

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['user', 'house', 'status', 'move_in_date', 'contract_end']
    list_filter = ['status']
    search_fields = ['user__username', 'user__email', 'house__house_number']
    date_hierarchy = 'move_in_date'

@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'house', 'start_date', 'end_date', 'monthly_rent']
    list_filter = ['start_date', 'end_date']
    search_fields = ['tenant__user__username', 'house__house_number']
    date_hierarchy = 'start_date'

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'amount', 'payment_date', 'payment_method', 'reference_number']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['tenant__user__username', 'reference_number']
    date_hierarchy = 'payment_date'