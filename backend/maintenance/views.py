from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import MaintenanceRequest, MaintenanceImage
from .serializers import MaintenanceRequestSerializer, MaintenanceImageSerializer
from users.models import Notification

User = get_user_model()

class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing maintenance requests.
    """
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Returns maintenance requests based on user role.
        """
        user = self.request.user
        
        # Security: Unauthenticated users see nothing
        if not user.is_authenticated:
            print("❌ User not authenticated")
            return MaintenanceRequest.objects.none()

        # Define active statuses (what tenants should see)
        ACTIVE_STATUSES = ['new', 'assigned', 'pending', 'in_progress']

        # 1. TENANTS: Return their active requests (NOT completed/cancelled)
        if getattr(user, 'role', None) == 'tenant':
            print(f"\n{'='*60}")
            print(f"🔍 TENANT QUERY DEBUG")
            print(f"{'='*60}")
            print(f"User ID: {user.id}")
            print(f"User Email: {user.email}")
            print(f"Looking for statuses: {ACTIVE_STATUSES}")
            
            # Get ALL requests for this tenant (ignore status)
            all_user_requests = MaintenanceRequest.objects.filter(reported_by=user)
            print(f"\n📋 ALL REQUESTS FOR THIS USER ({all_user_requests.count()} total):")
            for req in all_user_requests:
                print(f"  - {req.request_id}: status='{req.status}' | in filter? {req.status in ACTIVE_STATUSES}")
            
            # Now apply the filter
            queryset = MaintenanceRequest.objects.filter(
                reported_by=user,
                status__in=ACTIVE_STATUSES  # ✅ KEY FIX: Show all active statuses
            ).order_by('-created_at')
            
            print(f"\n✅ FILTERED RESULTS: {queryset.count()} requests")
            for req in queryset:
                print(f"  - {req.request_id}: {req.status}")
            print(f"{'='*60}\n")
            
            return queryset

        # 2. TECHNICIANS: Return requests assigned to them (all statuses)
        if getattr(user, 'role', None) == 'technician':
            return MaintenanceRequest.objects.filter(
                assigned_to=user
            ).order_by('-created_at')

        # 3. ADMINS: Return everything
        return MaintenanceRequest.objects.all().order_by('-created_at')
    
    @action(detail=False, methods=['get'], url_path='completed')
    def completed_requests(self, request):
        """
        ✅ NEW ENDPOINT: Get completed maintenance requests for tenants.
        Accessible at: /api/maintenance/completed/
        """
        user = request.user
        
        if getattr(user, 'role', None) == 'tenant':
            # Tenant: Their completed requests
            requests = MaintenanceRequest.objects.filter(
                reported_by=user,
                status='completed'
            ).order_by('-completed_at')
        elif user.is_staff or user.is_superuser or getattr(user, 'role', None) == 'admin':
            # Admin: All completed requests
            requests = MaintenanceRequest.objects.filter(
                status='completed'
            ).order_by('-completed_at')
        else:
            requests = MaintenanceRequest.objects.none()
        
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='all-requests')
    def all_requests(self, request):
        """
        ✅ NEW ENDPOINT: Get ALL maintenance requests (including completed) for tenants.
        Accessible at: /api/maintenance/all-requests/
        Useful for the "All" tab in the frontend.
        """
        user = request.user
        
        if getattr(user, 'role', None) == 'tenant':
            requests = MaintenanceRequest.objects.filter(
                reported_by=user
            ).order_by('-created_at')
        elif user.is_staff or user.is_superuser or getattr(user, 'role', None) == 'admin':
            requests = MaintenanceRequest.objects.all().order_by('-created_at')
        else:
            requests = MaintenanceRequest.objects.none()
        
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """
        Assign a technician to a maintenance request.
        """
        maintenance = self.get_object()
        technician_id = request.data.get('technician_id')
        
        if not technician_id:
            return Response({'error': 'Technician ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Ensure the user exists and is actually a technician
            technician = User.objects.get(id=technician_id, role='technician')
            
            # Validation: Check if technician specialization matches the request category
            if technician.specialization and technician.specialization != maintenance.category:
                return Response({
                    'error': f'Technician specialization ({technician.specialization}) does not match request category ({maintenance.category})'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Update the Request
            maintenance.assigned_to = technician
            maintenance.status = 'assigned'
            maintenance.assigned_at = timezone.now()
            maintenance.save()
            
            # Notify Technician
            # We use try/except block for notifications to prevent crashing if one fails
            try:
                Notification.objects.create(
                    recipient=technician,
                    message=f"New Task Assigned: {maintenance.category.upper()} issue at House {maintenance.house.house_number}",
                    link="/maintenance"
                )
                
                # Notify Tenant
                Notification.objects.create(
                    recipient=maintenance.reported_by,
                    message=f"Technician {technician.first_name} {technician.last_name} has been assigned to your request.",
                    link="/maintenance"
                )
            except Exception as e:
                print(f"Notification error: {e}")

            return Response({
                'status': 'assigned', 
                'message': 'Technician assigned successfully',
                'assigned_to': f"{technician.first_name} {technician.last_name}"
            })

        except User.DoesNotExist:
            return Response({'error': 'Technician not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """
        Update the status of a request (e.g., to 'in_progress' or 'completed').
        """
        maintenance = self.get_object()
        new_status = request.data.get('status')
        
        valid_statuses = dict(MaintenanceRequest.STATUS_CHOICES).keys()
        
        if new_status in valid_statuses:
            old_status = maintenance.status
            maintenance.status = new_status
            
            # If marking as completed, set the timestamp
            if new_status == 'completed':
                maintenance.completed_at = timezone.now()
            
            maintenance.save()
            
            # Notify Tenant if the task is completed
            if new_status == 'completed' and old_status != 'completed':
                try:
                    Notification.objects.create(
                        recipient=maintenance.reported_by,
                        message=f"Your maintenance request for {maintenance.category} has been marked as COMPLETED.",
                        link="/maintenance"
                    )
                except Exception as e:
                    print(f"Notification error: {e}")
                
            return Response({'status': 'updated', 'new_status': new_status})
            
        return Response({'error': 'Invalid status provided'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def ping(self, request, pk=None):
        """
        Admin pings the assigned technician for an urgent update.
        """
        maintenance = self.get_object()
        
        if not maintenance.assigned_to:
            return Response({'error': 'No technician is currently assigned to this request.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            Notification.objects.create(
                recipient=maintenance.assigned_to,
                message=f"URGENT: Admin is requesting an update on {maintenance.category} task at {maintenance.house.house_number}.",
                link="/maintenance"
            )
        except Exception as e:
            print(f"Notification error: {e}")
        
        return Response({'message': 'Technician pinged successfully'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Return counts of requests by status for the dashboard.
        """
        # Global stats (default)
        total = MaintenanceRequest.objects.count()
        pending = MaintenanceRequest.objects.filter(status='pending').count()
        assigned = MaintenanceRequest.objects.filter(status='assigned').count()
        in_progress = MaintenanceRequest.objects.filter(status='in_progress').count()
        completed = MaintenanceRequest.objects.filter(status='completed').count()
        
        return Response({
            'total': total,
            'pending': pending,
            'assigned': assigned,
            'in_progress': in_progress,
            'completed': completed
        })


class MaintenanceImageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling image uploads associated with maintenance requests.
    """
    queryset = MaintenanceImage.objects.all()
    serializer_class = MaintenanceImageSerializer