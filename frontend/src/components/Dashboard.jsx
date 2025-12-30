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
  Tooltip,
  // Added Imports for Dialog
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
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
  Warning,
  ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  
  // Data States
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingMaintenance, setPendingMaintenance] = useState([]);
  const [vacantHouses, setVacantHouses] = useState([]); // Store vacant houses for dropdown

  // Approval Dialog States
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [approvalData, setApprovalData] = useState({
    house_id: '',
    move_in_date: new Date().toISOString().split('T')[0],
    contract_start: new Date().toISOString().split('T')[0],
    contract_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });
  
  // UI States
  const [expandApprovals, setExpandApprovals] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchVacantHouses(); // Fetch houses on load
  }, []);

  const fetchVacantHouses = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/houses/vacant/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setVacantHouses(data);
      }
    } catch (err) {
      console.error('Error fetching vacant houses:', err);
    }
  };

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

  const handleOpenApprove = (user) => {
    setSelectedUser(user);
    // Reset data
    setApprovalData({
      house_id: '',
      move_in_date: new Date().toISOString().split('T')[0],
      contract_start: new Date().toISOString().split('T')[0],
      contract_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    });
    setOpenApproveDialog(true);
  };

  const handleCloseApprove = () => {
    setOpenApproveDialog(false);
    setSelectedUser(null);
  };

  const handleApprovalInputChange = (e) => {
    const { name, value } = e.target;
    setApprovalData(prev => ({ ...prev, [name]: value }));
  };

  const submitApproval = async () => {
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/users/${selectedUser.id}/approve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approval_status: 'approved',
          ...approvalData
        })
      });

      if (response.ok) {
        setActionMessage({ type: 'success', text: `User ${selectedUser.first_name} approved and assigned!` });
        handleCloseApprove();
        fetchDashboardData(); 
        fetchVacantHouses(); // Update vacant list
      } else {
        const data = await response.json();
        setActionMessage({ type: 'error', text: data.error || 'Failed to approve user' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Network error approving user' });
    }
    setTimeout(() => setActionMessage({ type: '', text: '' }), 3000);
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
        setActionMessage({ type: 'success', text: `User rejected successfully` });
        fetchDashboardData(); 
      } else {
        const data = await response.json();
        setActionMessage({ type: 'error', text: data.error || `Failed to reject user` });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Network error occurred' });
    }
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
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': onClick ? { 
          transform: 'translateY(-4px)', 
          boxShadow: '0 12px 20px -10px rgba(0,0,0,0.2)',
          borderColor: color 
        } : {}
      }}
      onClick={onClick}
    >
      {hasBadge && (
        <Box sx={{ position: 'absolute', top: 10, right: 10, width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', animation: 'pulse 1.5s infinite' }} />
      )}
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography color="text.secondary" variant="body2" gutterBottom textTransform="uppercase" fontWeight="bold" fontSize="0.75rem">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
            {subtitle}
          </Typography>
        </Box>
        <Box sx={{ color: color, p: 1.5, borderRadius: 3, bgcolor: `${color}15` }}>
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
            onClick={() => navigate('/houses')} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Tenants" 
            value={stats.tenantsCount} 
            subtitle="Active Leases"
            icon={<People fontSize="large" />} 
            color="#2e7d32" 
            onClick={() => navigate('/tenants')} 
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
            onClick={() => navigate('/maintenance')} 
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
            <Box>
                {/* Shortcuts to User Management */}
                <Button size="small" onClick={() => navigate('/users')} sx={{ mr: 1 }}>Manage All Users</Button>
                <IconButton onClick={() => setExpandApprovals(!expandApprovals)}>
                {expandApprovals ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
            </Box>
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
                            onClick={() => handleOpenApprove(user)} // CHANGED: Open Dialog
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small" 
                            startIcon={<Close />}
                            onClick={() => handleReject(user.id)}
                          >
                            Reject
                          </Button>
                        </Box>
                      }
                      sx={{ flexWrap: 'wrap' }}
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
        <Box p={2} bgcolor="#f5f5f5" borderBottom="1px solid #e0e0e0" display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <NotificationsActive color="primary" /> 
            Active Maintenance Tasks 
          </Typography>
          <Button endIcon={<ArrowForward />} size="small" onClick={() => navigate('/maintenance')}>View All</Button>
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

      {/* --- APPROVAL DIALOG */}
      <Dialog open={openApproveDialog} onClose={handleCloseApprove} maxWidth="sm" fullWidth>
        <DialogTitle>Approve & Assign House</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              Approving <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>. Please assign a vacant house.
            </Alert>
            
            <TextField
              select
              label="Assign House"
              name="house_id"
              value={approvalData.house_id}
              onChange={handleApprovalInputChange}
              fullWidth
              required
            >
              {vacantHouses.length === 0 ? (
                <MenuItem disabled>No vacant houses available</MenuItem>
              ) : (
                vacantHouses.map((house) => (
                  <MenuItem key={house.id} value={house.id}>
                    {house.house_number} ({house.house_type}) - KES {house.rent_amount}
                  </MenuItem>
                ))
              )}
            </TextField>

            <TextField
              label="Move-in Date"
              name="move_in_date"
              type="date"
              value={approvalData.move_in_date}
              onChange={handleApprovalInputChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Contract Start"
                  name="contract_start"
                  type="date"
                  value={approvalData.contract_start}
                  onChange={handleApprovalInputChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Contract End"
                  name="contract_end"
                  type="date"
                  value={approvalData.contract_end}
                  onChange={handleApprovalInputChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApprove}>Cancel</Button>
          <Button 
            onClick={submitApproval} 
            variant="contained" 
            color="success"
            disabled={!approvalData.house_id}
          >
            Approve & Assign
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}

export default Dashboard;