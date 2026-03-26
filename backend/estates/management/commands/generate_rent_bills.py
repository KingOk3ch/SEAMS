from django.core.management.base import BaseCommand
from django.utils import timezone
from estates.models import Tenant, Bill

class Command(BaseCommand):
    help = 'Automatically generates monthly rent bills for all active tenants'

    def handle(self, *args, **kwargs):
        today = timezone.now()
        
        # Lock the date to the 1st of the current month for clean accounting
        month_for_date = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_name = today.strftime('%B %Y')

        # Find only active tenants who actually have a house assigned
        active_tenants = Tenant.objects.filter(status='active', house__isnull=False)
        
        created_count = 0
        skipped_count = 0

        self.stdout.write(self.style.NOTICE(f'Starting rent generation for {month_name}...'))

        for tenant in active_tenants:
            # --- THE SAFETY CHECK (Idempotency) ---
            # Check if a rent bill for this specific month and year already exists
            bill_exists = Bill.objects.filter(
                tenant=tenant,
                bill_type='rent',
                month_for__month=today.month,
                month_for__year=today.year
            ).exists()

            if not bill_exists:
                # Generate the new bill and explicitly pass the archived_tenant_name to satisfy the DB constraint
                Bill.objects.create(
                    tenant=tenant,
                    bill_type='rent',
                    amount=tenant.house.rent_amount,
                    month_for=month_for_date,
                    description=f"Monthly rent for {month_name}",
                    archived_tenant_name=f"{tenant.user.first_name} {tenant.user.last_name}" # <-- FIX ADDED HERE
                )
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f' [+] Created KES {tenant.house.rent_amount} bill for {tenant.user.first_name} {tenant.user.last_name}'))
            else:
                skipped_count += 1
                self.stdout.write(self.style.WARNING(f' [-] Skipped {tenant.user.first_name} {tenant.user.last_name} (Bill already exists)'))

        self.stdout.write(self.style.SUCCESS(f'\nDone! Successfully generated {created_count} bills. Skipped {skipped_count} existing bills.'))