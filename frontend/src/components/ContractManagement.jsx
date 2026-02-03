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
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ArticleIcon from '@mui/icons-material/Article';
import { parseBackendErrors } from '../utils/errorHandler';

const DEFAULT_TERMS = `1. Rent Payment: Rent is due on or before the 5th of every month.
2. Security Deposit: Refundable upon vacating, minus cost of repairs/unpaid bills.
3. Utilities: Tenant pays for electricity (Token) and Water bill.
4. Maintenance: Tenant keeps interior clean; Landlord handles structural repairs.
5. Notice: One month written notice required before vacating.
6. Conduct: No noise pollution or illegal activities allowed.`;

function ContractManagement() {
  const [contracts, setContracts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0); 

  const [fieldErrors, setFieldErrors] = useState({});

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
      const headers = { 'Authorization': `Bearer ${token}` };

      const [contractsRes, tenantsRes, housesRes] = await Promise.all([
        fetch('http://localhost:8000/api/contracts/', { headers }),
        fetch('http://localhost:8000/api/tenants/', { headers }),
        fetch('http://localhost:8000/api/houses/', { headers })
      ]);

      setContracts(await contractsRes.json());
      setTenants(await tenantsRes.json());
      setHouses(await housesRes.json());
      setLoading(false);
    } catch (err) {
      setError('Connection error');
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (contract = null) => {
    setFieldErrors({}); 
    setError('');
    setSuccess('');

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
        terms: contract.terms || DEFAULT_TERMS 
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
        terms: DEFAULT_TERMS 
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
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  // --- NEW: Handle House Change (Updates Rent & Deposit) ---
  const handleHouseChange = (e) => {
      const houseId = e.target.value;
      setFormData(prev => ({ ...prev, house: houseId }));
      if (fieldErrors.house) setFieldErrors(prev => ({ ...prev, house: '' }));

      // Find the house to get its price
      const selectedHouse = houses.find(h => h.id === houseId);
      if (selectedHouse) {
          setFormData(prev => ({
              ...prev,
              house: houseId,
              monthly_rent: selectedHouse.rent_amount || '',
              // Default Deposit = 1 Month Rent (Standard) or 2 Months if previous logic preferred
              // Using existing logic: Rent * 2 (e.g. 1 Month Rent + 1 Month Deposit)
              deposit_paid: selectedHouse.rent_amount ? selectedHouse.rent_amount * 2 : ''
          }));
      }
  };

  const handleTenantChange = (e) => {
    const tenantId = e.target.value;
    setFormData(prev => ({ ...prev, tenant: tenantId }));
    if (fieldErrors.tenant) setFieldErrors(prev => ({ ...prev, tenant: '' }));

    const selectedTenant = tenants.find(t => t.id === tenantId);
    if (selectedTenant) {
      const assignedHouse = houses.find(h => h.id === selectedTenant.house);
      
      setFormData(prev => ({
        ...prev,
        house: assignedHouse ? assignedHouse.id : prev.house,
        monthly_rent: assignedHouse?.rent_amount || '',
        deposit_paid: assignedHouse ? assignedHouse.rent_amount * 2 : ''
      }));
    }
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    setError('');

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
      } else {
        const data = await response.json();
        const { global, fields } = parseBackendErrors(data);
        setError(global || 'Failed to save contract.');
        setFieldErrors(fields);
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const handleDelete = async (contractId) => {
    if (!window.confirm('Are you sure you want to delete this contract?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/contracts/${contractId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchData();
        setSuccess('Contract deleted successfully');
      } else {
        const data = await response.json();
        const { global } = parseBackendErrors(data);
        setError(global || 'Failed to delete contract');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const getContractStatusInfo = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { status: 'expired', label: 'EXPIRED', color: 'error' };
    if (daysLeft <= 30) return { status: 'expiring', label: 'EXPIRING SOON', color: 'warning' };
    return { status: 'active', label: 'ACTIVE', color: 'success' };
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
    return `${months} months`;
  };

  // --- FILTERING LOGIC ---
  const activeContracts = contracts.filter(c => getContractStatusInfo(c.end_date).status === 'active');
  const expiringContracts = contracts.filter(c => getContractStatusInfo(c.end_date).status === 'expiring');
  const expiredContracts = contracts.filter(c => getContractStatusInfo(c.end_date).status === 'expired');

  let displayedContracts = [];
  switch (tabValue) {
      case 0: displayedContracts = contracts; break;
      case 1: displayedContracts = activeContracts; break;
      case 2: displayedContracts = expiringContracts; break;
      case 3: displayedContracts = expiredContracts; break;
      default: displayedContracts = contracts;
  }

  // --- SMART DROPDOWN FILTERS ---

  const tenantsWithActiveContracts = new Set(
    contracts
      .filter(c => getContractStatusInfo(c.end_date).status !== 'expired')
      .map(c => c.tenant)
  );

  const availableTenants = tenants.filter(t => 
    !tenantsWithActiveContracts.has(t.id) || 
    (editMode && currentContract && t.id === currentContract.tenant)
  );

  const selectedTenantId = formData.tenant;
  const selectedTenant = tenants.find(t => t.id === selectedTenantId);
  const tenantAssignedHouseId = selectedTenant ? selectedTenant.house : null;

  const availableHouses = houses.filter(h => 
    h.status === 'vacant' || 
    (tenantAssignedHouseId && h.id === tenantAssignedHouseId) || 
    (editMode && currentContract && h.id === currentContract.house)
  );

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>Contract Management</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Create Contract</Button>
        </Box>
        <Paper sx={{ mt: 2, mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="scrollable" scrollButtons="auto">
            <Tab label={`All (${contracts.length})`} />
            <Tab icon={<CheckCircleIcon />} iconPosition="start" label={`Active (${activeContracts.length})`} />
            <Tab icon={<WarningIcon />} iconPosition="start" label={`Expiring (${expiringContracts.length})`} />
            <Tab icon={<EventBusyIcon />} iconPosition="start" label={`Expired (${expiredContracts.length})`} />
          </Tabs>
        </Paper>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Tenant</strong></TableCell>
              <TableCell><strong>House</strong></TableCell>
              <TableCell><strong>Start Date</strong></TableCell>
              <TableCell><strong>End Date</strong></TableCell>
              <TableCell><strong>Duration</strong></TableCell>
              <TableCell><strong>Rent</strong></TableCell>
              <TableCell><strong>Deposit</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedContracts.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>No contracts found</Typography></TableCell></TableRow>
            ) : (
              displayedContracts.map((contract) => {
                const { label, color } = getContractStatusInfo(contract.end_date);
                return (
                  <TableRow key={contract.id} hover>
                    <TableCell>{contract.tenant_name}</TableCell>
                    <TableCell>{contract.house_number}</TableCell>
                    <TableCell>{formatDate(contract.start_date)}</TableCell>
                    <TableCell>{formatDate(contract.end_date)}</TableCell>
                    <TableCell>{calculateDuration(contract.start_date, contract.end_date)}</TableCell>
                    <TableCell><strong>{formatCurrency(contract.monthly_rent)}</strong></TableCell>
                    <TableCell>{formatCurrency(contract.deposit_paid)}</TableCell>
                    <TableCell><Chip label={label} color={color} size="small" /></TableCell>
                    <TableCell>
                      <IconButton size="small" color="primary" onClick={() => handleOpenDialog(contract)}><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(contract.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- MINIMALIST CONTRACT FORM --- */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Contract' : 'Create Contract'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            <Alert severity="info" icon={<HistoryEduIcon />}>
                {editMode ? 'Update contract terms below' : 'Draft a new lease agreement'}
            </Alert>

            <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mt: 1, letterSpacing: 1 }}>PARTIES</Typography>
            
            <TextField
                select
                label="Tenant"
                name="tenant"
                value={formData.tenant}
                onChange={handleTenantChange}
                required
                fullWidth
                disabled={editMode}
                error={!!fieldErrors.tenant}
                helperText={fieldErrors.tenant}
            >
                {availableTenants.length === 0 && !editMode ? (
                    <MenuItem disabled>No eligible tenants available (All have active contracts)</MenuItem>
                ) : (
                    availableTenants.map((tenant) => (
                        <MenuItem key={tenant.id} value={tenant.id}>{tenant.user.first_name} {tenant.user.last_name}</MenuItem>
                    ))
                )}
            </TextField>

            <TextField
                select
                label="House"
                name="house"
                value={formData.house}
                onChange={handleHouseChange} // <--- UPDATED HANDLER
                required
                fullWidth
                disabled={editMode}
                error={!!fieldErrors.house}
                helperText={fieldErrors.house}
            >
                {availableHouses.length === 0 && !editMode ? (
                    <MenuItem disabled>No available houses</MenuItem>
                ) : (
                    availableHouses.map((house) => (
                        <MenuItem key={house.id} value={house.id}>{house.house_number} - {house.house_type} (KES {house.rent_amount})</MenuItem>
                    ))
                )}
            </TextField>

            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ letterSpacing: 1 }}>DURATION & TERMS</Typography>

            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <TextField label="Start Date" name="start_date" type="date" value={formData.start_date} onChange={handleInputChange} required fullWidth InputLabelProps={{ shrink: true }} error={!!fieldErrors.start_date} helperText={fieldErrors.start_date} />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="End Date" name="end_date" type="date" value={formData.end_date} onChange={handleInputChange} required fullWidth InputLabelProps={{ shrink: true }} error={!!fieldErrors.end_date} helperText={fieldErrors.end_date} />
                </Grid>
            </Grid>

            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <TextField label="Monthly Rent" name="monthly_rent" type="number" value={formData.monthly_rent} onChange={handleInputChange} required fullWidth inputProps={{ min: 0 }} error={!!fieldErrors.monthly_rent} helperText={fieldErrors.monthly_rent} />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="Deposit Paid" name="deposit_paid" type="number" value={formData.deposit_paid} onChange={handleInputChange} required fullWidth inputProps={{ min: 0 }} error={!!fieldErrors.deposit_paid} helperText={fieldErrors.deposit_paid} />
                </Grid>
            </Grid>

            <TextField
                label="Specific Terms / Notes"
                name="terms"
                value={formData.terms}
                onChange={handleInputChange}
                multiline
                rows={5}
                fullWidth
                placeholder="E.g., No pets allowed, Water bill included..."
                error={!!fieldErrors.terms}
                helperText={fieldErrors.terms}
                InputProps={{ startAdornment: <ArticleIcon color="action" sx={{ mr: 1, mt: 1 }} /> }}
            />

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">{editMode ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ContractManagement;