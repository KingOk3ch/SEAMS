from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('estate_admin', 'Estate Admin'),
        ('technician', 'Technician'),
        ('tenant', 'Tenant'),
        ('manager', 'Manager'),
    ]
    
    SPECIALIZATION_CHOICES = [
        ('plumbing', 'Plumbing'),
        ('electrical', 'Electrical'),
        ('structural', 'Structural'),
        ('pest_control', 'Pest Control'),
        ('general', 'General Maintenance'),
    ]
    
    APPROVAL_STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('pending', 'Pending Approval'),
        ('rejected', 'Rejected'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='tenant')
    phone = models.CharField(max_length=15, blank=True)
    id_number = models.CharField(max_length=20, blank=True, unique=True, null=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    specialization = models.CharField(max_length=50, choices=SPECIALIZATION_CHOICES, null=True, blank=True)
    profile_completed = models.BooleanField(default=False)
    
    # New fields for tenant self-registration
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='approved')
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, blank=True, null=True)
    house_number = models.CharField(max_length=20, blank=True, null=True)  # For tenant registration
    registration_date = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_users')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"