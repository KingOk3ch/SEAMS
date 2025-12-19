import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
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
  InputAdornment
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PaymentIcon from '@mui/icons-material/Payment';
import BuildIcon from '@mui/icons-material/Build';
import AddCardIcon from '@mui/icons-material/AddCard';

function TenantDashboard() {
  const [tenantData, setTenantData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment Dialog States
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_type: 'rent', // Default to Rent
    method: 'mpesa',
    phone: '',
    reference: ''
  });

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const user = JSON.parse(localStorage.getItem('user'));

      // Fetch tenant info
      const tenantResponse = await fetch(`http://localhost:8000/api/tenants/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tenants = await tenantResponse.json();
      const myTenant = tenants.find(t => t.user.id === user.id);
      setTenantData(myTenant);

      if (myTenant) {
        // Pre-fill payment amount with rent
        setPaymentForm(prev => ({ ...prev, amount: myTenant.house?.rent_amount || '' }));

        // Fetch my payments
        const paymentsResponse = await fetch(`http://localhost:8000/api/payments/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const allPayments = await paymentsResponse.json();
        const myPayments = allPayments.filter(p => p.tenant === myTenant.id);
        setPayments(myPayments);

        // Fetch my maintenance requests
        const maintenanceResponse = await fetch(`http://localhost:8000/api/maintenance/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const allMaintenance = await maintenanceResponse.json();
        const myMaintenance = allMaintenance.filter(m => m.reported_by === user.id);
        setMaintenance(myMaintenance);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load data');
      setLoading(false);
      console.error('Error:', err);
    }
  };

  const handlePaymentChange = (e) => {
    setPaymentForm({ ...paymentForm, [e.target.name]: e.target.value });
  };

  const handleInitiatePayment = async () => {
    setPayLoading(true);
    // TODO: Connect this to the actual Backend M-Pesa Endpoint later
    setTimeout(() => {
        alert(`Simulating Payment: ${paymentForm.payment_type.toUpperCase()} - ${paymentForm.method.toUpperCase()} request for KES ${paymentForm.amount}`);
        setPayLoading(false);
        setOpenPayDialog(false);
    }, 1500);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
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

  if (!tenantData) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning">No tenant record found for your account.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        My Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <HomeIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">My House</Typography>
                  <Typography variant="h4">{tenantData.house_number}</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Monthly Rent: {formatCurrency(tenantData.house?.rent_amount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                    <PaymentIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
                    <Box>
                        <Typography variant="h6">Payments</Typography>
                        <Typography variant="h4">{payments.length}</Typography>
                    </Box>
                </Box>
                <Button 
                    variant="contained" 
                    color="success" 
                    size="small"
                    startIcon={<AddCardIcon />}
                    onClick={() => setOpenPayDialog(true)}
                >
                    Make Payment
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Paid: {formatCurrency(payments.reduce((sum, p) => sum + parseFloat(p.amount), 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BuildIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">Maintenance</Typography>
                  <Typography variant="h4">{maintenance.length}</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Pending: {maintenance.filter(m => m.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Contract Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Contract Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">Move-in Date</Typography>
            <Typography variant="body1">{formatDate(tenantData.move_in_date)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">Contract Start</Typography>
            <Typography variant="body1">{formatDate(tenantData.contract_start)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">Contract End</Typography>
            <Typography variant="body1">{formatDate(tenantData.contract_end)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">Status</Typography>
            <Chip label={tenantData.status.toUpperCase()} color="success" size="small" />
          </Grid>
        </Grid>
      </Paper>

      {/* Recent Payments */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Recent Payments</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Reference</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">No payments recorded</TableCell></TableRow>
              ) : (
                payments.slice(0, 5).map((payment) => (
                    <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell>
                        <Chip 
                            label={payment.payment_type ? payment.payment_type.replace('_', ' ').toUpperCase() : 'RENT'} 
                            color="primary" 
                            variant="outlined"
                            size="small" 
                        />
                    </TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                        <Chip label={payment.payment_method.toUpperCase()} size="small" />
                    </TableCell>
                    <TableCell>{payment.reference_number || '-'}</TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Recent Maintenance */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">My Maintenance Requests</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Request ID</TableCell>
                <TableCell>Issue</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
            {maintenance.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">No maintenance requests</TableCell></TableRow>
              ) : (
                maintenance.slice(0, 5).map((request) => (
                    <TableRow key={request.id}>
                    <TableCell>{request.request_id}</TableCell>
                    <TableCell>{request.issue_description}</TableCell>
                    <TableCell>
                        <Chip 
                        label={request.priority.toUpperCase()} 
                        color={request.priority === 'urgent' ? 'error' : 'default'}
                        size="small" 
                        />
                    </TableCell>
                    <TableCell>
                        <Chip 
                        label={request.status.toUpperCase()} 
                        color={request.status === 'completed' ? 'success' : 'warning'}
                        size="small" 
                        />
                    </TableCell>
                    <TableCell>{formatDate(request.created_at)}</TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* PAYMENT DIALOG */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Make a Payment</DialogTitle>
        <DialogContent>
            <Box component="form" sx={{ mt: 1 }}>
                
                {/* 1. Payment Type Selector */}
                <TextField
                    select
                    label="Payment For"
                    name="payment_type"
                    value={paymentForm.payment_type}
                    onChange={handlePaymentChange}
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="rent">Rent</MenuItem>
                    <MenuItem value="water">Water Bill</MenuItem>
                    <MenuItem value="electricity">Electricity Bill</MenuItem>
                    <MenuItem value="garbage">Garbage Fee</MenuItem>
                    <MenuItem value="damage">Damage Repair</MenuItem>
                    <MenuItem value="deposit">Security Deposit</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                </TextField>

                {/* 2. Amount */}
                <TextField
                    label="Amount (KES)"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={handlePaymentChange}
                    fullWidth
                    margin="normal"
                    type="number"
                    InputProps={{
                        startAdornment: <InputAdornment position="start">KES</InputAdornment>,
                    }}
                />
                
                {/* 3. Method */}
                <TextField
                    select
                    label="Payment Method"
                    name="method"
                    value={paymentForm.method}
                    onChange={handlePaymentChange}
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="mpesa">M-Pesa (STK Push)</MenuItem>
                    <MenuItem value="bank">Bank Transfer</MenuItem>
                </TextField>

                {paymentForm.method === 'mpesa' && (
                    <TextField
                        label="M-Pesa Phone Number"
                        name="phone"
                        placeholder="e.g. 0712345678"
                        value={paymentForm.phone}
                        onChange={handlePaymentChange}
                        fullWidth
                        margin="normal"
                        helperText="You will receive a prompt on this phone."
                    />
                )}

                {paymentForm.method === 'bank' && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Bank: KCB Bank <br/>
                        Acc No: 1234567890 <br/>
                        Paybill: 522522
                    </Alert>
                )}
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenPayDialog(false)}>Cancel</Button>
            <Button 
                variant="contained" 
                color="success" 
                onClick={handleInitiatePayment}
                disabled={payLoading}
            >
                {payLoading ? 'Processing...' : 'Pay Now'}
            </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TenantDashboard;