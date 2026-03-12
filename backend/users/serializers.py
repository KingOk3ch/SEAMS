from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from .models import Notification
import secrets 
import string
import re

User = get_user_model()

def validate_kenyan_phone(value):
    if not value: return value
    # Matches: 07xx, 01xx, or +254xx
    if not re.match(r'^(?:\+254|0)?([17](?:(?:[0-9][0-9])|(?:0[0-8])|(?:4[0-1]))[0-9]{6})$', value):
        raise serializers.ValidationError("Enter a valid Kenyan phone number (e.g., 07xx, 01xx).")
    return value

def validate_id_format(value):
    if not value: return value
    if not value.isdigit(): raise serializers.ValidationError("ID must be digits only.")
    if not (6 <= len(value) <= 10): raise serializers.ValidationError("ID must be 6-10 digits.")
    return value

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 
                  'phone', 'id_number', 'profile_picture', 'specialization', 
                  'profile_completed', 'approval_status', 'email_verified', 
                  'house_number', 'date_joined', 'registration_date', 'is_active']
        read_only_fields = ['id', 'date_joined', 'approval_status', 'email_verified', 'registration_date', 'is_active']

    def validate_phone(self, value): return validate_kenyan_phone(value)
    def validate_id_number(self, value): return validate_id_format(value)

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    id_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    specialization = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'phone', 'id_number', 'specialization', 'profile_completed']
    
    def validate_phone(self, value): return validate_kenyan_phone(value)
    def validate_id_number(self, value): return validate_id_format(value)
    
    def create(self, validated_data):
        if 'id_number' in validated_data and validated_data['id_number'] == '':
            validated_data['id_number'] = None
        if 'specialization' in validated_data and validated_data['specialization'] == '':
            validated_data['specialization'] = None
        if 'email' in validated_data and validated_data['email'] == '':
            validated_data['email'] = ''
        if 'phone' in validated_data and validated_data['phone'] == '':
            validated_data['phone'] = ''
            
        role = validated_data.get('role', 'tenant')
        
        if role == 'tenant':
            validated_data['profile_completed'] = False
            validated_data['approval_status'] = 'pending'
            validated_data['email_verified'] = False
            validated_data['is_active'] = False
            validated_data['email_verification_token'] = ''.join(secrets.choice(string.digits) for _ in range(6))
        else:
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
    
    def validate_phone(self, value): return validate_kenyan_phone(value)
    def validate_id_number(self, value): return validate_id_format(value)
    
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
            raise serializers.ValidationError("Email already exists.")
        return value
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username taken.")
        return value
    
    def validate_phone(self, value): return validate_kenyan_phone(value)
    def validate_id_number(self, value):
        validate_id_format(value)
        if value and User.objects.filter(id_number=value).exists():
            raise serializers.ValidationError("ID number already registered.")
        return value
    
    def create(self, validated_data):
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
            if instance.email_verified: instance.is_active = True
            else: instance.is_active = False 
        elif status == 'rejected':
            instance.approval_status = 'rejected'
            instance.is_active = False
            instance.rejection_reason = validated_data.get('rejection_reason', 'No reason provided')
        instance.save()
        return instance

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'created_at', 'link']