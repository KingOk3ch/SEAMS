from django.db import models
from django.conf import settings
from estates.models import House

class MaintenanceRequest(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    CATEGORY_CHOICES = [
        ('plumbing', 'Plumbing'),
        ('electrical', 'Electrical'),
        ('structural', 'Structural'),
        ('pest_control', 'Pest Control'),
        ('general', 'General'),
    ]
    
    request_id = models.CharField(max_length=20, unique=True, editable=False)
    
    # FIXED: Protect history if House is deleted
    house = models.ForeignKey(House, on_delete=models.SET_NULL, null=True, blank=True, related_name='maintenance_requests')
    archived_house_number = models.CharField(max_length=50, blank=True, help_text="Preserves house number if house is deleted")
    
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reported_issues')
    archived_reported_by = models.CharField(max_length=150, blank=True, help_text="Preserves user name if user is deleted")

    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    
    issue_description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    
    created_at = models.DateTimeField(auto_now_add=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    class Meta:
        db_table = 'maintenance_requests'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if self.status:
            self.status = self.status.lower().strip()

        if self.reported_by and not self.archived_reported_by:
            self.archived_reported_by = self.reported_by.get_full_name()
            
        # Snapshot House
        if self.house:
            self.archived_house_number = self.house.house_number

        if not self.request_id:
            last_request = MaintenanceRequest.objects.all().order_by('id').last()
            if last_request:
                try:
                    last_id = int(last_request.request_id.split('-')[1])
                    self.request_id = f'MR-{str(last_id + 1).zfill(3)}'
                except (IndexError, ValueError):
                    self.request_id = f'MR-{str(last_request.id + 1).zfill(3)}'
            else:
                self.request_id = 'MR-001'
                
        super().save(*args, **kwargs)
    
    def __str__(self):
        h_num = self.house.house_number if self.house else self.archived_house_number
        return f"{self.request_id} - {h_num} - {self.get_status_display()}"


class MaintenanceImage(models.Model):
    maintenance_request = models.ForeignKey(MaintenanceRequest, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='maintenance/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'maintenance_images'
    
    def __str__(self):
        return f"Image for {self.maintenance_request.request_id}"