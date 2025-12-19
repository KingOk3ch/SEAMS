import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import HouseManagement from './components/HouseManagement';
import TenantManagement from './components/TenantManagement';
import MaintenanceRequests from './components/MaintenanceRequests';
import PaymentManagement from './components/PaymentManagement';
import ContractManagement from './components/ContractManagement';
import TenantDashboard from './components/TenantDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './components/UserManagement';
import TenantRegistration from './components/TenantRegistration';
import Profile from './components/Profile';
import Reports from './components/Reports'; // New Import

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const getDefaultRoute = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'tenant') return '/tenant-dashboard';
    if (user.role === 'technician') return '/maintenance';
    return '/dashboard';
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<TenantRegistration />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout onLogout={handleLogout}>
          <Routes>
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['estate_admin']}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/houses" 
              element={
                <ProtectedRoute allowedRoles={['estate_admin']}>
                  <HouseManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tenants" 
              element={
                <ProtectedRoute allowedRoles={['estate_admin']}>
                  <TenantManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <ProtectedRoute allowedRoles={['estate_admin']}>
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/contracts" 
              element={
                <ProtectedRoute allowedRoles={['estate_admin']}>
                  <ContractManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/payments" 
              element={
                <ProtectedRoute allowedRoles={['estate_admin']}>
                  <PaymentManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/maintenance" 
              element={
                <ProtectedRoute allowedRoles={['estate_admin', 'technician', 'tenant']}>
                  <MaintenanceRequests />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tenant-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <TenantDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute allowedRoles={['estate_admin', 'technician', 'tenant', 'manager']}>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute allowedRoles={['estate_admin']}>
                  <Reports />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to={getDefaultRoute()} />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;