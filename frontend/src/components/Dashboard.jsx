import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import BuildIcon from '@mui/icons-material/Build';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');

      // Fetch house stats
      const houseResponse = await fetch('http://localhost:8000/api/houses/stats/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const houseStats = await houseResponse.json();

      // Fetch maintenance stats
      const maintenanceResponse = await fetch('http://localhost:8000/api/maintenance/stats/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const maintenanceStats = await maintenanceResponse.json();

      // Fetch tenants count
      const tenantsResponse = await fetch('http://localhost:8000/api/tenants/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tenants = await tenantsResponse.json();

      // Fetch payments count
      const paymentsResponse = await fetch('http://localhost:8000/api/payments/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const payments = await paymentsResponse.json();

      setStats({
        houses: houseStats,
        maintenance: maintenanceStats,
        tenantsCount: tenants.length,
        paymentsCount: payments.length
      });

      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data');
      setLoading(false);
      console.error('Dashboard error:', err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
      </Container>
    );
  }

  const statCards = [
    {
      title: 'Total Houses',
      value: stats.houses.total,
      subtitle: `${stats.houses.occupied} Occupied • ${stats.houses.vacant} Vacant`,
      icon: <HomeIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2'
    },
    {
      title: 'Active Tenants',
      value: stats.tenantsCount,
      subtitle: 'Currently residing',
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32'
    },
    {
      title: 'Maintenance Requests',
      value: stats.maintenance.total,
      subtitle: `${stats.maintenance.pending} Pending • ${stats.maintenance.completed} Completed`,
      icon: <BuildIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02'
    },
    {
      title: 'Total Payments',
      value: stats.paymentsCount,
      subtitle: 'Payment records',
      icon: <AttachMoneyIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Welcome back! Here's your system overview.
      </Typography>

      <Grid container spacing={3}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ 
              height: '100%',
              '&:hover': { boxShadow: 6 },
              transition: 'box-shadow 0.3s'
            }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color, opacity: 0.8 }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Occupancy Rate: <strong>{stats.houses.occupancy_rate}%</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Maintenance Completion Rate: <strong>
                {stats.maintenance.total > 0 
                  ? Math.round((stats.maintenance.completed / stats.maintenance.total) * 100)
                  : 0}%
              </strong>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

export default Dashboard;