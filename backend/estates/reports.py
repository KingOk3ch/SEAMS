from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth, Coalesce
from django.utils import timezone
from datetime import timedelta
from .models import Payment, House, Tenant, Bill
from maintenance.models import MaintenanceRequest
from users.models import Notification

class IsEstateAdmin(permissions.BasePermission):
    """
    Custom permission to only allow users with role='estate_admin'
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) == 'estate_admin'
        )

class ReportsViewSet(viewsets.ViewSet):
    permission_classes = [IsEstateAdmin]

    @action(detail=False, methods=['get'])
    def dashboard_summary(self, request):
        today = timezone.now()
        current_month = today.month
        current_year = today.year

        # 1. Income (Only Verified)
        # Filters using the status field to ensure only confirmed payments are counted
        total_income = Payment.objects.filter(status='verified').aggregate(total=Sum('amount'))['total'] or 0
        
        monthly_income = Payment.objects.filter(
            payment_date__month=current_month, 
            payment_date__year=current_year,
            status='verified'
        ).aggregate(total=Sum('amount'))['total'] or 0

        # 2. Expenses
        total_expenses = MaintenanceRequest.objects.filter(status='completed').aggregate(
            total=Sum(Coalesce('actual_cost', 'estimated_cost'))
        )['total'] or 0

        monthly_expenses = MaintenanceRequest.objects.filter(
            status='completed',
            completed_at__month=current_month,
            completed_at__year=current_year
        ).aggregate(
            total=Sum(Coalesce('actual_cost', 'estimated_cost'))
        )['total'] or 0

        return Response({
            'total_income': total_income,
            'monthly_income': monthly_income,
            'total_expenses': total_expenses,
            'monthly_expenses': monthly_expenses,
            'net_profit': total_income - total_expenses
        })

    @action(detail=False, methods=['get'])
    def monthly_trends(self, request):
        today = timezone.now()
        
        # Generates a continuous 6-month calendar array to ensure months with zero transactions are plotted as 0
        merged_data = {}
        labels = []
        for i in range(5, -1, -1):
            month = today.month - i
            year = today.year
            if month <= 0:
                month += 12
                year -= 1
            month_str = timezone.datetime(year, month, 1).strftime('%b %Y')
            labels.append(month_str)
            merged_data[month_str] = {'income': 0, 'expense': 0}

        six_months_ago = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        for _ in range(5):
            six_months_ago = (six_months_ago - timedelta(days=1)).replace(day=1)

        income_data = Payment.objects.filter(
            payment_date__gte=six_months_ago,
            status='verified'
        ).annotate(month=TruncMonth('payment_date')) \
            .values('month') \
            .annotate(total=Sum('amount')) \
            .order_by('month')

        expense_data = MaintenanceRequest.objects.filter(
            status='completed',
            completed_at__gte=six_months_ago
        ).annotate(month=TruncMonth('completed_at')) \
            .values('month') \
            .annotate(total=Sum(Coalesce('actual_cost', 'estimated_cost'))) \
            .order_by('month')

        for item in income_data:
            month_str = item['month'].strftime('%b %Y')
            if month_str in merged_data:
                merged_data[month_str]['income'] = item['total']

        for item in expense_data:
            month_str = item['month'].strftime('%b %Y')
            if month_str in merged_data:
                merged_data[month_str]['expense'] = item['total']

        income_series = [merged_data[label]['income'] for label in labels]
        expense_series = [merged_data[label]['expense'] for label in labels]

        return Response({
            'labels': labels,
            'income': income_series,
            'expense': expense_series
        })

    @action(detail=False, methods=['get'])
    def occupancy_stats(self, request):
        total_houses = House.objects.count()
        occupied = House.objects.filter(status='occupied').count()
        vacant = House.objects.filter(status='vacant').count()
        maintenance_mode = House.objects.filter(status='under_repair').count()
        
        # Extracts reserved houses so the frontend pie chart accurately reflects all 4 possible house statuses
        reserved = House.objects.filter(status='reserved').count()

        maintenance_by_cat = MaintenanceRequest.objects.values('category') \
            .annotate(count=Count('id')) \
            .order_by('-count')

        return Response({
            'occupancy': {
                'total': total_houses,
                'occupied': occupied,
                'vacant': vacant,
                'maintenance': maintenance_mode,
                'reserved': reserved
            },
            'maintenance_categories': maintenance_by_cat
        })

    @action(detail=False, methods=['get'])
    def debtors_list(self, request):
        today = timezone.now()
        current_month = today.month
        current_year = today.year
        
        debtors = []
        active_tenants = Tenant.objects.filter(status='active', house__isnull=False)
        
        for tenant in active_tenants:
            # 1. Expected Rent
            rent_due = tenant.house.rent_amount

            # 2. Other Bills (for this month)
            # Queries the database for all unpaid bills utilizing the Smart Ledger logic
            unpaid_bills = Bill.objects.filter(tenant=tenant, is_paid=False)
            
            # 3. VERIFIED Payments only
            # Evaluates the exact balance dynamically from the generated bills rather than manual math
            if unpaid_bills.exists():
                total_amount = unpaid_bills.aggregate(total=Sum('amount'))['total'] or 0
                total_paid = unpaid_bills.aggregate(total=Sum('amount_paid'))['total'] or 0
                balance = total_amount - total_paid
                
                if balance > 0:
                    debtors.append({
                        'id': tenant.id,
                        'name': f"{tenant.user.first_name} {tenant.user.last_name}",
                        'house': tenant.house.house_number,
                        'phone': tenant.user.phone or "N/A",
                        'rent_amount': rent_due,
                        'bills_amount': total_amount - rent_due if total_amount > rent_due else 0,
                        'paid_amount': total_paid,
                        'balance': balance
                    })
        
        # Sorts the final list so the tenant with the highest outstanding balance appears first
        debtors.sort(key=lambda x: x['balance'], reverse=True)
        
        return Response(debtors)

    @action(detail=False, methods=['post'])
    def ping_debtor(self, request):
        tenant_id = request.data.get('tenant_id')
        if not tenant_id:
            return Response({'error': 'Tenant ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tenant = Tenant.objects.get(id=tenant_id)
            current_month = timezone.now().strftime('%B')
            
            Notification.objects.create(
                recipient=tenant.user,
                message=f"PAYMENT REMINDER: Dear {tenant.user.first_name}, you have an outstanding balance for {current_month}. Please pay immediately.",
                link="/tenant-dashboard"
            )
            
            return Response({'message': f'Reminder sent to {tenant.user.first_name}'})
            
        except Tenant.DoesNotExist:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)

    # Dynamically builds a query based on provided filter parameters for granular financial audits
    @action(detail=False, methods=['get'])
    def transactions(self, request):
        queryset = Payment.objects.all()
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        tenant_id = request.query_params.get('tenant_id')
        payment_type = request.query_params.get('payment_type')
        status_param = request.query_params.get('status')

        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if payment_type:
            queryset = queryset.filter(payment_type=payment_type)
        if status_param:
            queryset = queryset.filter(status=status_param)

        data = []
        for p in queryset.select_related('tenant__user', 'tenant__house').order_by('-payment_date'):
            data.append({
                'id': p.id,
                'date': p.payment_date.strftime('%Y-%m-%d'),
                'tenant': f"{p.tenant.user.first_name} {p.tenant.user.last_name}" if p.tenant and p.tenant.user else 'N/A',
                'house': p.tenant.house.house_number if p.tenant and p.tenant.house else 'N/A',
                'amount': float(p.amount),
                'type': p.payment_type,
                'method': p.payment_method,
                'reference': p.reference_number,
                'status': p.status or ('verified' if p.is_verified else 'pending')
            })
        return Response(data)

    # Filters maintenance logs by date, category, status, and personnel specializations to support administrative audits
    @action(detail=False, methods=['get'])
    def maintenance_logs(self, request):
        queryset = MaintenanceRequest.objects.all()
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        category = request.query_params.get('category')
        status_param = request.query_params.get('status')
        tenant_id = request.query_params.get('tenant_id')
        technician_id = request.query_params.get('technician_id')

        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        if category:
            queryset = queryset.filter(category=category)
        if status_param:
            queryset = queryset.filter(status=status_param)
            
        if tenant_id:
            try:
                # Traces the reporting tenant back to the base User model for request matching
                tenant = Tenant.objects.get(id=tenant_id)
                queryset = queryset.filter(reported_by=tenant.user)
            except Tenant.DoesNotExist:
                pass
                
        if technician_id:
            queryset = queryset.filter(assigned_to_id=technician_id)

        data = []
        for m in queryset.select_related('house', 'assigned_to').order_by('-created_at'):
            # Enriches the report by appending specialization to the technician's name
            tech_name = 'Unassigned'
            if m.assigned_to:
                specialty = getattr(m.assigned_to, 'specialization', 'General')
                tech_name = f"{m.assigned_to.first_name} {m.assigned_to.last_name} ({specialty.capitalize()})"

            data.append({
                'id': m.id,
                'date': m.created_at.strftime('%Y-%m-%d'),
                'house': m.house.house_number if m.house else m.house_number,
                'issue': m.issue_description,
                'category': m.category,
                'priority': m.priority,
                'status': m.status,
                'technician': tech_name,
                'cost': float(m.actual_cost or m.estimated_cost or 0)
            })
        return Response(data)