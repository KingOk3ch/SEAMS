import React, { useState, useEffect } from 'react';
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
  IconButton,
  Collapse,
  Divider,
  Badge,
} from '@mui/material';
import { 
  Home, 
  CheckCircle, 
  Build, 
  Info, 
  Warning, 
  Assessment,
  ExpandMore,
  ExpandLess,
  Check,
  Close,
  HourglassEmpty,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';
import api from '../services/api';

const DashboardPage = () => {
  const { user } = useAuth();
  const [expandApprovals, setExpandApprovals] = useState(false);
  const [expandMaintenance, setExpandMaintenance] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingMaintenance, setPendingMaintenance] = useState([]);
  const [stats, setStats] = useState([
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
  ]);

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

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchPendingData();
    }
  }, [user]);

  const fetchPendingData = async () => {
    try {
      const [approvalsRes, maintenanceRes] = await Promise.all([
        api.get('/users/pending_approvals/'),
        api.get('/maintenance/?status=pending')
      ]);

      setPendingUsers(approvalsRes.data.results || []);
      setPendingMaintenance(maintenanceRes.data.slice(0, 5) || []);

      setStats(prev => prev.map(stat => {
        if (stat.title === 'Pending Maintenance') {
          return { ...stat, value: maintenanceRes.data.length.toString() };
        }
        return stat;
      }));
    } catch (error) {
      console.error('Error fetching pending data:', error);
    }
  };

  const handleApprove = async (userId) => {
    if (!window.confirm('Approve this user registration?')) return;

    try {
      await api.post(`/users/${userId}/approve/`);
      alert('User approved successfully');
      fetchPendingData();
    } catch (error) {
      alert('Error approving user: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleReject = async (userId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await api.post(`/users/${userId}/reject/`, { rejection_reason: reason });
      alert('User registration rejected');
      fetchPendingData();
    } catch (error) {
      alert('Error rejecting user: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Welcome back, {user?.name || user?.username}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Here's what's happening with your estates today
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatsCard {...stat} />
          </Grid>
        ))}

        {(user?.role === 'admin' || user?.role === 'manager') && pendingUsers.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ borderLeft: '4px solid #EF4444' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={2}>
                    <HourglassEmpty sx={{ color: '#EF4444' }} />
                    <Typography variant="h6" fontWeight="bold">
                      Pending User Approvals
                    </Typography>
                    <Chip 
                      label={pendingUsers.length} 
                      color="error" 
                      size="small" 
                    />
                  </Box>
                  <IconButton onClick={() => setExpandApprovals(!expandApprovals)}>
                    {expandApprovals ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                <Collapse in={expandApprovals}>
                  <List sx={{ mt: 2 }}>
                    {pendingUsers.map((pendingUser, index) => (
                      <React.Fragment key={pendingUser.id}>
                        {index > 0 && <Divider />}
                        <ListItem
                          secondaryAction={
                            <Box display="flex" gap={1}>
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={<Check />}
                                onClick={() => handleApprove(pendingUser.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<Close />}
                                onClick={() => handleReject(pendingUser.id)}
                              >
                                Reject
                              </Button>
                            </Box>
                          }
                        >
                          <ListItemText
                            primary={`${pendingUser.first_name} ${pendingUser.last_name}`}
                            secondary={
                              <>
                                <Typography variant="body2" component="span">
                                  Email: {pendingUser.email} | Phone: {pendingUser.phone || 'N/A'}
                                </Typography>
                                <br />
                                <Typography variant="body2" component="span">
                                  House: {pendingUser.house_number || 'N/A'} | ID: {pendingUser.id_number || 'N/A'}
                                </Typography>
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                  Registered: {new Date(pendingUser.registration_date).toLocaleString()}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        )}

        {(user?.role === 'admin' || user?.role === 'manager') && pendingMaintenance.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ borderLeft: '4px solid #F59E0B' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Build sx={{ color: '#F59E0B' }} />
                    <Typography variant="h6" fontWeight="bold">
                      Pending Maintenance Requests
                    </Typography>
                    <Chip 
                      label={pendingMaintenance.length} 
                      sx={{ bgcolor: '#F59E0B', color: 'white' }}
                      size="small" 
                    />
                  </Box>
                  <IconButton onClick={() => setExpandMaintenance(!expandMaintenance)}>
                    {expandMaintenance ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                <Collapse in={expandMaintenance}>
                  <List sx={{ mt: 2 }}>
                    {pendingMaintenance.map((request, index) => (
                      <React.Fragment key={request.id}>
                        {index > 0 && <Divider />}
                        <ListItem>
                          <ListItemText
                            primary={request.title}
                            secondary={
                              <>
                                <Typography variant="body2" component="span">
                                  {request.description}
                                </Typography>
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                  House: {request.house_number} | Priority: {request.priority} | 
                                  {new Date(request.created_at).toLocaleDateString()}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        )}

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