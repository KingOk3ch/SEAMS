from django.contrib import admin
from .models import MaintenanceRequest, MaintenanceImage

class MaintenanceImageInline(admin.TabularInline):
    model = MaintenanceImage
    extra = 1

@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(admin.ModelAdmin):
    list_display = ['request_id', 'house', 'category', 'priority', 'status', 'created_at']
    list_filter = ['status', 'priority', 'category']
    search_fields = ['request_id', 'house__house_number', 'issue_description']
    date_hierarchy = 'created_at'
    inlines = [MaintenanceImageInline]
    readonly_fields = ['request_id', 'created_at']

@admin.register(MaintenanceImage)
class MaintenanceImageAdmin(admin.ModelAdmin):
    list_display = ['maintenance_request', 'uploaded_at']
    search_fields = ['maintenance_request__request_id']