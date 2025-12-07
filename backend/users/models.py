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
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='tenant')
    phone = models.CharField(max_length=15, blank=True)
    id_number = models.CharField(max_length=20, blank=True, unique=True, null=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    specialization = models.CharField(max_length=50, choices=SPECIALIZATION_CHOICES, null=True, blank=True)
    profile_completed = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"