from rest_framework import serializers
from .models import MaintenanceRequest, MaintenanceImage
from users.serializers import UserSerializer

class MaintenanceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceImage
        fields = '__all__'

class MaintenanceRequestSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    house_number = serializers.CharField(source='house.house_number', read_only=True)
    images = MaintenanceImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = MaintenanceRequest
        fields = '__all__'
        read_only_fields = ['request_id', 'created_at']