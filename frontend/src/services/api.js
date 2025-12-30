import axios from 'axios';

// Base API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token'); // Changed from 'token' to 'access_token' to match standard JWT naming often used
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  // Point to the specific tenant registration URL defined in urls.py
  registerTenant: (userData) => api.post('/auth/register/tenant/', userData),
  // Missing verify endpoint
  verifyEmail: (data) => api.post('/auth/verify-email/', data),
  logout: () => api.post('/auth/logout/'),
  getCurrentUser: () => api.get('/users/me/'), // Updated to likely location of user profile
};

// Housing API calls
export const housingAPI = {
  getAllHouses: () => api.get('/houses/'),
  getHouseById: (id) => api.get(`/houses/${id}/`),
  createHouse: (data) => api.post('/houses/', data),
  updateHouse: (id, data) => api.put(`/houses/${id}/`, data),
  deleteHouse: (id) => api.delete(`/houses/${id}/`),
  getVacantHouses: () => api.get('/houses/?status=vacant'),
};

// Maintenance API calls
export const maintenanceAPI = {
  getAllRequests: () => api.get('/maintenance/'),
  getRequestById: (id) => api.get(`/maintenance/${id}/`),
  createRequest: (data) => api.post('/maintenance/', data),
  updateRequest: (id, data) => api.put(`/maintenance/${id}/`, data),
  deleteRequest: (id) => api.delete(`/maintenance/${id}/`),
  assignTechnician: (id, technicianId) => api.post(`/maintenance/${id}/assign/`, { technician_id: technicianId }), // Fixed payload key
};

// Tenants API calls
export const tenantsAPI = {
  getAllTenants: () => api.get('/tenants/'),
  getTenantById: (id) => api.get(`/tenants/${id}/`),
  createTenant: (data) => api.post('/tenants/', data),
  updateTenant: (id, data) => api.put(`/tenants/${id}/`, data),
  deleteTenant: (id) => api.delete(`/tenants/${id}/`),
};

// Reports API calls
export const reportsAPI = {
  getOccupancyReport: () => api.get('/reports/occupancy_stats/'), // Fixed URL match
  getMaintenanceReport: () => api.get('/reports/dashboard_summary/'), // Adjusted to match backend method names
  getFinancialReport: () => api.get('/reports/monthly_trends/'),
};

export default api;