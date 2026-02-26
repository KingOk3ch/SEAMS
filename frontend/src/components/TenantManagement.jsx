import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, Alert, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, IconButton, Tabs, Tab,
  Divider, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HomeIcon from '@mui/icons-material/Home';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { parseBackendErrors } from '../utils/errorHandler';

function TenantManagement() {
  const [tenants, setTenants] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTenant, setCurrentTenant] = useState(null);

  const [formData, setFormData] = useState({
    username: '', email: '', password: '',
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

      // --- FIX: Handle Pagination (Extract .results if present) ---
      let tenantsData = await tenantsRes.json();
      if (tenantsData.results) tenantsData = tenantsData.results;

      let housesData = await housesRes.json();
      if (housesData.results) housesData = housesData.results;

      // Ensure we always set arrays to state
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
        password: '',
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
        username: '', email: '', password: '',
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

    try {
      const token = localStorage.getItem('access_token');

      if (editMode) {
        // Update existing tenant
        const updateData = {
          phone: formData.phone,
          id_number: formData.id_number,
          house: formData.house,
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
          setError('');
        } else {
          const data = await response.json();
          const { global, fields } = parseBackendErrors(data);
          setError(global || 'Failed to update tenant. Please check the form.');
          setFieldErrors(fields);
        }
      } else {
        // Create new tenant logic
        const userData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
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
          return;
        }

        const userResult = await userResponse.json();
        const newUserId = userResult.user.id;

        const tenantData = {
          user: newUserId,
          house: formData.house,
          move_in_date: formData.move_in_date,
          contract_start: formData.contract_start,
          contract_end: formData.contract_end,
          status: formData.status
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
          setSuccess(`Tenant created successfully! Temporary password: ${userResult.temporary_password || 'N/A'}`);
          setError('');
        } else {
          const data = await tenantResponse.json();
          const { global, fields } = parseBackendErrors(data);
          setError(global || 'User created but tenant profile failed.');
          setFieldErrors(fields);
        }
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error:', err);
    }
  };

  const handleAssignHouse = async () => {
    setFieldErrors({});
    setError('');

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

  // --- FILTERING LOGIC (Using Optional Chaining to prevent crashes) ---
  const vacantHouses = Array.isArray(houses) ? houses.filter(h => h.status === 'vacant') : [];
  
  const activeTenants = Array.isArray(tenants) ? tenants.filter(t => t.status === 'active') : [];
  const inactiveTenants = Array.isArray(tenants) ? tenants.filter(t => t.status !== 'active') : [];
  
  const displayedTenants = tabValue === 0 ? tenants : tabValue === 1 ? activeTenants : inactiveTenants;

  // FIX: Include the current house in the Edit Dropdown even if it's occupied
  const editHouseOptions = Array.isArray(houses) ? houses.filter(h => 
    h.status === 'vacant' || (editMode && currentTenant && h.id === currentTenant.house)
  ) : [];

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

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
                <TableRow key={tenant.id} hover>
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
                    <IconButton size="small" color="primary" onClick={() => handleOpenDialog(tenant)}><EditIcon /></IconButton>
                    {!tenant.house_number && <IconButton size="small" color="success" onClick={() => handleOpenAssignDialog(tenant)}><HomeIcon /></IconButton>}
                    <IconButton size="small" color="error" onClick={() => handleDelete(tenant.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- MINIMALIST TENANT FORM (VERTICAL RECTANGLE) --- */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            <Alert severity="info" icon={<PersonAddIcon />}>
                {editMode ? 'Update tenant details below' : 'Register a new tenant'}
            </Alert>

            {/* Personal Details */}
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
            
            {!editMode && (
                <TextField label="Password" name="password" type="password" value={formData.password} onChange={handleInputChange} fullWidth required error={!!fieldErrors.password} helperText={fieldErrors.password} />
            )}

            <TextField label="Phone Number" name="phone" value={formData.phone} onChange={handleInputChange} fullWidth error={!!fieldErrors.phone} helperText={fieldErrors.phone} />
            
            {/* LOCKED ID FIELD */}
            <TextField 
                label="ID Number" 
                name="id_number" 
                value={formData.id_number} 
                onChange={handleInputChange} 
                fullWidth 
                required 
                disabled={editMode} // <--- LOCKED IN EDIT MODE
                error={!!fieldErrors.id_number} 
                helperText={fieldErrors.id_number} 
            />

            <Divider sx={{ my: 1 }} />

            {/* Housing Details */}
            <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ letterSpacing: 1 }}>LEASE DETAILS</Typography>
            
            {/* FIX: Using editHouseOptions here ensures the current house is selectable */}
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

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">{editMode ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* Assign House Dialog */}
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
          <Button onClick={handleCloseAssignDialog}>Cancel</Button>
          <Button onClick={handleAssignHouse} variant="contained" color="success" disabled={!assignData.house}>Assign House</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TenantManagement;