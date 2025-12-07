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
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';

function ContractManagement() {
  const [contracts, setContracts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentContract, setCurrentContract] = useState(null);
  const [formData, setFormData] = useState({
    tenant: '',
    house: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    deposit_paid: '',
    terms: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      const contractsResponse = await fetch('http://localhost:8000/api/contracts/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const contractsData = await contractsResponse.json();
      setContracts(contractsData);

      const tenantsResponse = await fetch('http://localhost:8000/api/tenants/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tenantsData = await tenantsResponse.json();
      setTenants(tenantsData);

      const housesResponse = await fetch('http://localhost:8000/api/houses/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const housesData = await housesResponse.json();
      setHouses(housesData);

      setLoading(false);
    } catch (err) {
      setError('Connection error');
      setLoading(false);
      console.error('Error:', err);
    }
  };

  const handleOpenDialog = (contract = null) => {
    if (contract) {
      setEditMode(true);
      setCurrentContract(contract);
      setFormData({
        tenant: contract.tenant,
        house: contract.house,
        start_date: contract.start_date,
        end_date: contract.end_date,
        monthly_rent: contract.monthly_rent,
        deposit_paid: contract.deposit_paid,
        terms: contract.terms || ''
      });
    } else {
      setEditMode(false);
      setCurrentContract(null);
      const today = new Date().toISOString().split('T')[0];
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const endDate = oneYearLater.toISOString().split('T')[0];

      setFormData({
        tenant: '',
        house: '',
        start_date: today,
        end_date: endDate,
        monthly_rent: '',
        deposit_paid: '',
        terms: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentContract(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTenantChange = (e) => {
    const tenantId = e.target.value;
    setFormData(prev => ({ ...prev, tenant: tenantId }));

    // Auto-fill house and rent when tenant is selected
    const selectedTenant = tenants.find(t => t.id === tenantId);
    if (selectedTenant) {
      const selectedHouse = houses.find(h => h.id === selectedTenant.house);
      setFormData(prev => ({
        ...prev,
        house: selectedTenant.house,
        monthly_rent: selectedHouse?.rent_amount || '',
        deposit_paid: selectedHouse ? selectedHouse.rent_amount * 2 : ''
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const url = editMode 
        ? `http://localhost:8000/api/contracts/${currentContract.id}/`
        : 'http://localhost:8000/api/contracts/';
      
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchData();
        handleCloseDialog();
        setSuccess(editMode ? 'Contract updated successfully' : 'Contract created successfully');
        setError('');
      } else {
        const data = await response.json();
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Failed to save contract');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (contractId) => {
    if (!window.confirm('Are you sure you want to delete this contract?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/contracts/${contractId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchData();
        setSuccess('Contract deleted successfully');
        setError('');
      } else {
        setError('Failed to delete contract');
      }
    } catch (err) {
      setError('Failed to delete contract');
      console.error('Error:', err);
    }
  };

  const getContractStatus = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { label: 'EXPIRED', color: 'error' };
    if (daysLeft <= 30) return { label: 'EXPIRING SOON', color: 'warning' };
    return { label: 'ACTIVE', color: 'success' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
    return `${months} months`;
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
            Contract Management
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Contract
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Total Contracts: {contracts.length} | Active: {contracts.filter(c => getContractStatus(c.end_date).label === 'ACTIVE').length}
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
              <TableCell><strong>Tenant</strong></TableCell>
              <TableCell><strong>House</strong></TableCell>
              <TableCell><strong>Start Date</strong></TableCell>
              <TableCell><strong>End Date</strong></TableCell>
              <TableCell><strong>Duration</strong></TableCell>
              <TableCell><strong>Monthly Rent</strong></TableCell>
              <TableCell><strong>Deposit</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No contracts found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => {
                const status = getContractStatus(contract.end_date);
                return (
                  <TableRow key={contract.id} hover>
                    <TableCell>{contract.tenant_name}</TableCell>
                    <TableCell>{contract.house_number}</TableCell>
                    <TableCell>{formatDate(contract.start_date)}</TableCell>
                    <TableCell>{formatDate(contract.end_date)}</TableCell>
                    <TableCell>{calculateDuration(contract.start_date, contract.end_date)}</TableCell>
                    <TableCell><strong>{formatCurrency(contract.monthly_rent)}</strong></TableCell>
                    <TableCell>{formatCurrency(contract.deposit_paid)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={status.label} 
                        color={status.color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleOpenDialog(contract)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDelete(contract.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Contract' : 'Create New Contract'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Tenant"
                  name="tenant"
                  value={formData.tenant}
                  onChange={handleTenantChange}
                  required
                  fullWidth
                  disabled={editMode}
                >
                  {tenants.map((tenant) => (
                    <MenuItem key={tenant.id} value={tenant.id}>
                      {tenant.user.first_name} {tenant.user.last_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="House"
                  name="house"
                  value={formData.house}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  disabled={editMode}
                >
                  {houses.map((house) => (
                    <MenuItem key={house.id} value={house.id}>
                      {house.house_number} - {house.house_type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="End Date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Monthly Rent"
                  name="monthly_rent"
                  type="number"
                  value={formData.monthly_rent}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Amount in KES"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Deposit Paid"
                  name="deposit_paid"
                  type="number"
                  value={formData.deposit_paid}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Amount in KES"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Contract Terms"
                  name="terms"
                  value={formData.terms}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  fullWidth
                  helperText="Additional terms and conditions (optional)"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Update' : 'Create Contract'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ContractManagement;