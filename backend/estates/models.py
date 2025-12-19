from django.db import models
from django.conf import settings

class House(models.Model):
    STATUS_CHOICES = [
        ('vacant', 'Vacant'),
        ('occupied', 'Occupied'),
        ('under_repair', 'Under Repair'),
        ('reserved', 'Reserved'),
    ]
    
    TYPE_CHOICES = [
        ('1_bedroom', '1 Bedroom'),
        ('2_bedroom', '2 Bedroom'),
        ('3_bedroom', '3 Bedroom'),
        ('4_bedroom', '4 Bedroom'),
        ('bedsitter', 'Bedsitter'),
    ]
    
    house_number = models.CharField(max_length=10, unique=True)
    house_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='vacant')
    location = models.CharField(max_length=100, blank=True)
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    bedrooms = models.IntegerField(default=1)
    bathrooms = models.IntegerField(default=1)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'houses'
        ordering = ['house_number']
    
    def __str__(self):
        return f"House {self.house_number} - {self.get_house_type_display()}"


class Tenant(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expiring', 'Expiring Soon'),
        ('inactive', 'Inactive'),
    ]
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tenant_profile')
    house = models.ForeignKey(House, on_delete=models.SET_NULL, null=True, blank=True, related_name='tenants')
    move_in_date = models.DateField()
    contract_start = models.DateField()
    contract_end = models.DateField()
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone = models.CharField(max_length=15, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenants'
        ordering = ['-move_in_date']
    
    def __str__(self):
        return f"{self.user.get_full_name()} - House {self.house.house_number if self.house else 'No House'}"


class Contract(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='contracts')
    house = models.ForeignKey(House, on_delete=models.CASCADE, related_name='contracts')
    start_date = models.DateField()
    end_date = models.DateField()
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2)
    deposit_paid = models.DecimalField(max_digits=10, decimal_places=2)
    contract_document = models.FileField(upload_to='contracts/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'contracts'
        ordering = ['-start_date']
    
    def __str__(self):
        return f"Contract: {self.tenant.user.get_full_name()} - {self.house.house_number}"


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('mpesa', 'M-Pesa'),
        ('bank', 'Bank Transfer'),
        ('cash', 'Cash'),
        ('cheque', 'Cheque'),
    ]

    PAYMENT_TYPE_CHOICES = [
        ('rent', 'Rent'),
        ('water', 'Water Bill'),
        ('electricity', 'Electricity Bill'),
        ('garbage', 'Garbage Fee'),
        ('damage', 'Damage Repair'),
        ('deposit', 'Security Deposit'),
        ('other', 'Other'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default='rent')
    reference_number = models.CharField(max_length=50, blank=True)
    month_for = models.DateField(help_text="Month this payment covers")
    
    # SECURITY FLAG: Ensures fake payments don't count until Admin approves
    is_verified = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date']
    
    def __str__(self):
        status = "Verified" if self.is_verified else "Pending"
        return f"{self.get_payment_type_display()}: {self.tenant.user.get_full_name()} - {status}"