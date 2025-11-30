import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
} from '@mui/material';
import { Home, CheckCircle, Build, Info, Warning, Assessment } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';

const DashboardPage = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Total Houses',
      value: '245',
      change: '+5 this month',
      icon: <Home />,
      color: '#5C7E6D',
      trend: 'up',
    },
    {
      title: 'Occupied',
      value: '198',
      change: '80.8% occupancy',
      icon: <CheckCircle />,
      color: '#10B981',
      trend: 'up',
    },
    {
      title: 'Pending Maintenance',
      value: '23',
      change: '-8 from last week',
      icon: <Build />,
      color: '#F59E0B',
      trend: 'down',
    },
    {
      title: 'Vacant Houses',
      value: '47',
      change: '19.2% vacancy',
      icon: <Info />,
      color: '#4F5F8D',
      trend: 'down',
    },
  ];

  const recentRequests = [
    {
      id: 1,
      issue: 'Water leakage in House 45B',
      status: 'In Progress',
      priority: 'High',
      date: '2 hours ago',
    },
    {
      id: 2,
      issue: 'Broken window House 23A',
      status: 'Pending',
      priority: 'Medium',
      date: '5 hours ago',
    },
    {
      id: 3,
      issue: 'Electrical fault House 67C',
      status: 'Assigned',
      priority: 'High',
      date: '1 day ago',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Welcome back, {user?.name}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Here's what's happening with your estates today
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatsCard {...stat} />
          </Grid>
        ))}

        {/* Recent Maintenance Requests */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Maintenance Requests
              </Typography>
              <List>
                {recentRequests.map((item) => (
                  <ListItem key={item.id} divider>
                    <ListItemText
                      primary={item.issue}
                      secondary={`${item.date} • Priority: ${item.priority}`}
                    />
                    <Chip
                      label={item.status}
                      size="small"
                      color={
                        item.status === 'In Progress'
                          ? 'primary'
                          : item.status === 'Pending'
                          ? 'warning'
                          : 'info'
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions & Notifications */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Button variant="contained" startIcon={<Home />} fullWidth>
                  Allocate House
                </Button>
                <Button variant="outlined" startIcon={<Build />} fullWidth>
                  New Maintenance
                </Button>
                <Button variant="outlined" startIcon={<Assessment />} fullWidth>
                  Generate Report
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                System Notifications
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="5 contracts expiring this month"
                    secondary="Review required"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="House 12A inspection completed"
                    secondary="All checks passed"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;