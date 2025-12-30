from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from .models import Notification
import secrets # CHANGED: Use secrets instead of random
import string

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 
                  'phone', 'id_number', 'profile_picture', 'specialization', 
                  'profile_completed', 'approval_status', 'email_verified', 
                  'house_number', 'date_joined', 'registration_date', 'is_active']
        read_only_fields = ['id', 'date_joined', 'approval_status', 'email_verified', 'registration_date', 'is_active']


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
        if 'id_number' in validated_data and validated_data['id_number'] == '':
            validated_data['id_number'] = None
        if 'specialization' in validated_data and validated_data['specialization'] == '':
            validated_data['specialization'] = None
        if 'email' in validated_data and validated_data['email'] == '':
            validated_data['email'] = ''
        if 'phone' in validated_data and validated_data['phone'] == '':
            validated_data['phone'] = ''
            
        validated_data['profile_completed'] = False
        validated_data['approval_status'] = 'approved'
        validated_data['email_verified'] = True
        validated_data['is_active'] = True
        
        user = User.objects.create_user(**validated_data)
        return user


class ProfileCompletionSerializer(serializers.ModelSerializer):
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


class TenantRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 
                  'phone', 'id_number']
        extra_kwargs = {
            'password': {'write_only': True},
        }
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value
    
    def validate_id_number(self, value):
        if value and User.objects.filter(id_number=value).exists():
            raise serializers.ValidationError("A user with this ID number already exists.")
        return value
    
    def create(self, validated_data):
        # CHANGED: Secure 6-digit code generation
        code = ''.join(secrets.choice(string.digits) for _ in range(6))
        
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
            id_number=validated_data.get('id_number', ''),
            password=make_password(validated_data['password']),
            role='tenant',
            approval_status='pending',
            email_verified=False,
            email_verification_token=code,
            is_active=False,
            profile_completed=False,
        )
        return user


class UserApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'approval_status', 'rejection_reason']
    
    def update(self, instance, validated_data):
        status = validated_data.get('approval_status')
        
        if status == 'approved':
            instance.approval_status = 'approved'
            instance.approved_by = self.context['request'].user
            from django.utils import timezone
            instance.approved_at = timezone.now()
            instance.rejection_reason = None
            
            if instance.email_verified:
                instance.is_active = True
            else:
                instance.is_active = False 
                
        elif status == 'rejected':
            instance.approval_status = 'rejected'
            instance.is_active = False
            instance.rejection_reason = validated_data.get('rejection_reason', 'No reason provided')
        
        instance.save()
        return instance

#Notification Serializer
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'created_at', 'link']