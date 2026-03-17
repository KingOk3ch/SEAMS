import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CardActionArea
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import BuildIcon from '@mui/icons-material/Build';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate } from 'react-router-dom';
import { parseBackendErrors } from '../utils/errorHandler'; 
import LogoLoader from './LogoLoader';

function Dashboard() {
  const [stats, setStats] = useState({
    totalHouses: 0,
    occupiedHouses: 0,
    vacantHouses: 0,
    totalTenants: 0,
    pendingApprovals: 0,
    activeMaintenanceRequests: 0,
    totalRevenue: 0
  });

  const [pendingUsers, setPendingUsers] = useState([]);
  const [vacantHouses, setVacantHouses] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Secures the approval and rejection flows to prevent duplicate API requests and UI freezing
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [approvalData, setApprovalData] = useState({
    house_id: '',
    move_in_date: new Date().toISOString().split('T')[0],
    contract_start: new Date().toISOString().split('T')[0],
    contract_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // --- OPTIMIZED ENGINE: One single request instead of five ---
      const response = await fetch('http://localhost:8000/api/dashboard/stats/', { headers });
      
      if (!response.ok) {
        throw new Error('Failed to load stats');
      }

      const data = await response.json();

      // Instantly populate the UI using pre-calculated backend data
      setStats(data.stats);
      setPendingUsers(data.pendingUsers);
      setVacantHouses(data.vacantHouses);
      setMaintenanceRequests(data.maintenanceRequests);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data');
      setLoading(false);
      console.error('Error:', err);
    }
  };

  const handleOpenApproveDialog = (user) => {
    setSelectedUser(user);
    setFieldErrors({});
    setError('');
    setApprovalData({
      house_id: '',
      move_in_date: new Date().toISOString().split('T')[0],
      contract_start: new Date().toISOString().split('T')[0],
      contract_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    });
    setOpenApproveDialog(true);
  };

  // Prevents the user from accidentally closing the modal while the approval transaction is processing
  const handleCloseApproveDialog = () => {
    if (!approveLoading) {
      setOpenApproveDialog(false);
      setSelectedUser(null);
    }
  };

  const handleApprovalInputChange = (e) => {
    const { name, value } = e.target;
    setApprovalData(prev => ({ ...prev, [name]: value }));

    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleApprove = async () => {
    setFieldErrors({});
    setError('');
    setApproveLoading(true);

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
        setSuccess(`${selectedUser.username} approved and assigned house!`);
        setError('');
        fetchDashboardData();
        handleCloseApproveDialog();
      } else {
        const data = await response.json();
        const { global, fields } = parseBackendErrors(data);
        setError(global || 'Failed to approve user. Please check the form.');
        setFieldErrors(fields);
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error:', err);
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async (userId, username) => {
    const reason = prompt(`Enter reason for rejecting ${username}:`);
    if (!reason) return;

    setRejectLoading(userId);

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
        setSuccess(`${username} rejected successfully`);
        setError('');
        fetchDashboardData();
      } else {
        const data = await response.json();
        const { global } = parseBackendErrors(data);
        setError(global || 'Failed to reject user');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error:', err);
    } finally {
      setRejectLoading(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  // Implements the global reusable brand loader while the dashboard compiles data
  if (loading) {
    return <LogoLoader />;
  }

  const StatCard = ({ icon, title, value, subtitle, color, path }) => (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s',
        '&:hover': path ? { transform: 'scale(1.02)', boxShadow: 6, cursor: 'pointer' } : {}
      }}
    >
      <CardActionArea
        onClick={() => path && navigate(path)}
        disabled={!path}
        sx={{ height: '100%', p: 1 }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Box
              sx={{
                backgroundColor: `${color}.light`,
                borderRadius: 2,
                p: 1,
                mr: 2
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {value}
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Admin Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<HomeIcon sx={{ fontSize: 40, color: 'primary.main' }} />}
            title="Total Houses"
            value={stats.totalHouses}
            subtitle={`${stats.occupiedHouses} Occupied, ${stats.vacantHouses} Vacant`}
            color="primary"
            path="/houses"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PeopleIcon sx={{ fontSize: 40, color: 'success.main' }} />}
            title="Total Tenants"
            value={stats.totalTenants}
            subtitle={`${stats.pendingApprovals} Pending Approvals`}
            color="success"
            path="/tenants"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<BuildIcon sx={{ fontSize: 40, color: 'warning.main' }} />}
            title="Active Requests"
            value={stats.activeMaintenanceRequests}
            subtitle="Maintenance Tasks"
            color="warning"
            path="/maintenance"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AttachMoneyIcon sx={{ fontSize: 40, color: 'info.main' }} />}
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            subtitle="Verified Payments"
            color="info"
            path="/payments"
          />
        </Grid>
      </Grid>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <PeopleIcon sx={{ mr: 1 }} /> Pending Tenant Approvals
            <Chip label={pendingUsers.length} color="error" size="small" sx={{ ml: 2 }} />
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Phone</strong></TableCell>
                  <TableCell><strong>ID Number</strong></TableCell>
                  <TableCell><strong>Email Verified</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {user.first_name} {user.last_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {user.username}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || 'N/A'}</TableCell>
                    <TableCell>{user.id_number || 'N/A'}</TableCell>
                    <TableCell>
                      {user.email_verified ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        <CancelIcon color="disabled" fontSize="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleOpenApproveDialog(user)}
                        sx={{ mr: 1 }}
                        disabled={rejectLoading === user.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleReject(user.id, user.username)}
                        disabled={rejectLoading === user.id}
                      >
                        {rejectLoading === user.id ? <CircularProgress size={20} color="inherit" /> : 'Reject'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Recent Maintenance Requests */}
      {maintenanceRequests.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <BuildIcon sx={{ mr: 1 }} /> Recent Maintenance Requests
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>House</strong></TableCell>
                  <TableCell><strong>Issue</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>Priority</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maintenanceRequests.map((request) => (
                  <TableRow key={request.id} hover>
                    <TableCell>{request.house_number || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 250 }}>
                        {request.issue_description.substring(0, 60)}
                        {request.issue_description.length > 60 ? '...' : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.category.toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.priority.toUpperCase()}
                        color={
                          request.priority === 'high'
                            ? 'error'
                            : request.priority === 'medium'
                            ? 'warning'
                            : 'success'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.status.replace('_', ' ').toUpperCase()}
                        color={
                          request.status === 'new'
                            ? 'error'
                            : request.status === 'in_progress'
                            ? 'primary'
                            : 'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Approval Dialog */}
      <Dialog open={openApproveDialog} onClose={handleCloseApproveDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Tenant & Assign House</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              Approving <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>. 
              Please assign a vacant house.
            </Alert>

            <TextField
              select
              label="Assign House"
              name="house_id"
              value={approvalData.house_id}
              onChange={handleApprovalInputChange}
              fullWidth
              required
              error={!!fieldErrors.house_id}
              helperText={fieldErrors.house_id}
            >
              {vacantHouses.length === 0 ? (
                <MenuItem disabled>No vacant houses available</MenuItem>
              ) : (
                vacantHouses.map((house) => (
                  <MenuItem key={house.id} value={house.id}>
                    {house.house_number} ({house.house_type}) - {formatCurrency(house.rent_amount)}
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
              error={!!fieldErrors.move_in_date}
              helperText={fieldErrors.move_in_date}
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
                  error={!!fieldErrors.contract_start}
                  helperText={fieldErrors.contract_start}
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
                  error={!!fieldErrors.contract_end}
                  helperText={fieldErrors.contract_end}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApproveDialog} disabled={approveLoading}>Cancel</Button>
          <Button
            onClick={handleApprove}
            variant="contained"
            color="success"
            disabled={!approvalData.house_id || approveLoading}
          >
            {approveLoading ? <CircularProgress size={24} color="inherit" /> : 'Approve & Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Dashboard;