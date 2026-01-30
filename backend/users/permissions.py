from rest_framework import permissions

class IsEstateAdminOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow Admins to edit/delete.
    Assumes the model instance has an `owner` attribute if we want owner-editing,
    but for Houses/Bills, generally only Admins edit.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any authenticated request
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Write permissions are only allowed to the admin
        return request.user.is_authenticated and getattr(request.user, 'role', None) == 'estate_admin'