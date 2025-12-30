import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { Build } from '@mui/icons-material';

const MaintenancePage = () => {
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0); // 0=Active, 1=Completed, 2=All
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, completed: 0 });

  useEffect(() => {
    fetchMaintenanceData();
  }, [activeTab]);

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Determine which endpoint to call based on active tab
      let endpoint = 'http://localhost:8000/api/maintenance/'; // Active by default
      if (activeTab === 1) {
        endpoint = 'http://localhost:8000/api/maintenance/completed/';
      } else if (activeTab === 2) {
        endpoint = 'http://localhost:8000/api/maintenance/all-requests/';
      }

      const response = await fetch(endpoint, { headers });
      const data = await response.json();
      setMaintenanceRequests(data.results || data);

      // Fetch stats
      const statsResponse = await fetch('http://localhost:8000/api/maintenance/stats/', { headers });
      const statsData = await statsResponse.json();
      setStats(statsData);

      setLoading(false);
    } catch (err) {
      setError('Failed to load maintenance data');
      setLoading(false);
      console.error('Error:', err);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'new': 'info',
      'pending': 'warning',
      'assigned': 'info',
      'in_progress': 'primary',
      'completed': 'success',
      'cancelled': 'error',
    };
    return statusColors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const priorityColors = {
      'urgent': 'error',
      'high': 'error',
      'medium': 'warning',
      'low': 'default',
    };
    return priorityColors[priority] || 'default';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Maintenance Management
        </Typography>
        <Button 
          variant="contained" 
          color="secondary" 
          startIcon={<Build />}
          onClick={() => window.location.href = '/maintenance/new'}
        >
          New Request
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#F59E0B', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {stats.pending || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Awaiting assignment
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#4F5F8D', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {stats.in_progress || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Currently being worked on
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#10B981', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {stats.completed || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Total completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Maintenance Requests List with Tabs */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                  <Tab label={`Active (${stats.pending + stats.in_progress || 0})`} />
                  <Tab label={`Completed (${stats.completed || 0})`} />
                  <Tab label={`All (${stats.total || 0})`} />
                </Tabs>
              </Box>

              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {activeTab === 0 ? 'Active' : activeTab === 1 ? 'Completed' : 'All'} Maintenance Requests
              </Typography>

              {maintenanceRequests.length === 0 ? (
                <Alert severity="info">No maintenance requests found</Alert>
              ) : (
                <List>
                  {maintenanceRequests.map((request) => (
                    <ListItem
                      key={request.id}
                      divider
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        py: 2,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Typography fontWeight="bold" variant="body1">
                            {request.request_id}
                          </Typography>
                          <Chip
                            label={request.priority.toUpperCase()}
                            size="small"
                            color={getPriorityColor(request.priority)}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Issue:</strong> {request.issue_description}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>House:</strong> {request.house?.house_number || 'N/A'} • 
                          <strong> Category:</strong> {request.category.toUpperCase()} •
                          <strong> Technician:</strong> {request.assigned_to ? 
                            `${request.assigned_to.first_name} ${request.assigned_to.last_name}` : 
                            'Unassigned'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Date:</strong> {formatDate(request.created_at)}
                        </Typography>
                      </Box>
                      <Chip
                        label={request.status.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(request.status)}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MaintenancePage;