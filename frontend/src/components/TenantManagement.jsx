import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, Alert, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, IconButton, Tabs, Tab,
  Divider, Grid, Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HomeIcon from '@mui/icons-material/Home';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { parseBackendErrors } from '../utils/errorHandler';
import logoImage from '../assets/seamslogo.png';

function TenantManagement() {
  const [tenants, setTenants] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const [fieldErrors, setFieldErrors] = useState({});

  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTenant, setCurrentTenant] = useState(null);

  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [profileBills, setProfileBills] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [remindLoading, setRemindLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const [formData, setFormData] = useState({
    username: '', email: '',
    first_name: '', last_name: '', phone: '', id_number: '',
    house: '',
    move_in_date: new Date().toISOString().split('T')[0],
    contract_start: new Date().toISOString().split('T')[0],
    contract_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'active'
  });

  const [assignData, setAssignData] = useState({
    house: '',
    move_in_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [tenantsRes, housesRes] = await Promise.all([
        fetch('http://localhost:8000/api/tenants/', { headers }),
        fetch('http://localhost:8000/api/houses/', { headers })
      ]);

      let tenantsData = await tenantsRes.json();
      if (tenantsData.results) tenantsData = tenantsData.results;

      let housesData = await housesRes.json();
      if (housesData.results) housesData = housesData.results;

      setTenants(Array.isArray(tenantsData) ? tenantsData : []);
      setHouses(Array.isArray(housesData) ? housesData : []);
      
      setLoading(false);
    } catch (err) {
      setError('Connection error');
      setLoading(false);
      console.error('Error:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Retrieves the selected tenant's financial ledger by filtering out paid bills.
  // This ensures the admin sees an accurate, real-time reflection of outstanding debt.
  const handleOpenProfile = async (tenant) => {
    setProfileData(tenant);
    setProfileLoading(true);
    setOpenProfileDialog(true);
    setCustomMessage('');
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/bills/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let data = await res.json();
      if(data.results) data = data.results;
      
      const tBills = data.filter(b => b.tenant === tenant.id && !b.is_paid);
      setProfileBills(tBills);
    } catch (err) {
      console.error("Failed to fetch tenant ledger:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Dispatches a notification to the tenant's dashboard. 
  // It passes the custom message if provided; otherwise, the backend defaults to calculating the financial debt.
  const handleSendReminder = async () => {
    setRemindLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/tenants/${profileData.id}/remind_debtor/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: customMessage })
      });
      
      const data = await res.json();
      if(res.ok) {
        setSuccess(data.message || 'Notification sent successfully!');
        setOpenProfileDialog(false);
      } else {
        setError(data.message || 'Failed to send notification.');
      }
    } catch (err) {
      setError('Network error occurred while trying to send notification.');
    } finally {
      setRemindLoading(false);
    }
  };

  const handleOpenDialog = (tenant = null) => {
    setFieldErrors({}); 
    setError('');
    setSuccess('');

    if (tenant) {
      setEditMode(true);
      setCurrentTenant(tenant);
      setFormData({
        username: tenant.user.username,
        email: tenant.user.email || '',
        first_name: tenant.user.first_name,
        last_name: tenant.user.last_name,
        phone: tenant.user.phone || '',
        id_number: tenant.user.id_number || '',
        house: tenant.house || '', 
        move_in_date: tenant.move_in_date || new Date().toISOString().split('T')[0],
        contract_start: tenant.contract_start || new Date().toISOString().split('T')[0],
        contract_end: tenant.contract_end || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        status: tenant.status || 'active'
      });
    } else {
      setEditMode(false);
      setCurrentTenant(null);
      setFormData({
        username: '', email: '',
        first_name: '', last_name: '', phone: '', id_number: '',
        house: '',
        move_in_date: new Date().toISOString().split('T')[0],
        contract_start: new Date().toISOString().split('T')[0],
        contract_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        status: 'active'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentTenant(null);
  };

  const handleOpenAssignDialog = (tenant) => {
    setCurrentTenant(tenant);
    setFieldErrors({});
    setError('');
    setAssignData({
      house: '',
      move_in_date: new Date().toISOString().split('T')[0]
    });
    setOpenAssignDialog(true);
  };

  const handleCloseAssignDialog = () => {
    setOpenAssignDialog(false);
    setCurrentTenant(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAssignInputChange = (e) => {
    const { name, value } = e.target;
    setAssignData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    setError('');
    setSubmitLoading(true);

    try {
      const token = localStorage.getItem('access_token');

      if (editMode) {
        const updateData = {
          phone: formData.phone,
          id_number: formData.id_number,
          house: formData.house || null,
          move_in_date: formData.move_in_date,
          contract_start: formData.contract_start,
          contract_end: formData.contract_end,
          status: formData.status
        };

        const response = await fetch(`http://localhost:8000/api/tenants/${currentTenant.id}/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          fetchData();
          handleCloseDialog();
          setSuccess('Tenant updated successfully');
        } else {
          const data = await response.json();
          const { global, fields } = parseBackendErrors(data);
          setError(global || 'Failed to update tenant. Please check the form.');
          setFieldErrors(fields);
        }
      } else {
        const userData = {
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: 'tenant',
          phone: formData.phone,
          id_number: formData.id_number
        };

        const userResponse = await fetch('http://localhost:8000/api/users/register/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });

        if (!userResponse.ok) {
          const data = await userResponse.json();
          const { global, fields } = parseBackendErrors(data);
          setError(global || 'Failed to create user account.');
          setFieldErrors(fields);
          setSubmitLoading(false);
          return;
        }

        const userResult = await userResponse.json();
        const newUserId = userResult.user.id;

        const tenantData = {
          user_id: newUserId, 
          house: null,
          move_in_date: formData.move_in_date, 
          contract_start: formData.contract_start,
          contract_end: formData.contract_end,
          status: 'inactive' 
        };

        const tenantResponse = await fetch('http://localhost:8000/api/tenants/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(tenantData)
        });

        if (tenantResponse.ok) {
          fetchData();
          handleCloseDialog();
          setSuccess(`Tenant created successfully! Go to User Management to Approve & Assign House.`);
        } else {
          const data = await tenantResponse.json();
          const { global, fields } = parseBackendErrors(data);
          setError(global || 'User created but tenant profile failed. Check the backend logs.');
          setFieldErrors(fields);
        }
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAssignHouse = async () => {
    setFieldErrors({});
    setError('');
    setAssignLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/tenants/${currentTenant.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignData)
      });

      if (response.ok) {
        fetchData();
        handleCloseAssignDialog();
        setSuccess('House assigned successfully');
        setError('');
      } else {
        const data = await response.json();
        const { global, fields } = parseBackendErrors(data);
        setError(global || 'Failed to assign house.');
        setFieldErrors(fields);
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error:', err);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDelete = async (tenantId) => {
    if (!window.confirm('Are you sure you want to delete this tenant?')) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/tenants/${tenantId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) { fetchData(); setSuccess('Tenant deleted successfully'); setError(''); } 
      else { const data = await response.json(); const { global } = parseBackendErrors(data); setError(global || 'Failed to delete tenant'); }
    } catch (err) { setError('Network error occurred'); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'suspended': return 'warning';
      default: return 'default';
    }
  };

  const vacantHouses = Array.isArray(houses) ? houses.filter(h => h.status === 'vacant') : [];
  
  const activeTenants = Array.isArray(tenants) ? tenants.filter(t => t.status === 'active') : [];
  const inactiveTenants = Array.isArray(tenants) ? tenants.filter(t => t.status !== 'active') : [];
  
  const displayedTenants = tabValue === 0 ? tenants : tabValue === 1 ? activeTenants : inactiveTenants;

  const editHouseOptions = Array.isArray(houses) ? houses.filter(h => 
    h.status === 'vacant' || (editMode && currentTenant && h.id === currentTenant.house)
  ) : [];

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Box
          component="img"
          src={logoImage}
          alt="Loading SEAMS..."
          sx={{
            width: 150,
            animation: 'pulse 1.5s infinite ease-in-out',
            '@keyframes pulse': {
              '0%': { transform: 'scale(0.95)', opacity: 0.7 },
              '50%': { transform: 'scale(1.05)', opacity: 1 },
              '100%': { transform: 'scale(0.95)', opacity: 0.7 },
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>Tenant Management</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Add Tenant</Button>
        </Box>
        <Paper sx={{ mt: 2, mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary">
            <Tab label={`All Tenants (${tenants.length})`} />
            <Tab label={`Active (${activeTenants.length})`} />
            <Tab label={`Inactive (${inactiveTenants.length})`} />
          </Tabs>
        </Paper>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Phone</strong></TableCell>
              <TableCell><strong>ID Number</strong></TableCell>
              <TableCell><strong>House</strong></TableCell>
              <TableCell><strong>Move-in</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Verified</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedTenants.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>No tenants found</Typography></TableCell></TableRow>
            ) : (
              displayedTenants.map((tenant) => (
                <TableRow 
                  key={tenant.id} 
                  hover 
                  onClick={() => handleOpenProfile(tenant)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">{tenant.user.first_name} {tenant.user.last_name}</Typography>
                    <Typography variant="caption" color="textSecondary">{tenant.user.email}</Typography>
                  </TableCell>
                  <TableCell>{tenant.user.phone || 'N/A'}</TableCell>
                  <TableCell>{tenant.user.id_number || 'N/A'}</TableCell>
                  <TableCell>
                    {tenant.house_number ? <Chip label={tenant.house_number} size="small" color="primary" variant="outlined" /> : <Chip label="No House" size="small" color="error" variant="outlined" />}
                  </TableCell>
                  <TableCell>{tenant.move_in_date ? new Date(tenant.move_in_date).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell><Chip label={tenant.status.toUpperCase()} color={getStatusColor(tenant.status)} size="small" /></TableCell>
                  <TableCell>{tenant.user.email_verified ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="disabled" fontSize="small" />}</TableCell>
                  <TableCell>
                    {/* e.stopPropagation() prevents the row's profile dialog from opening when interacting with these action buttons */}
                    <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleOpenDialog(tenant); }} title="Edit Tenant">
                      <EditIcon />
                    </IconButton>
                    {!tenant.house_number && (
                      <IconButton size="small" color="success" onClick={(e) => { e.stopPropagation(); handleOpenAssignDialog(tenant); }} title="Assign House">
                        <HomeIcon />
                      </IconButton>
                    )}
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(tenant.id); }} title="Delete Tenant">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openProfileDialog} onClose={() => setOpenProfileDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #eee', pb: 2, pt: 3 }}>
          {profileData && (
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                {profileData.user.first_name[0]}{profileData.user.last_name[0]}
              </Avatar>
              <Box flexGrow={1}>
                <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
                  {profileData.user.first_name} {profileData.user.last_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {profileData.user.email}
                </Typography>
              </Box>
              <Chip label={profileData.status.toUpperCase()} color={getStatusColor(profileData.status)} />
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ mt: 2, p: 3 }}>
          {profileLoading || !profileData ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
          ) : (
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="textSecondary" fontWeight="bold">Lease Details</Typography>
                <Box display="flex" flexDirection="column" gap={1.5} mt={1}>
                  <Typography variant="body2"><strong>Phone:</strong> {profileData.user.phone || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>ID:</strong> {profileData.user.id_number || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>House:</strong> {profileData.house_number || 'Not Assigned'}</Typography>
                  <Typography variant="body2"><strong>Move-in:</strong> {profileData.move_in_date ? new Date(profileData.move_in_date).toLocaleDateString() : 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Lease Ends:</strong> {profileData.contract_end ? new Date(profileData.contract_end).toLocaleDateString() : 'N/A'}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="overline" color="textSecondary" fontWeight="bold">Financials</Typography>
                <Box 
                  sx={{ 
                    mt: 1, 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: profileBills.length > 0 ? '#ffebee' : '#e8f5e9',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '130px'
                  }}
                >
                  <Typography variant="body2" color="textSecondary" gutterBottom>Outstanding Balance</Typography>
                  {profileBills.length === 0 ? (
                    <Typography variant="h4" color="success.main" fontWeight="bold">KES 0.00</Typography>
                  ) : (
                    <>
                      <Typography variant="h4" color="error.main" fontWeight="bold">
                        {/* Iterates through all unpaid bills and aggregates the remaining balances specifically */}
                        {formatCurrency(profileBills.reduce((sum, b) => sum + (parseFloat(b.amount) - parseFloat(b.amount_paid || 0)), 0))}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">Across {profileBills.length} unpaid bill(s)</Typography>
                    </>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ mb: 3 }} />
                <TextField
                  label="Custom Notification Message (Optional)"
                  multiline
                  rows={2}
                  fullWidth
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type a custom message, or leave blank to send the financial reminder."
                  variant="outlined"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { borderRadius: 2 },
                    bgcolor: '#f8f9fa' 
                  }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
          <Button onClick={() => setOpenProfileDialog(false)} color="inherit">Close</Button>
          <Button 
            variant="contained" 
            color="warning" 
            startIcon={<NotificationsActiveIcon />}
            onClick={handleSendReminder}
            disabled={remindLoading || (profileBills.length === 0 && customMessage.trim() === '')}
            sx={{ borderRadius: 2 }}
          >
            {remindLoading ? "Sending..." : (customMessage.trim() ? "Send Custom Note" : "Send Reminder Ping")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            <Alert severity="info" icon={<PersonAddIcon />}>
                {editMode ? 'Update tenant details below' : 'Register a new tenant. Password will be auto-generated and emailed.'}
            </Alert>

            <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mt: 1, letterSpacing: 1 }}>ACCOUNT & CONTACT</Typography>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <TextField label="First Name" name="first_name" value={formData.first_name} onChange={handleInputChange} fullWidth required disabled={editMode} error={!!fieldErrors.first_name} helperText={fieldErrors.first_name} />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="Last Name" name="last_name" value={formData.last_name} onChange={handleInputChange} fullWidth required disabled={editMode} error={!!fieldErrors.last_name} helperText={fieldErrors.last_name} />
                </Grid>
            </Grid>

            {!editMode && (
                <TextField label="Username" name="username" value={formData.username} onChange={handleInputChange} fullWidth required error={!!fieldErrors.username} helperText={fieldErrors.username} />
            )}
            
            <TextField label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} fullWidth required error={!!fieldErrors.email} helperText={fieldErrors.email} />

            <TextField label="Phone Number" name="phone" value={formData.phone} onChange={handleInputChange} fullWidth error={!!fieldErrors.phone} helperText={fieldErrors.phone} />
            
            <TextField 
                label="ID Number" 
                name="id_number" 
                value={formData.id_number} 
                onChange={handleInputChange} 
                fullWidth 
                required 
                disabled={editMode} 
                error={!!fieldErrors.id_number} 
                helperText={fieldErrors.id_number} 
            />

            {editMode && (
                <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ letterSpacing: 1 }}>LEASE DETAILS</Typography>
                    
                    <TextField 
                        select 
                        label="Assigned House" 
                        name="house" 
                        value={formData.house} 
                        onChange={handleInputChange} 
                        fullWidth 
                        error={!!fieldErrors.house} 
                        helperText={fieldErrors.house || "Select a house"}
                    >
                        <MenuItem value="">None</MenuItem>
                        {editHouseOptions.map((house) => (
                            <MenuItem key={house.id} value={house.id}>
                                {house.house_number} - {house.house_type} (KES {house.rent_amount})
                            </MenuItem>
                        ))}
                    </TextField>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField label="Move-in Date" name="move_in_date" type="date" value={formData.move_in_date} onChange={handleInputChange} fullWidth InputLabelProps={{ shrink: true }} error={!!fieldErrors.move_in_date} helperText={fieldErrors.move_in_date} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField select label="Status" name="status" value={formData.status} onChange={handleInputChange} fullWidth error={!!fieldErrors.status} helperText={fieldErrors.status}>
                                <MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem><MenuItem value="suspended">Suspended</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField label="Contract Start" name="contract_start" type="date" value={formData.contract_start} onChange={handleInputChange} fullWidth InputLabelProps={{ shrink: true }} error={!!fieldErrors.contract_start} helperText={fieldErrors.contract_start} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField label="Contract End" name="contract_end" type="date" value={formData.contract_end} onChange={handleInputChange} fullWidth InputLabelProps={{ shrink: true }} error={!!fieldErrors.contract_end} helperText={fieldErrors.contract_end} />
                        </Grid>
                    </Grid>
                </>
            )}

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitLoading}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitLoading}>
            {submitLoading ? <CircularProgress size={24} color="inherit" /> : (editMode ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAssignDialog} onClose={handleCloseAssignDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Assign House</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">Assigning house to <strong>{currentTenant?.user.first_name} {currentTenant?.user.last_name}</strong></Alert>
            <TextField select label="Select House" name="house" value={assignData.house} onChange={handleAssignInputChange} fullWidth required error={!!fieldErrors.house} helperText={fieldErrors.house}>
              {vacantHouses.length === 0 ? <MenuItem disabled>No vacant houses available</MenuItem> : vacantHouses.map((house) => <MenuItem key={house.id} value={house.id}>{house.house_number} - {house.house_type} (KES {house.rent_amount})</MenuItem>)}
            </TextField>
            <TextField label="Move-in Date" name="move_in_date" type="date" value={assignData.move_in_date} onChange={handleAssignInputChange} fullWidth InputLabelProps={{ shrink: true }} error={!!fieldErrors.move_in_date} helperText={fieldErrors.move_in_date} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignDialog} disabled={assignLoading}>Cancel</Button>
          <Button onClick={handleAssignHouse} variant="contained" color="success" disabled={!assignData.house || assignLoading}>
            {assignLoading ? <CircularProgress size={24} color="inherit" /> : 'Assign House'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TenantManagement;