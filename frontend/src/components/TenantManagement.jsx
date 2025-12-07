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
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function TenantManagement() {
  const [tenants, setTenants] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
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
    move_in_date: '',
    contract_start: '',
    contract_end: '',
    status: 'active'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      const tenantsResponse = await fetch('http://localhost:8000/api/tenants/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tenantsData = await tenantsResponse.json();
      setTenants(tenantsData);

      const housesResponse = await fetch('http://localhost:8000/api/houses/vacant/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const housesData = await housesResponse.json();
      setHouses(housesData);

      if (housesData.length === 0) {
        setError('No vacant houses available. Please add more houses or mark existing ones as vacant.');
      }

      setLoading(false);
    } catch (err) {
      setError('Connection error');
      setLoading(false);
      console.error('Error:', err);
    }
  };

  const handleOpenDialog = (tenant = null) => {
    if (tenant) {
      setEditMode(true);
      setCurrentTenant(tenant);
      setFormData({
        username: tenant.user.username,
        email: tenant.user.email,
        password: '',
        first_name: tenant.user.first_name,
        last_name: tenant.user.last_name,
        phone: tenant.user.phone,
        id_number: tenant.user.id_number,
        house: tenant.house,
        move_in_date: tenant.move_in_date,
        contract_start: tenant.contract_start,
        contract_end: tenant.contract_end,
        status: tenant.status
      });
    } else {
      setEditMode(false);
      setCurrentTenant(null);
      const today = new Date().toISOString().split('T')[0];
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const contractEnd = oneYearLater.toISOString().split('T')[0];

      setFormData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        id_number: '',
        house: '',
        move_in_date: today,
        contract_start: today,
        contract_end: contractEnd,
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (editMode) {
        const tenantUpdateData = {
          user_id: currentTenant.user.id,
          house: formData.house,
          move_in_date: formData.move_in_date,
          contract_start: formData.contract_start,
          contract_end: formData.contract_end,
          emergency_contact: '',
          emergency_phone: '',
          status: formData.status
        };

        const response = await fetch(`http://localhost:8000/api/tenants/${currentTenant.id}/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tenantUpdateData)
        });

        if (response.ok) {
          fetchData();
          handleCloseDialog();
          setSuccess('Tenant updated successfully');
          setError('');
        } else {
          const data = await response.json();
          setError(JSON.stringify(data));
        }
      } else {
        const userResponse = await fetch('http://localhost:8000/api/users/register/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
            id_number: formData.id_number,
            role: 'tenant'
          })
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          const tenantResponse = await fetch('http://localhost:8000/api/tenants/', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: userData.user.id,
              house: formData.house,
              move_in_date: formData.move_in_date,
              contract_start: formData.contract_start,
              contract_end: formData.contract_end,
              emergency_contact: '',
              emergency_phone: '',
              status: formData.status
            })
          });

          if (tenantResponse.ok) {
            fetchData();
            handleCloseDialog();
            setSuccess('New tenant added successfully');
            setError('');
          } else {
            const data = await tenantResponse.json();
            setError('Tenant creation failed: ' + JSON.stringify(data));
          }
        } else {
          const data = await userResponse.json();
          setError('User creation failed: ' + JSON.stringify(data));
        }
      }
    } catch (err) {
      setError('Failed to save tenant');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (tenantId) => {
    if (!window.confirm('Are you sure you want to remove this tenant?')) {
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
        setSuccess('Tenant removed successfully');
        setError('');
      } else {
        setError('Failed to remove tenant');
      }
    } catch (err) {
      setError('Failed to remove tenant');
      console.error('Error:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'expiring': return 'warning';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
        <Typography variant="body2" color="text.secondary">
          Total Tenants: {tenants.length}
        </Typography>
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
              <TableCell><strong>House Number</strong></TableCell>
              <TableCell><strong>Move-in Date</strong></TableCell>
              <TableCell><strong>Contract End</strong></TableCell>
              <TableCell><strong>Phone</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id} hover>
                <TableCell>
                  {tenant.user.first_name} {tenant.user.last_name}
                </TableCell>
                <TableCell>{tenant.house_number}</TableCell>
                <TableCell>{formatDate(tenant.move_in_date)}</TableCell>
                <TableCell>{formatDate(tenant.contract_end)}</TableCell>
                <TableCell>{tenant.user.phone}</TableCell>
                <TableCell>
                  <Chip 
                    label={tenant.status.toUpperCase()} 
                    color={getStatusColor(tenant.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleOpenDialog(tenant)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDelete(tenant.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Tenant' : 'Add New Tenant'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {!editMode && (
              <>
                <Typography variant="h6" gutterBottom color="primary">
                  Personal Information
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="First Name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Last Name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="ID Number"
                      name="id_number"
                      value={formData.id_number}
                      onChange={handleInputChange}
                      required
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </>
            )}

            <Typography variant="h6" gutterBottom color="primary">
              Tenancy Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  label="House"
                  name="house"
                  value={formData.house}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  helperText={houses.length === 0 ? "No vacant houses available" : "Select a vacant house"}
                >
                  {houses.map((house) => (
                    <MenuItem key={house.id} value={house.id}>
                      {house.house_number} - {house.house_type} (KSH {house.rent_amount})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Move-in Date"
                  name="move_in_date"
                  type="date"
                  value={formData.move_in_date}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Contract Start"
                  name="contract_start"
                  type="date"
                  value={formData.contract_start}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Contract End"
                  name="contract_end"
                  type="date"
                  value={formData.contract_end}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  fullWidth
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="expiring">Expiring</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={houses.length === 0}>
            {editMode ? 'Update' : 'Add Tenant'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TenantManagement;