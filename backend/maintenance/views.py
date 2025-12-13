from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import MaintenanceRequest, MaintenanceImage
from .serializers import MaintenanceRequestSerializer, MaintenanceImageSerializer

# Crucial Import: Notification model
from users.models import Notification

User = get_user_model()

class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing maintenance requests.
    Includes custom actions for assigning technicians, updating status, and pinging.
    """
    queryset = MaintenanceRequest.objects.all()
    serializer_class = MaintenanceRequestSerializer
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """
        Assign a technician to a maintenance request.
        Validates specialization and sends notifications.
        """
        maintenance = self.get_object()
        technician_id = request.data.get('technician_id')
        
        if not technician_id:
            return Response({'error': 'Technician ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Ensure the user exists and is actually a technician
            technician = User.objects.get(id=technician_id, role='technician')
            
            # 1. Validation: Check if technician specialization matches the request category
            if technician.specialization and technician.specialization != maintenance.category:
                return Response({
                    'error': f'Technician specialization ({technician.specialization}) does not match request category ({maintenance.category})'
                }, status=status.HTTP_400_BAD_REQUEST)

            # 2. Update the Request
            maintenance.assigned_to = technician
            maintenance.status = 'assigned'
            maintenance.assigned_at = timezone.now()
            maintenance.save()
            
            # 3. Notify Technician
            # FIX: Use maintenance.house.house_number instead of maintenance.house_number
            Notification.objects.create(
                recipient=technician,
                message=f"New Task Assigned: {maintenance.category.upper()} issue at House {maintenance.house.house_number}",
                link="/maintenance"
            )
            
            # 4. Notify Tenant
            Notification.objects.create(
                recipient=maintenance.reported_by,
                message=f"Technician {technician.first_name} {technician.last_name} has been assigned to your request.",
                link="/maintenance"
            )

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
        Sets timestamps and notifies the tenant on completion.
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
                Notification.objects.create(
                    recipient=maintenance.reported_by,
                    message=f"Your maintenance request for {maintenance.category} has been marked as COMPLETED.",
                    link="/maintenance"
                )
                
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
            
        # Create URGENT Notification for Technician
        # FIX: Use maintenance.house.house_number instead of maintenance.house_number
        Notification.objects.create(
            recipient=maintenance.assigned_to,
            message=f"URGENT: Admin is requesting an update on {maintenance.category} task at {maintenance.house.house_number}.",
            link="/maintenance"
        )
        
        return Response({'message': 'Technician pinged successfully'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Return counts of requests by status for the dashboard.
        """
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