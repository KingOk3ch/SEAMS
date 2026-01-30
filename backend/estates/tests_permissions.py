from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from estates.models import House, Bill
from rest_framework import status

User = get_user_model()

class SecurityPermissionTests(APITestCase):

    def setUp(self):
        # 1. Create an Admin
        self.admin_user = User.objects.create_user(
            username='adminUser', email='admin@test.com', password='password123',
            role='estate_admin', phone='0712345678'
        )

        # 2. Create a Tenant
        self.tenant_user = User.objects.create_user(
            username='tenantUser', email='tenant@test.com', password='password123',
            role='tenant', phone='0787654321'
        )

        # 3. Create a House
        self.house = House.objects.create(
            house_number='H1', house_type='1_bedroom', rent_amount=10000, status='vacant'
        )

        # URLs
        self.house_detail_url = f'/api/houses/{self.house.id}/'
        self.bill_list_url = '/api/bills/'

    def test_tenant_cannot_delete_house(self):
        """
        SECURITY CHECK: Tenant tries to delete a house. Should get 403 FORBIDDEN.
        """
        print("Testing: Tenant attempting to delete House...")
        self.client.force_authenticate(user=self.tenant_user)
        
        response = self.client.delete(self.house_detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(House.objects.filter(id=self.house.id).exists()) # House should still exist

    def test_admin_can_delete_house(self):
        """
        ACCESS CHECK: Admin tries to delete a house. Should get 204 NO CONTENT.
        """
        print("Testing: Admin attempting to delete House...")
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.delete(self.house_detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(House.objects.filter(id=self.house.id).exists()) # House should be gone

    def test_tenant_cannot_create_bill(self):
        """
        SECURITY CHECK: Tenant tries to create a bill. Should get 403 FORBIDDEN.
        """
        print("Testing: Tenant attempting to create Bill...")
        self.client.force_authenticate(user=self.tenant_user)
        
        data = {
            'tenant': self.tenant_user.id,
            'bill_type': 'water',
            'amount': 500,
            'month_for': '2025-01-01'
        }
        response = self.client.post(self.bill_list_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthorized_user_blocked(self):
        """
        SECURITY CHECK: Anonymous user tries to delete house. Should get 401 UNAUTHORIZED.
        """
        print("Testing: Anonymous hacker attempting to delete House...")
        self.client.logout() # Ensure no one is logged in
        
        response = self.client.delete(self.house_detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)