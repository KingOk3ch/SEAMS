from django.core.management.base import BaseCommand
from estates.models import House, Tenant

class Command(BaseCommand):
    help = 'Synchronizes house statuses based on current tenant assignments'

    def handle(self, *args, **kwargs):
        updated_count = 0
        
        all_houses = House.objects.all()
        
        for house in all_houses:
            has_tenant = Tenant.objects.filter(house=house, status='active').exists()
            
            if has_tenant and house.status == 'vacant':
                house.status = 'occupied'
                house.save()
                updated_count += 1
                self.stdout.write(f"Updated {house.house_number} to occupied")
            
            elif not has_tenant and house.status == 'occupied':
                house.status = 'vacant'
                house.save()
                updated_count += 1
                self.stdout.write(f"Updated {house.house_number} to vacant")
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully synchronized {updated_count} houses')
        )