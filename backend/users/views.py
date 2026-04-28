from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.apps import apps 
from django.db import transaction 
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone
from .serializers import (
    UserSerializer, 
    UserRegistrationSerializer, 
    ProfileCompletionSerializer,
    TenantRegistrationSerializer,
    UserApprovalSerializer,
    NotificationSerializer
)
from .models import Notification
import secrets 
import string

User = get_user_model()

# Generates a standardized, branded HTML wrapper for all system outgoing emails
def get_seams_html_email(title, first_name, message_lines, highlighted_code=None):
    current_year = timezone.now().year
    
    # Converts list of strings into formatted HTML paragraphs
    paragraphs = "".join([f'<p style="color: #444444; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">{line}</p>' for line in message_lines])
    
    # Renders a high-contrast box for OTPs or Temporary Passwords if provided
    code_block = ""
    if highlighted_code:
        code_block = f"""
        <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; padding: 20px 40px; background-color: #1a1a1a; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 6px;">
                    {highlighted_code}
                </span>
            </div>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9f9f9; padding: 30px 10px;">
            <tr>
                <td align="center">
                    <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
                        <tr>
                            <td align="center" style="padding: 30px 20px; background-color: #ffffff; border-bottom: 2px solid #f0f0f0;">
                                <img src="https://i.imgur.com/J24GItA.png" alt="SEAMS Logo" style="height: 60px; width: auto; display: block;" />
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 25px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">{title}</h2>
                                <p style="color: #333333; font-size: 16px; margin-bottom: 20px;">Hi {first_name},</p>
                                {paragraphs}
                                {code_block}
                                <p style="color: #777777; font-size: 14px; margin-top: 30px; border-top: 1px solid #f0f0f0; padding-top: 20px; font-style: italic;">
                                    This is an automated message from the SEAMS system. Please do not reply directly to this email.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding: 25px; background-color: #1a1a1a; color: #ffffff;">
                                <p style="margin: 0; font-size: 12px; opacity: 0.8;">&copy; {current_year} Smart Estates Administration and Maintenance System.</p>
                                <p style="margin: 5px 0 0 0; font-size: 11px; opacity: 0.6;">Ensuring seamless living through technology.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'register', 'forgot_password']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    # Generates a secure, 12-character random password containing uppercase, lowercase, numbers, and special characters
    def generate_random_password(self, length=12):
        characters = string.ascii_letters + string.digits + '@#$%&*'
        while True:
            password = ''.join(secrets.choice(characters) for i in range(length))
            if (any(c.isupper() for c in password) and 
                any(c.islower() for c in password) and 
                any(c.isdigit() for c in password) and 
                any(c in '@#$%&*' for c in password)):
                return password
    
    # Handles direct registration by the administrator and dispatches an email with a temporary password and verification token
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
            
            if user.role == 'tenant' and user.email_verification_token:
                try:
                    plain_msg = (
                        f"Hello {user.first_name},\n\n"
                        f"An administrator has registered you for SEAMS.\n\n"
                        f"Your Temporary Password is: {generated_password or 'Provided by Admin'}\n"
                        f"Your Email Verification Code is: {user.email_verification_token}\n\n"
                        f"Please enter this code on the registration page to verify your email.\n\n"
                        f"IMPORTANT: For your security, please navigate to your profile settings and change this temporary password immediately upon your first login."
                    )
                    
                    html_msg = get_seams_html_email(
                        title="Welcome to SEAMS",
                        first_name=user.first_name,
                        message_lines=[
                            "An administrator has successfully registered your account on the SEAMS platform.",
                            f"Your Temporary Password is: <b>{generated_password or 'Provided by Admin'}</b>",
                            "Your Email Verification Code is provided below. Please enter this code on the registration page to verify your email.",
                            "<b>IMPORTANT:</b> For your security, please navigate to your profile settings and change this temporary password immediately upon your first login."
                        ],
                        highlighted_code=user.email_verification_token
                    )

                    send_mail(
                        subject='Verify Your Email & Temporary Password - SEAMS',
                        message=plain_msg,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=False,
                        html_message=html_msg
                    )
                except Exception as e:
                    print(f"Failed to send email to tenant: {e}")
            
            response_data = {
                'user': UserSerializer(user).data,
                'message': 'User created successfully'
            }
            
            if generated_password:
                response_data['temporary_password'] = generated_password
                response_data['message'] = f'User created successfully. Temporary password: {generated_password}'
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Processes the initial mandatory profile completion step when a user logs in for the first time
    @action(detail=False, methods=['post'], url_path='complete_profile')
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
    
    # Allows authenticated users to update their profile information and change their password
    @action(detail=False, methods=['patch'], url_path='update_profile')
    def update_profile(self, request):
        user = request.user
        password_changed = False
        
        allowed_fields = [
            'username', 'email', 'phone', 'specialization', 'profile_picture'
        ]
        
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        if 'username' in update_data and update_data['username'] != user.username:
            if User.objects.filter(username=update_data['username']).exists():
                return Response(
                    {'username': ['This username is already taken.']}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        if 'old_password' in request.data and 'new_password' in request.data:
            if user.check_password(request.data['old_password']):
                user.set_password(request.data['new_password'])
                password_changed = True
            else:
                return Response(
                    {'error': 'Old password is incorrect'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        if 'profile_picture' in request.FILES:
            user.profile_picture = request.FILES['profile_picture']

        try:
            user.save()
            
            if password_changed:
                try:
                    plain_msg = f'Hello {user.first_name},\n\nYour password has been successfully updated.\n\nIf you did not make this change, please contact the administrator immediately.'
                    html_msg = get_seams_html_email(
                        title="Password Changed Successfully",
                        first_name=user.first_name,
                        message_lines=[
                            "This is a confirmation that your password has been successfully updated.",
                            "If you did not make this change, please contact the estate administrator immediately to secure your account."
                        ]
                    )

                    send_mail(
                        subject='SEAMS - Password Changed Successfully',
                        message=plain_msg,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=False,
                        html_message=html_msg
                    )
                except Exception as e:
                    print(f"Failed to send password success email: {e}")

            return Response({
                'message': 'Profile updated successfully',
                'user': UserSerializer(user).data,
                'password_changed': password_changed
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    # Retrieves the currently authenticated user's data
    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    # Admin utility to force a password reset on a specific user's account
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='reset_password')
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

    # Public endpoint to trigger a password reset email if the user forgets their credentials
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='forgot_password')
    def forgot_password(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response({'error': 'Please provide an email address.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({'error': 'No account found with this email address.'}, status=status.HTTP_404_NOT_FOUND)
            
        new_password = self.generate_random_password()
        user.set_password(new_password)
        user.profile_completed = False
        user.save()
        
        try:
            plain_msg = f'Hello {user.first_name},\n\nYour password has been successfully reset.\n\nYour new Temporary Password is: {new_password}\n\nPlease log in using this temporary password, then navigate directly to your Profile Settings to change it. For security, you will be required to log back in once your password is updated.'
            html_msg = get_seams_html_email(
                title="Password Reset Request",
                first_name=user.first_name,
                message_lines=[
                    "Your password has been successfully reset.",
                    "Your new Temporary Password is provided below. Please log in using this password, then navigate directly to your Profile Settings to change it for your security."
                ],
                highlighted_code=new_password
            )

            send_mail(
                subject='SEAMS - Password Reset Request',
                message=plain_msg,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
                html_message=html_msg
            )
            return Response({'message': 'A temporary password has been sent to your email address.'}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Failed to send reset email: {e}")
            return Response({'error': 'Failed to send reset email. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Returns a list of users whose registration is awaiting administrative review
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser], url_path='pending_approvals')
    def pending_approvals(self, request):
        pending_users = User.objects.filter(approval_status='pending').order_by('-registration_date')
        serializer = UserSerializer(pending_users, many=True)
        return Response({
            'count': pending_users.count(),
            'results': serializer.data
        })
    
    # Approves a pending tenant, assigns them to a vacant house, and generates their lease contract
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        user = self.get_object()
        
        if user.approval_status != 'pending':
            return Response({'error': 'User is not pending approval'}, status=400)
        
        House = apps.get_model('estates', 'House')
        Tenant = apps.get_model('estates', 'Tenant')
        Contract = apps.get_model('estates', 'Contract') 
        
        house_id = request.data.get('house_id')
        if not house_id:
            return Response({'error': 'You must assign a house to approve this tenant.'}, status=400)
        
        try:
            house = House.objects.get(id=house_id)
            if house.status != 'vacant':
                 return Response({'error': 'Selected house is not vacant.'}, status=400)
        except House.DoesNotExist:
             return Response({'error': 'House not found.'}, status=404)

        serializer = UserApprovalSerializer(
            user, 
            data={'approval_status': 'approved'}, 
            context={'request': request}, 
            partial=True
        )
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    user = serializer.save()
                    
                    move_in = request.data.get('move_in_date')
                    start_date = request.data.get('contract_start')
                    end_date = request.data.get('contract_end')
                    
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
                        tenant.house = house
                        tenant.move_in_date = move_in
                        tenant.contract_start = start_date
                        tenant.contract_end = end_date
                        tenant.status = 'active'
                        tenant.save()

                    house.status = 'occupied'
                    house.save()
                    
                    # --- THE OFFICIAL SEAMS LEASE TERMS ---
                    lease_terms = (
                        "1. Rent Payment: Rent is due on or before the 5th of every month.\n"
                        "2. Security Deposit: Refundable upon vacating, minus cost of repairs/unpaid bills.\n"
                        "3. Utilities: Tenant pays for electricity (Token) and Water bill.\n"
                        "4. Maintenance: Tenant keeps interior clean; Landlord handles structural repairs.\n"
                        "5. Notice: One month written notice required before vacating.\n"
                        "6. Conduct: No noise pollution or illegal activities allowed."
                    )
                    
                    Contract.objects.get_or_create(
                        tenant=tenant,
                        house=house,
                        start_date=start_date,
                        end_date=end_date,
                        defaults={
                            'monthly_rent': house.rent_amount,
                            'deposit_paid': house.rent_amount * 2, 
                            'is_accepted': False,
                            'terms': lease_terms
                        }
                    )
            except Exception as e:
                return Response({'error': f'Failed to complete approval: {str(e)}'}, status=400)

            try:
                if user.is_active:
                    plain_msg = f'Hello {user.first_name},\n\nYour account is approved! You are assigned to House {house.house_number}.\nYou can now log in.'
                    lines = [
                        "Great news! Your account has been officially approved by the estate administrator.",
                        f"You have been successfully assigned to <strong>House {house.house_number}</strong>.",
                        "You can now log in and access your personalized tenant dashboard."
                    ]
                else:
                    plain_msg = f'Hello {user.first_name},\n\nYour account is approved and you are assigned to House {house.house_number}!\n\nPlease verify your email to log in.'
                    lines = [
                        "Great news! Your account has been officially approved by the estate administrator.",
                        f"You have been successfully assigned to <strong>House {house.house_number}</strong>.",
                        "Please verify your email using the verification code you received to log in to your tenant dashboard."
                    ]
                    
                html_msg = get_seams_html_email(
                    title="Account Approved & House Assigned",
                    first_name=user.first_name,
                    message_lines=lines
                )

                send_mail(
                    subject='SEAMS Account Approved & House Assigned',
                    message=plain_msg,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                    html_message=html_msg
                )
            except Exception as e:
                print(f"Failed to send approval email: {e}")
            
            return Response({
                'message': f'User approved and assigned to House {house.house_number}',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Rejects a pending tenant application, sends an explanation email, and deletes their pending profile
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        user = self.get_object()
        
        if user.approval_status != 'pending':
            return Response(
                {'error': 'User is not pending approval'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('rejection_reason', 'No reason provided')
        first_name = user.first_name
        email = user.email
        
        try:
            plain_msg = f'Hello {first_name},\n\nYour account registration was not approved.\nReason: {rejection_reason}'
            html_msg = get_seams_html_email(
                title="Account Registration Update",
                first_name=first_name,
                message_lines=[
                    "We regret to inform you that your account registration was not approved at this time.",
                    f"<strong>Reason:</strong> {rejection_reason}",
                    "If you have any questions or require further clarification, please contact the estate administration."
                ]
            )

            send_mail(
                subject='SEAMS Account Registration Update',
                message=plain_msg,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
                html_message=html_msg
            )
        except Exception as e:
            print(f"Failed to send rejection email: {e}")
        
        user.delete()
        
        return Response({
            'message': 'User rejected.',
        }, status=status.HTTP_200_OK)

# Public endpoint handling self-registration for new tenants
@api_view(['POST'])
@permission_classes([AllowAny])
def tenant_register(request):
    serializer = TenantRegistrationSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()
        code = user.email_verification_token

        print(f"Sending verification code {code} to {user.email}...")
        try:
            plain_msg = f'Hello {user.first_name},\n\nThank you for registering with SEAMS.\n\nYour Email Verification Code is: {code}\n\nPlease enter this code to verify your account.\n\nIf you did not request this, please ignore this email.'
            html_msg = get_seams_html_email(
                title="Verify Your Email",
                first_name=user.first_name,
                message_lines=[
                    "Thank you for registering with SEAMS. We are thrilled to have you on board!",
                    "To complete your registration and verify your email address, please use the following 6-digit verification code:"
                ],
                highlighted_code=code
            )

            result = send_mail(
                subject='Verify Your Email - SEAMS',
                message=plain_msg,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
                html_message=html_msg
            )
            print(f"Email sent successfully (result: {result}) to {user.email}")

        except Exception as e:
            print(f"Failed to send email to {user.email}: {e}")
            # Don't fail the registration if email fails, but log it
            # You might want to implement a retry mechanism or queue system here

        return Response({
            'message': 'Registration successful! Verification code sent to email.',
            'user_id': user.id,
            'email': user.email,
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Validates the 6-digit code sent to the user's email during registration
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    email = request.data.get('email')
    code = request.data.get('code')
    
    if not email or not code:
        return Response({'error': 'Email and Code are required'}, status=400)

    try:
        user = User.objects.get(email=email, email_verification_token=code)
        
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
            'error': 'Invalid verification code or email'
        }, status=status.HTTP_400_BAD_REQUEST)

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})
        
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all marked as read'})

# Overrides the default SimpleJWT login view to inject custom onboarding authentication status checks
# Evaluates precise missing criteria (unverified email vs. unapproved admin status) to deliver targeted HTTP 403 error messages
class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = User.objects.filter(username=username).first()
        if not user:
            user = User.objects.filter(email=username).first()
            
        if user and user.check_password(password):
                
            # --- LEGACY BYPASS ---
            # Only forces email verification if the user actually has a pending verification token
            # This safely allows preexisting admins and legacy tenants to log in
            if not getattr(user, 'email_verified', False) and getattr(user, 'email_verification_token', None):
                return Response({"error": "Please verify your email before logging in."}, status=status.HTTP_403_FORBIDDEN)
                
            # Evaluates the specific admin approval status before proceeding to token generation
            # Preexisting Admins naturally bypass this since their status is not 'pending' or 'rejected'
            if getattr(user, 'approval_status', '') == 'pending':
                return Response({"error": "Your account is verified but currently pending Admin approval."}, status=status.HTTP_403_FORBIDDEN)
            
            if getattr(user, 'approval_status', '') == 'rejected':
                return Response({"error": "Your account registration was rejected by the Admin."}, status=status.HTTP_403_FORBIDDEN)
                
        return super().post(request, *args, **kwargs)