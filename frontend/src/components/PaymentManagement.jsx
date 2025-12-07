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
import FilterListIcon from '@mui/icons-material/FilterList';

function PaymentManagement() {
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [filterTenant, setFilterTenant] = useState('');
  const [formData, setFormData] = useState({
    tenant: '',
    amount: '',
    payment_date: '',
    payment_method: 'mpesa',
    reference_number: '',
    month_for: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      const paymentsResponse = await fetch('http://localhost:8000/api/payments/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const paymentsData = await paymentsResponse.json();
      setPayments(paymentsData);

      const tenantsResponse = await fetch('http://localhost:8000/api/tenants/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tenantsData = await tenantsResponse.json();
      setTenants(tenantsData);

      setLoading(false);
    } catch (err) {
      setError('Connection error');
      setLoading(false);
      console.error('Error:', err);
    }
  };

  const handleOpenDialog = (payment = null) => {
    if (payment) {
      setEditMode(true);
      setCurrentPayment(payment);
      setFormData({
        tenant: payment.tenant,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        reference_number: payment.reference_number,
        month_for: payment.month_for
      });
    } else {
      setEditMode(false);
      setCurrentPayment(null);
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      const monthFor = firstDayOfMonth.toISOString().split('T')[0];

      setFormData({
        tenant: '',
        amount: '',
        payment_date: today,
        payment_method: 'mpesa',
        reference_number: '',
        month_for: monthFor
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentPayment(null);
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
      const url = editMode 
        ? `http://localhost:8000/api/payments/${currentPayment.id}/`
        : 'http://localhost:8000/api/payments/';
      
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
        setSuccess(editMode ? 'Payment updated successfully' : 'Payment recorded successfully');
        setError('');
      } else {
        const data = await response.json();
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Failed to save payment');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/payments/${paymentId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchData();
        setSuccess('Payment deleted successfully');
        setError('');
      } else {
        setError('Failed to delete payment');
      }
    } catch (err) {
      setError('Failed to delete payment');
      console.error('Error:', err);
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method) {
      case 'mpesa': return 'success';
      case 'bank': return 'primary';
      case 'cash': return 'warning';
      case 'cheque': return 'info';
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const filteredPayments = filterTenant 
    ? payments.filter(payment => payment.tenant === parseInt(filterTenant))
    : payments;

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

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
            Payment Management
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Record Payment
          </Button>
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total Payments: {filteredPayments.length} | Total Amount: {formatCurrency(totalAmount)}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Tenant</InputLabel>
            <Select
              value={filterTenant}
              label="Filter by Tenant"
              onChange={(e) => setFilterTenant(e.target.value)}
              startAdornment={<FilterListIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              <MenuItem value="">All Tenants</MenuItem>
              {tenants.map((tenant) => (
                <MenuItem key={tenant.id} value={tenant.id}>
                  {tenant.user.first_name} {tenant.user.last_name} - {tenant.house_number}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
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
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Tenant</strong></TableCell>
              <TableCell><strong>House</strong></TableCell>
              <TableCell><strong>Amount</strong></TableCell>
              <TableCell><strong>Method</strong></TableCell>
              <TableCell><strong>Reference</strong></TableCell>
              <TableCell><strong>Month For</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No payment records found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id} hover>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>{payment.tenant_name}</TableCell>
                  <TableCell>{payment.house_number}</TableCell>
                  <TableCell><strong>{formatCurrency(payment.amount)}</strong></TableCell>
                  <TableCell>
                    <Chip 
                      label={payment.payment_method.toUpperCase()} 
                      color={getPaymentMethodColor(payment.payment_method)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{payment.reference_number || '-'}</TableCell>
                  <TableCell>{formatDate(payment.month_for)}</TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleOpenDialog(payment)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDelete(payment.id)}
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Payment' : 'Record New Payment'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Tenant"
                  name="tenant"
                  value={formData.tenant}
                  onChange={handleInputChange}
                  required
                  fullWidth
                >
                  {tenants.map((tenant) => (
                    <MenuItem key={tenant.id} value={tenant.id}>
                      {tenant.user.first_name} {tenant.user.last_name} - {tenant.house_number}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Enter amount in KES"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Payment Date"
                  name="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Payment Method"
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  required
                  fullWidth
                >
                  <MenuItem value="mpesa">M-Pesa</MenuItem>
                  <MenuItem value="bank">Bank Transfer</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Month For"
                  name="month_for"
                  type="date"
                  value={formData.month_for}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText="Month this payment covers"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Reference Number"
                  name="reference_number"
                  value={formData.reference_number}
                  onChange={handleInputChange}
                  fullWidth
                  helperText="Transaction ID or receipt number (optional)"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Update' : 'Record Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default PaymentManagement;