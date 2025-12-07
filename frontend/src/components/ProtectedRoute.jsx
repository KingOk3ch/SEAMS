import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, allowedRoles }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role;

  // Check if user's role is in the allowed roles
  if (!allowedRoles.includes(userRole)) {
    // Redirect based on role
    if (userRole === 'tenant') {
      return <Navigate to="/tenant-dashboard" replace />;
    }
    if (userRole === 'technician') {
      return <Navigate to="/maintenance" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;