from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from users.views import UserViewSet, tenant_register, verify_email
from estates.views import HouseViewSet, TenantViewSet, ContractViewSet, PaymentViewSet
from maintenance.views import MaintenanceRequestViewSet, MaintenanceImageViewSet

router = DefaultRouter()
router.register('users', UserViewSet)
router.register('houses', HouseViewSet)
router.register('tenants', TenantViewSet)
router.register('contracts', ContractViewSet)
router.register('payments', PaymentViewSet)
router.register('maintenance', MaintenanceRequestViewSet)
router.register('maintenance-images', MaintenanceImageViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/register/tenant/', tenant_register, name='tenant-register'),
    
    # No token param in URL, logic moved to POST body
    path('api/auth/verify-email/', verify_email, name='verify-email'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)