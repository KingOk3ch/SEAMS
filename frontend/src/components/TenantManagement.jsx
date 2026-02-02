import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HomeIcon from '@mui/icons-material/Home';
import { parseBackendErrors } from '../utils/errorHandler'; // NEW IMPORT

function TenantManagement() {
  const [tenants, setTenants] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // NEW: Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTenant, setCurrentTenant] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    id_number: '',
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

      const tenantsData = await tenantsRes.json();
      const housesData = await housesRes.json();

      setTenants(tenantsData);
      setHouses(housesData);
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
    setFieldErrors({}); // Clear errors
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
        phone: tenant.phone || '',
        id_number: tenant.id_number || '',
        house: tenant.house,
        move_in_date: tenant.move_in_date || new Date().toISOString().split('T')[0],
        contract_start: tenant.contract_start || new Date().toISOString().split('T')[0],
        contract_end: tenant.contract_end || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        status: tenant.status || 'active'
      });
    } else {
      setEditMode(false);
      setCurrentTenant(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        id_number: '',
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

    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAssignInputChange = (e) => {
    const { name, value } = e.target;
    setAssignData(prev => ({ ...prev, [name]: value }));

    // Clear field error when user types
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
        // Create new tenant - TWO STEP PROCESS
        // Step 1: Create User
        const userData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: 'tenant'
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
          setError(global || 'Failed to create user account. Please check the form.');
          setFieldErrors(fields);
          return;
        }

        const userResult = await userResponse.json();
        const newUserId = userResult.user.id;

        // Step 2: Create Tenant Profile
        const tenantData = {
          user: newUserId,
          phone: formData.phone,
          id_number: formData.id_number,
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
          setError(global || 'User created but tenant profile failed. Please check the form.');
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
        setError(global || 'Failed to assign house. Please check the form.');
        setFieldErrors(fields);
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (tenantId) => {
    if (!window.confirm('Are you sure you want to delete this tenant?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/tenants/${tenantId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchData();
        setSuccess('Tenant deleted successfully');
        setError('');
      } else {
        const data = await response.json();
        const { global } = parseBackendErrors(data);
        setError(global || 'Failed to delete tenant');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'suspended': return 'warning';
      default: return 'default';
    }
  };

  const vacantHouses = houses.filter(h => h.status === 'vacant');
  const activeTenants = tenants.filter(t => t.status === 'active');
  const inactiveTenants = tenants.filter(t => t.status !== 'active');

  const displayedTenants = tabValue === 0 ? tenants : tabValue === 1 ? activeTenants : inactiveTenants;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>
            Tenant Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Tenant
          </Button>
        </Box>

        <Paper sx={{ mt: 2, mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary">
            <Tab label={`All Tenants (${tenants.length})`} />
            <Tab label={`Active (${activeTenants.length})`} />
            <Tab label={`Inactive (${inactiveTenants.length})`} />
          </Tabs>
        </Paper>
      </Box>

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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Phone</strong></TableCell>
              <TableCell><strong>ID Number</strong></TableCell>
              <TableCell><strong>House</strong></TableCell>
              <TableCell><strong>Move-in Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Email Verified</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedTenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No tenants found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedTenants.map((tenant) => (
                <TableRow key={tenant.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {tenant.user.first_name} {tenant.user.last_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {tenant.user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>{tenant.phone || 'N/A'}</TableCell>
                  <TableCell>{tenant.id_number || 'N/A'}</TableCell>
                  <TableCell>
                    {tenant.house_number ? (
                      <Chip
                        label={tenant.house_number}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Chip label="No House" size="small" color="error" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    {tenant.move_in_date
                      ? new Date(tenant.move_in_date).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tenant.status.toUpperCase()}
                      color={getStatusColor(tenant.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {tenant.user.email_verified ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <CancelIcon color="disabled" fontSize="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(tenant)}
                    >
                      <EditIcon />
                    </IconButton>
                    {!tenant.house_number && (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleOpenAssignDialog(tenant)}
                      >
                        <HomeIcon />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(tenant.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Tenant Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {!editMode && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      fullWidth
                      required
                      error={!!fieldErrors.username}
                      helperText={fieldErrors.username}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      fullWidth
                      required
                      error={!!fieldErrors.email}
                      helperText={fieldErrors.email}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      fullWidth
                      required
                      error={!!fieldErrors.password}
                      helperText={fieldErrors.password}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  disabled={editMode}
                  error={!!fieldErrors.first_name}
                  helperText={fieldErrors.first_name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  disabled={editMode}
                  error={!!fieldErrors.last_name}
                  helperText={fieldErrors.last_name}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  fullWidth
                  error={!!fieldErrors.phone}
                  helperText={fieldErrors.phone}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="ID Number"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleInputChange}
                  fullWidth
                  error={!!fieldErrors.id_number}
                  helperText={fieldErrors.id_number}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="House"
                  name="house"
                  value={formData.house}
                  onChange={handleInputChange}
                  fullWidth
                  error={!!fieldErrors.house}
                  helperText={fieldErrors.house || "Select a house"}
                >
                  <MenuItem value="">None</MenuItem>
                  {vacantHouses.map((house) => (
                    <MenuItem key={house.id} value={house.id}>
                      {house.house_number} - {house.house_type} (KES {house.rent_amount})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Move-in Date"
                  name="move_in_date"
                  type="date"
                  value={formData.move_in_date}
                  onChange={handleInputChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={!!fieldErrors.move_in_date}
                  helperText={fieldErrors.move_in_date}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Contract Start"
                  name="contract_start"
                  type="date"
                  value={formData.contract_start}
                  onChange={handleInputChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={!!fieldErrors.contract_start}
                  helperText={fieldErrors.contract_start}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Contract End"
                  name="contract_end"
                  type="date"
                  value={formData.contract_end}
                  onChange={handleInputChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={!!fieldErrors.contract_end}
                  helperText={fieldErrors.contract_end}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  select
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  fullWidth
                  error={!!fieldErrors.status}
                  helperText={fieldErrors.status}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign House Dialog */}
      <Dialog open={openAssignDialog} onClose={handleCloseAssignDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Assign House</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              Assigning house to <strong>{currentTenant?.user.first_name} {currentTenant?.user.last_name}</strong>
            </Alert>
            <TextField
              select
              label="Select House"
              name="house"
              value={assignData.house}
              onChange={handleAssignInputChange}
              fullWidth
              required
              error={!!fieldErrors.house}
              helperText={fieldErrors.house}
            >
              {vacantHouses.length === 0 ? (
                <MenuItem disabled>No vacant houses available</MenuItem>
              ) : (
                vacantHouses.map((house) => (
                  <MenuItem key={house.id} value={house.id}>
                    {house.house_number} - {house.house_type} (KES {house.rent_amount})
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              label="Move-in Date"
              name="move_in_date"
              type="date"
              value={assignData.move_in_date}
              onChange={handleAssignInputChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!fieldErrors.move_in_date}
              helperText={fieldErrors.move_in_date}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignDialog}>Cancel</Button>
          <Button
            onClick={handleAssignHouse}
            variant="contained"
            color="success"
            disabled={!assignData.house}
          >
            Assign House
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TenantManagement;