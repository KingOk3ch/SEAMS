from rest_framework import serializers
from .models import MaintenanceRequest, MaintenanceImage
from users.serializers import UserSerializer

class MaintenanceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceImage
        fields = '__all__'

class MaintenanceRequestSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    house_number = serializers.SerializerMethodField()
    images = MaintenanceImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = MaintenanceRequest
        fields = '__all__'
        read_only_fields = ['request_id', 'created_at', 'archived_reported_by', 'archived_house_number']

    def get_reported_by_name(self, obj):
        if obj.reported_by:
            return obj.reported_by.get_full_name()
        if obj.archived_reported_by:
            return f"{obj.archived_reported_by} (Deleted)"
        return "Unknown User"

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else "Unassigned"
        
    def get_house_number(self, obj):
        if obj.house:
            return obj.house.house_number
        if obj.archived_house_number:
            return f"{obj.archived_house_number} (Deleted)"
        return "Unknown House"