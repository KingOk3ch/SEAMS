from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from .models import MaintenanceRequest, MaintenanceImage
from .serializers import MaintenanceRequestSerializer, MaintenanceImageSerializer
from users.models import Notification
from estates.models import Tenant

User = get_user_model()

class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return MaintenanceRequest.objects.none()

        ACTIVE_STATUSES = ['new', 'assigned', 'pending', 'in_progress']

        # 1. Tenants: See their own requests
        if hasattr(user, 'tenant_profile'):
            return MaintenanceRequest.objects.filter(
                reported_by=user
            ).order_by('-created_at')

        # 2. Technicians: See assigned tasks
        if getattr(user, 'role', None) == 'technician':
            return MaintenanceRequest.objects.filter(
                assigned_to=user
            ).order_by('-created_at')

        # 3. Admins: See everything
        return MaintenanceRequest.objects.all().order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError as e:
            return Response({'error': 'Database Error: Required fields missing.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': 'Internal Server Error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        user = self.request.user
        house_to_assign = None

        # Auto-detect house for Tenants
        if hasattr(user, 'tenant_profile'):
            try:
                tenant_profile = Tenant.objects.get(user=user)
                if tenant_profile.house:
                    house_to_assign = tenant_profile.house
            except Tenant.DoesNotExist:
                pass

        if house_to_assign:
            serializer.save(reported_by=user, house=house_to_assign)
        else:
            serializer.save(reported_by=user)

    @action(detail=False, methods=['get'], url_path='completed')
    def completed_requests(self, request):
        user = request.user
        if hasattr(user, 'tenant_profile'):
            requests = MaintenanceRequest.objects.filter(reported_by=user, status='completed').order_by('-completed_at')
        elif user.is_staff or getattr(user, 'role', None) == 'estate_admin':
            requests = MaintenanceRequest.objects.filter(status='completed').order_by('-completed_at')
        else:
            requests = MaintenanceRequest.objects.none()
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='all-requests')
    def all_requests(self, request):
        user = request.user
        if hasattr(user, 'tenant_profile'):
            requests = MaintenanceRequest.objects.filter(reported_by=user).order_by('-created_at')
        elif user.is_staff or getattr(user, 'role', None) == 'estate_admin':
            requests = MaintenanceRequest.objects.all().order_by('-created_at')
        else:
            requests = MaintenanceRequest.objects.none()
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        maintenance = self.get_object()
        technician_id = request.data.get('technician_id')
        
        if not technician_id:
            return Response({'error': 'Technician ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            technician = User.objects.get(id=technician_id, role='technician')
            maintenance.assigned_to = technician
            maintenance.status = 'assigned'
            maintenance.assigned_at = timezone.now()
            maintenance.save()
            
            # --- RESTORED: Detailed Notification Logic ---
            try:
                # 1. Determine House Number (Check real house, then archived)
                house_display = "Unknown House"
                if maintenance.house:
                    house_display = f"House {maintenance.house.house_number}"
                elif hasattr(maintenance, 'archived_house_number') and maintenance.archived_house_number:
                    house_display = f"House {maintenance.archived_house_number}"

                # 2. Determine Category
                category_display = maintenance.category.upper() if maintenance.category else "MAINTENANCE"

                # 3. Build Detailed Messages
                msg_tech = f"New Task Assigned: {category_display} issue at {house_display}"
                msg_tenant = f"Technician Assigned: Your {maintenance.category} request is being handled by {technician.get_full_name()}"

                # 4. Send Notifications
                Notification.objects.create(recipient=technician, message=msg_tech, link="/maintenance")
                Notification.objects.create(recipient=maintenance.reported_by, message=msg_tenant, link="/maintenance")
            except Exception as e:
                # Log error but don't fail the assignment
                print(f"Notification Error: {e}")
                pass
            # ---------------------------------------------

            return Response({'status': 'assigned', 'message': 'Technician assigned successfully'})

        except User.DoesNotExist:
            return Response({'error': 'Technician not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        maintenance = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = dict(MaintenanceRequest.STATUS_CHOICES).keys()
        
        if new_status in valid_statuses:
            maintenance.status = new_status
            if new_status == 'completed':
                maintenance.completed_at = timezone.now()
            maintenance.save()
            return Response({'status': 'updated', 'new_status': new_status})
        return Response({'error': 'Invalid status provided'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def ping(self, request, pk=None):
        maintenance = self.get_object()
        if not maintenance.assigned_to:
            return Response({'error': 'No technician assigned.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            Notification.objects.create(recipient=maintenance.assigned_to, message="URGENT: Admin requesting update", link="/maintenance")
        except:
            pass
        return Response({'message': 'Technician pinged successfully'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = MaintenanceRequest.objects.count()
        pending = MaintenanceRequest.objects.filter(status='pending').count()
        assigned = MaintenanceRequest.objects.filter(status='assigned').count()
        in_progress = MaintenanceRequest.objects.filter(status='in_progress').count()
        completed = MaintenanceRequest.objects.filter(status='completed').count()
        return Response({'total': total, 'pending': pending, 'assigned': assigned, 'in_progress': in_progress, 'completed': completed})

class MaintenanceImageViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceImage.objects.all()
    serializer_class = MaintenanceImageSerializer