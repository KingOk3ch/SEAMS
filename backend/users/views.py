from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.apps import apps 
from .serializers import (
    UserSerializer, 
    UserRegistrationSerializer, 
    ProfileCompletionSerializer,
    TenantRegistrationSerializer,
    UserApprovalSerializer
)
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
        characters = string.ascii_letters + string.digits + '@#$%&*'
        password = ''.join(random.choice(characters) for i in range(length))
        if (any(c.isupper() for c in password) and 
            any(c.islower() for c in password) and 
            any(c.isdigit() for c in password) and 
            any(c in '@#$%&*' for c in password)):
            return password
        else:
            return self.generate_random_password(length)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        data = request.data.copy()
        generated_password = None
        
        if not data.get('password'):
            generated_password = self.generate_random_password()
            data['password'] = generated_password
        
        serializer = UserRegistrationSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            
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
        user = request.user
        
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
        user = request.user
        
        allowed_fields = ['email', 'phone', 'profile_picture']
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        if 'old_password' in request.data and 'new_password' in request.data:
            if user.check_password(request.data['old_password']):
                user.set_password(request.data['new_password'])
            else:
                return Response(
                    {'error': 'Old password is incorrect'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.save()
        return Response({
            'message': 'Profile updated successfully',
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        
        new_password = self.generate_random_password()
        user.set_password(new_password)
        user.profile_completed = False
        user.save()
        
        return Response({
            'message': f'Password reset successfully. New temporary password: {new_password}',
            'temporary_password': new_password
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def pending_approvals(self, request):
        pending_users = User.objects.filter(approval_status='pending').order_by('-registration_date')
        serializer = UserSerializer(pending_users, many=True)
        return Response({
            'count': pending_users.count(),
            'results': serializer.data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        user = self.get_object()
        
        if user.approval_status != 'pending':
            return Response({'error': 'User is not pending approval'}, status=400)
        
        # 1. Validate House Selection
        house_id = request.data.get('house_id')
        if not house_id:
            return Response({'error': 'You must assign a house to approve a tenant.'}, status=400)
        
        House = apps.get_model('estates', 'House')
        Tenant = apps.get_model('estates', 'Tenant')
        
        try:
            house = House.objects.get(id=house_id)
            if house.status != 'vacant':
                 return Response({'error': 'Selected house is not vacant.'}, status=400)
        except House.DoesNotExist:
             return Response({'error': 'House not found.'}, status=404)

        # 2. Update User Status
        serializer = UserApprovalSerializer(
            user, 
            data={'approval_status': 'approved'}, 
            context={'request': request}, 
            partial=True
        )
        
        if serializer.is_valid():
            user = serializer.save()
            
            # 3. Create Tenant Profile & Assign House
            try:
                move_in = request.data.get('move_in_date')
                start_date = request.data.get('contract_start')
                end_date = request.data.get('contract_end')
                
                # Check if tenant profile already exists (rare but safe to check)
                tenant, created = Tenant.objects.get_or_create(
                    user=user,
                    defaults={
                        'house': house,
                        'move_in_date': move_in,
                        'contract_start': start_date,
                        'contract_end': end_date,
                        'status': 'active'
                    }
                )
                
                if not created:
                    # Update existing profile
                    tenant.house = house
                    tenant.move_in_date = move_in
                    tenant.contract_start = start_date
                    tenant.contract_end = end_date
                    tenant.status = 'active'
                    tenant.save()

                # 4. Update House Status
                house.status = 'occupied'
                house.save()
                
            except Exception as e:
                # If tenant creation fails, revert user approval (simple rollback)
                user.approval_status = 'pending'
                user.save()
                return Response({'error': f'Failed to create tenant profile: {str(e)}'}, status=400)

            # 5. Send Email
            try:
                if user.is_active:
                    email_msg = f'Hello {user.first_name},\n\nYour account is approved! You have been assigned House {house.house_number}.\nYou can now log in.'
                else:
                    email_msg = f'Hello {user.first_name},\n\nYour account is approved and you have been assigned House {house.house_number}!\n\nPlease verify your email to log in.'

                send_mail(
                    subject='SEAMS Account Approved & House Assigned',
                    message=email_msg,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Failed to send approval email: {e}")
            
            return Response({
                'message': f'User approved and assigned to House {house.house_number}',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        user = self.get_object()
        
        if user.approval_status != 'pending':
            return Response(
                {'error': 'User is not pending approval'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('rejection_reason', 'No reason provided')
        
        serializer = UserApprovalSerializer(
            user, 
            data={
                'approval_status': 'rejected', 
                'rejection_reason': rejection_reason
            }, 
            context={'request': request}, 
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            
            try:
                send_mail(
                    subject='SEAMS Account Registration Update',
                    message=f'Hello {user.first_name},\n\nYour account registration was not approved.\nReason: {rejection_reason}',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Failed to send rejection email: {e}")
            
            return Response({
                'message': 'User rejected',
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def tenant_register(request):
    serializer = TenantRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        verification_link = f"{frontend_url}/verify-email/{user.email_verification_token}"
        
        print(f"Sending verification email to {user.email} from {settings.DEFAULT_FROM_EMAIL}...")
        send_mail(
            subject='Verify Your Email - SEAMS',
            message=f'Hello {user.first_name},\n\nThank you for registering with SEAMS.\n\nPlease click the link below to verify your email address:\n{verification_link}\n\nIf you did not request this, please ignore this email.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False, 
        )
        print("Email sent successfully.")
        
        return Response({
            'message': 'Registration successful! Please check your email to verify your account. Admin will review your registration.',
            'user_id': user.id,
            'email': user.email,
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email(request, token):
    try:
        user = User.objects.get(email_verification_token=token)
        user.email_verified = True
        user.email_verification_token = None
        
        if user.approval_status == 'approved':
            user.is_active = True
            
        user.save()
        
        return Response({
            'message': 'Email verified successfully! You can now log in if your account has been approved by the admin.'
        }, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({
            'error': 'Invalid verification token'
        }, status=status.HTTP_400_BAD_REQUEST)