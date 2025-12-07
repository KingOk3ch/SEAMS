from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'id_number', 'profile_picture', 'specialization', 'profile_completed']
        read_only_fields = ['id']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    id_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    specialization = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'phone', 'id_number', 'specialization', 'profile_completed']
    
    def create(self, validated_data):
        # Convert empty strings to None for fields that should be null
        if 'id_number' in validated_data and validated_data['id_number'] == '':
            validated_data['id_number'] = None
        if 'specialization' in validated_data and validated_data['specialization'] == '':
            validated_data['specialization'] = None
        if 'email' in validated_data and validated_data['email'] == '':
            validated_data['email'] = ''
        if 'phone' in validated_data and validated_data['phone'] == '':
            validated_data['phone'] = ''
            
        # Set profile_completed to False by default
        validated_data['profile_completed'] = False
        user = User.objects.create_user(**validated_data)
        return user

class ProfileCompletionSerializer(serializers.ModelSerializer):
    """Serializer for users completing their profile on first login"""
    new_password = serializers.CharField(write_only=True, min_length=8, required=True)
    
    class Meta:
        model = User
        fields = ['email', 'phone', 'id_number', 'new_password']
    
    def update(self, instance, validated_data):
        new_password = validated_data.pop('new_password', None)
        
        instance.email = validated_data.get('email', instance.email)
        instance.phone = validated_data.get('phone', instance.phone)
        instance.id_number = validated_data.get('id_number', instance.id_number)
        instance.profile_completed = True
        
        if new_password:
            instance.set_password(new_password)
        
        instance.save()
        return instance