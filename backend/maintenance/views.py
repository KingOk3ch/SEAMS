from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import MaintenanceRequest, MaintenanceImage
from .serializers import MaintenanceRequestSerializer, MaintenanceImageSerializer

class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.all()
    serializer_class = MaintenanceRequestSerializer
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        maintenance = self.get_object()
        technician_id = request.data.get('technician_id')
        
        if technician_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                technician = User.objects.get(id=technician_id, role='technician')
                maintenance.assigned_to = technician
                maintenance.status = 'assigned'
                maintenance.assigned_at = timezone.now()
                maintenance.save()
                return Response({'status': 'assigned', 'message': 'Technician assigned successfully'})
            except User.DoesNotExist:
                return Response({'error': 'Technician not found'}, status=400)
        return Response({'error': 'Technician ID required'}, status=400)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        maintenance = self.get_object()
        new_status = request.data.get('status')
        
        if new_status in dict(MaintenanceRequest.STATUS_CHOICES):
            maintenance.status = new_status
            if new_status == 'completed':
                maintenance.completed_at = timezone.now()
            maintenance.save()
            return Response({'status': 'updated', 'new_status': new_status})
        return Response({'error': 'Invalid status'}, status=400)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
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
    queryset = MaintenanceImage.objects.all()
    serializer_class = MaintenanceImageSerializer