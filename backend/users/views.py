from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UserRegistrationSerializer, ProfileCompletionSerializer
import random
import string

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def generate_random_password(self, length=12):
        """Generate a random password with letters, digits, and special characters"""
        characters = string.ascii_letters + string.digits + '@#$%&*'
        password = ''.join(random.choice(characters) for i in range(length))
        # Ensure it has at least one uppercase, one lowercase, one digit, one special char
        if (any(c.isupper() for c in password) and 
            any(c.islower() for c in password) and 
            any(c.isdigit() for c in password) and 
            any(c in '@#$%&*' for c in password)):
            return password
        else:
            return self.generate_random_password(length)  # Try again
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        # Generate random password if not provided
        data = request.data.copy()
        generated_password = None
        
        if not data.get('password'):
            generated_password = self.generate_random_password()
            data['password'] = generated_password
        
        serializer = UserRegistrationSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Include generated password in response (only once!)
            response_data = {
                'user': UserSerializer(user).data,
                'message': 'User created successfully'
            }
            
            if generated_password:
                response_data['temporary_password'] = generated_password
                response_data['message'] = f'User created successfully. Temporary password: {generated_password}'
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def complete_profile(self, request):
        """Endpoint for users to complete their profile on first login"""
        user = request.user
        
        # Check if profile is already completed
        if user.profile_completed:
            return Response(
                {'error': 'Profile already completed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ProfileCompletionSerializer(user, data=request.data, partial=False)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profile completed successfully',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """Endpoint for users to update their own profile (email, phone, password)"""
        user = request.user
        
        # Users can only update: email, phone, profile_picture
        allowed_fields = ['email', 'phone', 'profile_picture']
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        # Handle password change separately (requires old password verification)
        if 'old_password' in request.data and 'new_password' in request.data:
            if user.check_password(request.data['old_password']):
                user.set_password(request.data['new_password'])
            else:
                return Response(
                    {'error': 'Old password is incorrect'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Update other fields
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.save()
        return Response({
            'message': 'Profile updated successfully',
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reset_password(self, request, pk=None):
        """Admin can reset a user's password to a new random one"""
        user = self.get_object()
        
        # Generate new random password
        new_password = self.generate_random_password()
        user.set_password(new_password)
        user.profile_completed = False  # Force user to complete profile again
        user.save()
        
        return Response({
            'message': f'Password reset successfully. New temporary password: {new_password}',
            'temporary_password': new_password
        }, status=status.HTTP_200_OK)