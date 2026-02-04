from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db.utils import IntegrityError
from datetime import date
from decimal import Decimal
from .models import House, Tenant, Payment, Bill

User = get_user_model()

class RobustnessTests(TestCase):
    def setUp(self):
        # 1. Setup a User, House, and Tenant
        self.user = User.objects.create_user(username='test_tenant', password='password123')
        self.house = House.objects.create(
            house_number='H101', house_type='1_bedroom', 
            rent_amount=10000, status='occupied'
        )
        self.tenant = Tenant.objects.create(
            user=self.user, house=self.house,
            move_in_date=date.today(), contract_start=date.today(), 
            contract_end=date.today()
        )

    def test_duplicate_payment_reference(self):
        """
        CRITICAL: The system MUST crash/fail if we submit the same reference code twice.
        """
        print("\nTesting Duplicate Payment Prevention...")
        
        # Payment 1 (Should Succeed)
        Payment.objects.create(
            tenant=self.tenant, amount=5000, payment_date=date.today(),
            payment_method='mpesa', reference_number='QK_DUPLICATE_TEST',
            month_for=date.today()
        )
        
        # Payment 2 (Should Fail)
        with self.assertRaises(IntegrityError):
            Payment.objects.create(
                tenant=self.tenant, amount=5000, payment_date=date.today(),
                payment_method='mpesa', reference_number='QK_DUPLICATE_TEST', # Same Ref
                month_for=date.today()
            )
        print("✅ SUCCESS: Duplicate payment was correctly rejected by Database.")

    def test_partial_bill_payment(self):
        """
        LOGIC: If I owe 5000 and pay 3000, the bill should remain open with 2000 balance.
        """
        print("\nTesting Partial Bill Logic...")

        # 1. Create a Bill for 5,000
        bill = Bill.objects.create(
            tenant=self.tenant, bill_type='water', amount=5000,
            month_for=date.today()
        )

        # 2. Verify Initial State
        self.assertEqual(bill.amount_paid, 0)
        self.assertFalse(bill.is_paid)

        # 3. Simulate Logic: Pay 3,000
        payment_amount = 3000
        bill_balance = bill.amount - bill.amount_paid # 5000 - 0 = 5000
        amount_to_pay = min(payment_amount, bill_balance) # min(3000, 5000) = 3000
        
        bill.amount_paid += amount_to_pay
        if bill.amount_paid >= bill.amount:
            bill.is_paid = True
        bill.save()

        # 4. Assertions (The Proof)
        bill.refresh_from_db() # Reload from DB to be sure
        
        self.assertEqual(bill.amount_paid, 3000)      # Paid should be 3k
        self.assertEqual(bill.balance_due, 2000)      # Balance should be 2k
        self.assertFalse(bill.is_paid)                # Should NOT be closed
        
        print(f"✅ SUCCESS: Bill calculated correctly. Paid: {bill.amount_paid}, Remaining: {bill.balance_due}")

    def test_full_bill_settlement(self):
        """
        LOGIC: Paying the remaining balance should close the bill.
        """
        print("\nTesting Full Settlement...")
        
        # Create Bill with 2000 remaining
        bill = Bill.objects.create(
            tenant=self.tenant, bill_type='water', amount=5000,
            amount_paid=3000, month_for=date.today()
        )
        
        # Pay the remaining 2000
        bill.amount_paid += 2000
        if bill.amount_paid >= bill.amount:
            bill.is_paid = True
        bill.save()
        
        self.assertTrue(bill.is_paid)
        self.assertEqual(bill.balance_due, 0)
        print("✅ SUCCESS: Bill marked as Paid after full settlement.")