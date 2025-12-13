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
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Home,
  People,
  Build,
  HourglassEmpty,
  ExpandMore,
  ExpandLess,
  Check,
  Close,
  NotificationsActive,
  Warning
} from '@mui/icons-material';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  
  // Data States
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingMaintenance, setPendingMaintenance] = useState([]);
  
  // UI States
  const [expandApprovals, setExpandApprovals] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch all data in parallel for speed
      const [
        houseRes, 
        maintenanceRes, 
        tenantsRes, 
        paymentsRes, 
        approvalsRes, 
        allMaintenanceRes
      ] = await Promise.all([
        fetch('http://localhost:8000/api/houses/stats/', { headers }),
        fetch('http://localhost:8000/api/maintenance/stats/', { headers }),
        fetch('http://localhost:8000/api/tenants/', { headers }),
        fetch('http://localhost:8000/api/payments/', { headers }),
        fetch('http://localhost:8000/api/users/pending_approvals/', { headers }),
        fetch('http://localhost:8000/api/maintenance/', { headers })
      ]);

      const houses = await houseRes.json();
      const maintenance = await maintenanceRes.json();
      const tenants = await tenantsRes.json();
      const payments = await paymentsRes.json();
      const approvals = await approvalsRes.json();
      const maintenanceList = await allMaintenanceRes.json();

      // Filter for incomplete tasks that are assigned (Active Tasks)
      const incompleteTasks = maintenanceList.filter(r => 
        (r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress') && 
        r.assigned_to
      );

      setStats({
        houses,
        maintenance,
        tenantsCount: tenants.length,
        paymentsCount: payments.length,
        pendingApprovalsCount: approvals.count || 0
      });

      setPendingUsers(approvals.results || []);
      setPendingMaintenance(incompleteTasks);
      setLoading(false);
    } catch (err) {
      console.error('Dashboard Load Error:', err);
      setError('Failed to load dashboard data. Please check your connection.');
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleUserAction = async (userId, action) => {
    // Action is either 'approve' or 'reject'
    let body = {};
    
    if (action === 'approve') {
      if (!window.confirm('Approve this user? They will be able to log in immediately.')) return;
      body = { approval_status: 'approved' };
    } else {
      const reason = prompt('Enter rejection reason:');
      if (!reason) return;
      body = { rejection_reason: reason };
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/users/${userId}/${action}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setActionMessage({ type: 'success', text: `User ${action}d successfully` });
        fetchDashboardData(); // Refresh data
      } else {
        const data = await response.json();
        setActionMessage({ type: 'error', text: data.error || `Failed to ${action} user` });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Network error occurred' });
    }
    
    // Clear message after 3 seconds
    setTimeout(() => setActionMessage({ type: '', text: '' }), 3000);
  };

  const handlePing = async (requestId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/maintenance/${requestId}/ping/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setActionMessage({ type: 'success', text: `Technician pinged for Request #${requestId}` });
      } else {
        setActionMessage({ type: 'error', text: "Failed to send ping notification" });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: "Network error sending ping" });
    }
    setTimeout(() => setActionMessage({ type: '', text: '' }), 3000);
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  // --- UI Components ---

  const StatCard = ({ title, value, subtitle, icon, color, onClick, hasBadge }) => (
    <Card 
      sx={{ 
        height: '100%', 
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: '0.3s',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 4 } : {}
      }}
      onClick={onClick}
    >
      {hasBadge && (
        <Box sx={{ position: 'absolute', top: 10, right: 10, width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', animation: 'pulse 1.5s infinite' }} />
      )}
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography color="text.secondary" variant="body2" gutterBottom>{title}</Typography>
          <Typography variant="h4" fontWeight="bold">{value}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
        <Box sx={{ color: color, p: 1, borderRadius: 2, bgcolor: `${color}20` }}>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Dashboard</Typography>
        <Typography color="text.secondary">System Overview & Alerts</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {actionMessage.text && <Alert severity={actionMessage.type} sx={{ mb: 2 }}>{actionMessage.text}</Alert>}

      {/* --- STATS GRID --- */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Properties" 
            value={stats.houses.total} 
            subtitle={`${stats.houses.occupied} Occupied • ${stats.houses.vacant} Vacant`}
            icon={<Home fontSize="large" />} 
            color="#1976d2" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Tenants" 
            value={stats.tenantsCount} 
            subtitle="Active Leases"
            icon={<People fontSize="large" />} 
            color="#2e7d32" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Maintenance" 
            value={stats.maintenance.total} 
            subtitle={`${stats.maintenance.pending} Pending Tasks`}
            icon={<Build fontSize="large" />} 
            color="#ed6c02"
            hasBadge={stats.maintenance.pending > 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Approvals" 
            value={stats.pendingApprovalsCount} 
            subtitle="Awaiting Review"
            icon={<HourglassEmpty fontSize="large" />} 
            color="#d32f2f"
            hasBadge={stats.pendingApprovalsCount > 0}
            onClick={() => setExpandApprovals(!expandApprovals)}
          />
        </Grid>
      </Grid>

      {/* --- PENDING APPROVALS SECTION --- */}
      <Collapse in={expandApprovals || stats.pendingApprovalsCount > 0}>
        <Paper sx={{ mb: 4, borderLeft: '6px solid #d32f2f', overflow: 'hidden' }}>
          <Box p={2} display="flex" justifyContent="space-between" alignItems="center" bgcolor="#fff5f5">
            <Box display="flex" alignItems="center" gap={1}>
              <Warning color="error" />
              <Typography variant="h6" color="error">Pending User Registrations</Typography>
              <Chip label={stats.pendingApprovalsCount} color="error" size="small" />
            </Box>
            <IconButton onClick={() => setExpandApprovals(!expandApprovals)}>
              {expandApprovals ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          <Collapse in={expandApprovals}>
            <List>
              {pendingUsers.length === 0 ? (
                <ListItem><ListItemText primary="No pending approvals." /></ListItem>
              ) : (
                pendingUsers.map((user, index) => (
                  <React.Fragment key={user.id}>
                    {index > 0 && <Divider />}
                    <ListItem 
                      alignItems="flex-start"
                      secondaryAction={
                        <Box display="flex" gap={1} mt={1}>
                          <Button 
                            variant="contained" 
                            color="success" 
                            size="small" 
                            startIcon={<Check />}
                            onClick={() => handleUserAction(user.id, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small" 
                            startIcon={<Close />}
                            onClick={() => handleUserAction(user.id, 'reject')}
                          >
                            Reject
                          </Button>
                        </Box>
                      }
                      sx={{ flexWrap: 'wrap' }} // Responsive list item
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" fontWeight="bold">
                            {user.first_name} {user.last_name} 
                            <Chip label={user.role} size="small" sx={{ ml: 1, textTransform: 'uppercase', fontSize: '0.7rem' }} />
                          </Typography>
                        }
                        secondary={
                          <Box component="span" display="flex" flexDirection="column" gap={0.5} mt={0.5}>
                            <Typography variant="body2">Email: {user.email}</Typography>
                            <Typography variant="body2">Phone: {user.phone || 'N/A'}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Registered: {new Date(user.registration_date).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))
              )}
            </List>
          </Collapse>
        </Paper>
      </Collapse>

      {/* --- ACTIVE MAINTENANCE (PING) TABLE --- */}
      <Paper sx={{ mb: 4, overflow: 'hidden' }}>
        <Box p={2} bgcolor="#f5f5f5" borderBottom="1px solid #e0e0e0">
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <NotificationsActive color="primary" /> 
            Active Maintenance Tasks 
            <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
              (Ping technicians for updates)
            </Typography>
          </Typography>
        </Box>
        
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Issue & House</TableCell>
                <TableCell>Assigned Tech</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingMaintenance.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">No active tasks assigned.</TableCell></TableRow>
              ) : (
                pendingMaintenance.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>#{row.request_id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">{row.category.toUpperCase()}</Typography>
                      <Typography variant="caption">{row.issue_description.substring(0, 40)}...</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">House: {row.house_number}</Typography>
                    </TableCell>
                    <TableCell>{row.assigned_to_name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={row.status.replace('_', ' ').toUpperCase()} 
                        color={row.status === 'in_progress' ? 'primary' : 'warning'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Send Urgent Notification">
                        <Button 
                          variant="outlined" 
                          color="primary" 
                          size="small" 
                          startIcon={<NotificationsActive />}
                          onClick={() => handlePing(row.id)}
                        >
                          Ping
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* --- SYSTEM HEALTH --- */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>System Health</Typography>
              <Box display="flex" gap={4} flexWrap="wrap">
                <Box>
                  <Typography variant="caption" color="text.secondary">Occupancy Rate</Typography>
                  <Typography variant="h5" color="primary">{stats.houses.occupancy_rate}%</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Task Completion</Typography>
                  <Typography variant="h5" color="success.main">
                    {stats.maintenance.total > 0 
                      ? Math.round((stats.maintenance.completed / stats.maintenance.total) * 100) 
                      : 0}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

    </Container>
  );
}

export default Dashboard;