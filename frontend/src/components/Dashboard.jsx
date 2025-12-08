import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import BuildIcon from '@mui/icons-material/Build';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingMaintenance, setPendingMaintenance] = useState([]);
  const [expandApprovals, setExpandApprovals] = useState(false);
  const [expandMaintenance, setExpandMaintenance] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');

      const [houseResponse, maintenanceResponse, tenantsResponse, paymentsResponse, approvalsResponse] = await Promise.all([
        fetch('http://localhost:8000/api/houses/stats/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/maintenance/stats/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/tenants/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/payments/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/users/pending_approvals/', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const houseStats = await houseResponse.json();
      const maintenanceStats = await maintenanceResponse.json();
      const tenants = await tenantsResponse.json();
      const payments = await paymentsResponse.json();
      const approvals = await approvalsResponse.json();

      const maintenanceListResponse = await fetch('http://localhost:8000/api/maintenance/?status=pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const maintenanceList = await maintenanceListResponse.json();

      setStats({
        houses: houseStats,
        maintenance: maintenanceStats,
        tenantsCount: tenants.length,
        paymentsCount: payments.length,
        pendingApprovalsCount: approvals.count || 0
      });

      setPendingUsers(approvals.results || []);
      setPendingMaintenance(Array.isArray(maintenanceList) ? maintenanceList.slice(0, 5) : []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data');
      setLoading(false);
      console.error('Dashboard error:', err);
    }
  };

  const handleApprove = async (userId) => {
    if (!window.confirm('Approve this user registration?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/users/${userId}/approve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('User approved successfully');
        fetchDashboardData();
      } else {
        const data = await response.json();
        alert('Error: ' + (data.error || 'Failed to approve user'));
      }
    } catch (error) {
      alert('Error approving user');
      console.error('Approval error:', error);
    }
  };

  const handleReject = async (userId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/users/${userId}/reject/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rejection_reason: reason })
      });

      if (response.ok) {
        alert('User registration rejected');
        fetchDashboardData();
      } else {
        const data = await response.json();
        alert('Error: ' + (data.error || 'Failed to reject user'));
      }
    } catch (error) {
      alert('Error rejecting user');
      console.error('Rejection error:', error);
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
      color: '#ed6c02',
      hasBadge: stats.maintenance.pending > 0,
      onClick: () => setExpandMaintenance(!expandMaintenance)
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovalsCount,
      subtitle: 'Awaiting review',
      icon: <HourglassEmptyIcon sx={{ fontSize: 40 }} />,
      color: '#d32f2f',
      hasBadge: stats.pendingApprovalsCount > 0,
      onClick: () => setExpandApprovals(!expandApprovals)
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
            <Card 
              sx={{ 
                height: '100%',
                cursor: card.onClick ? 'pointer' : 'default',
                '&:hover': { boxShadow: card.onClick ? 6 : 3 },
                transition: 'box-shadow 0.3s',
                position: 'relative'
              }}
              onClick={card.onClick}
            >
              {card.hasBadge && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    bgcolor: '#d32f2f',
                    color: 'white',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 'bold',
                    animation: 'pulse 2s infinite'
                  }}
                >
                  !
                </Box>
              )}
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

      {stats.pendingApprovalsCount > 0 && (
        <Box sx={{ mt: 3 }}>
          <Card sx={{ borderLeft: '4px solid #d32f2f' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <HourglassEmptyIcon sx={{ color: '#d32f2f' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Pending User Approvals
                  </Typography>
                  <Chip 
                    label={stats.pendingApprovalsCount} 
                    color="error" 
                    size="small" 
                  />
                </Box>
                <IconButton onClick={() => setExpandApprovals(!expandApprovals)}>
                  {expandApprovals ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>

              <Collapse in={expandApprovals}>
                <List sx={{ mt: 2 }}>
                  {pendingUsers.map((pendingUser, index) => (
                    <React.Fragment key={pendingUser.id}>
                      {index > 0 && <Divider />}
                      <ListItem
                        sx={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          py: 2
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" fontWeight="bold">
                              {pendingUser.first_name} {pendingUser.last_name}
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" component="span" display="block">
                                Email: {pendingUser.email} | Phone: {pendingUser.phone || 'N/A'}
                              </Typography>
                              <Typography variant="body2" component="span" display="block">
                                House: {pendingUser.house_number || 'N/A'} | ID: {pendingUser.id_number || 'N/A'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Registered: {new Date(pendingUser.registration_date).toLocaleString()}
                              </Typography>
                            </>
                          }
                        />
                        <Box display="flex" gap={1} ml={2}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckIcon />}
                            onClick={() => handleApprove(pendingUser.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<CloseIcon />}
                            onClick={() => handleReject(pendingUser.id)}
                          >
                            Reject
                          </Button>
                        </Box>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Collapse>
            </CardContent>
          </Card>
        </Box>
      )}

      {stats.maintenance.pending > 0 && (
        <Box sx={{ mt: 3 }}>
          <Card sx={{ borderLeft: '4px solid #ed6c02' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <BuildIcon sx={{ color: '#ed6c02' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Pending Maintenance Requests
                  </Typography>
                  <Chip 
                    label={stats.maintenance.pending}
                    sx={{ bgcolor: '#ed6c02', color: 'white' }}
                    size="small" 
                  />
                </Box>
                <IconButton onClick={() => setExpandMaintenance(!expandMaintenance)}>
                  {expandMaintenance ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>

              <Collapse in={expandMaintenance}>
                <List sx={{ mt: 2 }}>
                  {pendingMaintenance.map((request, index) => (
                    <React.Fragment key={request.id}>
                      {index > 0 && <Divider />}
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" fontWeight="bold">
                              {request.title}
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" component="span" display="block">
                                {request.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
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
        </Box>
      )}

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