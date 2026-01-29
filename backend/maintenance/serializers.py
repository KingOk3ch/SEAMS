from rest_framework import serializers
from django.core.exceptions import ObjectDoesNotExist
from .models import MaintenanceRequest, MaintenanceImage

class MaintenanceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceImage
        # --- FIX: Add 'maintenance_request' so uploads can link to the ticket ---
        fields = ['id', 'image', 'uploaded_at', 'maintenance_request']

class MaintenanceRequestSerializer(serializers.ModelSerializer):
    images = MaintenanceImageSerializer(many=True, read_only=True)
    
    # Write-only field for uploads
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )
    
    reported_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    house_number = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceRequest
        fields = [
            'id', 
            'request_id', 
            'reported_by', 
            'reported_by_name', 
            'house', 
            'house_number',
            'category', 
            'issue_description', 
            'priority', 
            'status', 
            'assigned_to', 
            'assigned_to_name',
            'notes', 
            'created_at', 
            'assigned_at',
            'completed_at',
            'images', 
            'uploaded_images',
            'estimated_cost',
            'actual_cost'
        ]
        extra_kwargs = {
            'house': {'required': False, 'allow_null': True},
            'reported_by': {'read_only': True}
        }
        read_only_fields = ['request_id', 'created_at', 'updated_at']

    def get_reported_by_name(self, obj):
        try:
            if obj.reported_by:
                return obj.reported_by.get_full_name()
        except (ObjectDoesNotExist, AttributeError):
            pass
        return "Unknown User"

    def get_assigned_to_name(self, obj):
        try:
            if obj.assigned_to:
                return obj.assigned_to.get_full_name()
        except (ObjectDoesNotExist, AttributeError):
            pass
        return "Unassigned"

    def get_house_number(self, obj):
        # 1. Try Real Relationship
        try:
            if obj.house:
                return obj.house.house_number
        except (ObjectDoesNotExist, AttributeError):
            pass

        # 2. Try Archived Field (Fallback)
        try:
            if hasattr(obj, 'archived_house_number') and obj.archived_house_number:
                return f"{obj.archived_house_number} (Archived)"
        except Exception:
            pass

        return "Unknown House"

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        
        # Auto-assign archived fields on creation if we have the house object
        if 'house' in validated_data and validated_data['house']:
             validated_data['archived_house_number'] = validated_data['house'].house_number

        maintenance_request = MaintenanceRequest.objects.create(**validated_data)
        
        for image in uploaded_images:
            MaintenanceImage.objects.create(maintenance_request=maintenance_request, image=image)
            
        return maintenance_request
    
    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        
        # Update standard fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Add new images if provided during update
        for image in uploaded_images:
            MaintenanceImage.objects.create(maintenance_request=instance, image=image)
            
        return instance