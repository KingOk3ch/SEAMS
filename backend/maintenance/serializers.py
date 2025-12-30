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
    house_number = serializers.CharField(source='house.house_number', read_only=True)
    images = MaintenanceImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = MaintenanceRequest
        fields = '__all__'
        read_only_fields = ['request_id', 'created_at', 'archived_reported_by']

    def get_reported_by_name(self, obj):
        # 1. Try Live User
        if obj.reported_by:
            return obj.reported_by.get_full_name()
        # 2. Try Archived Snapshot
        if obj.archived_reported_by:
            return f"{obj.archived_reported_by} (Deleted)"
        # 3. Fallback
        return "Unknown User"

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else "Unassigned"