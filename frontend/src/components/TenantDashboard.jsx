import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent, CircularProgress, Alert, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CardActionArea, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tooltip
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BuildIcon from '@mui/icons-material/Build';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddCardIcon from '@mui/icons-material/AddCard';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import { parseBackendErrors } from '../utils/errorHandler'; // NEW IMPORT

function TenantDashboard() {
  const [tenantData, setTenantData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // NEW: Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Payment Dialog State
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  const [payForm, setPayForm] = useState({
    amount: '', payment_type: 'rent', method: 'bank', reference: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const user = JSON.parse(localStorage.getItem('user'));
      const headers = { 'Authorization': `Bearer ${token}` };

      // --- 1. Fetch Tenant Profile ---
      const tenantResponse = await fetch(`http://localhost:8000/api/tenants/`, { headers });
      if (!tenantResponse.ok) throw new Error("API Error");

      let tenants = await tenantResponse.json();
      if (tenants.results) tenants = tenants.results;

      const myTenant = tenants.find(t => {
          const tenantUserId = (t.user && typeof t.user === 'object' && t.user.id) ? t.user.id : t.user;
          return String(tenantUserId) === String(user.id);
      });

      if (!myTenant) {
        setError('Tenant profile not found. Please contact admin.');
        setLoading(false);
        return;
      }

      setTenantData(myTenant);
      setPayForm(prev => ({ ...prev, amount: myTenant.house?.rent_amount || '' }));

      // --- 2. Fetch Payments ---
      const paymentsResponse = await fetch(`http://localhost:8000/api/payments/`, { headers });
      let allPayments = await paymentsResponse.json();
      if (allPayments.results) allPayments = allPayments.results;

      const myPayments = allPayments.filter(p => p.tenant === myTenant.id);

      // SORTING: Pending (1) > Rejected (2) > Verified (3)
      myPayments.sort((a, b) => {
          const getScore = (p) => {
              if (p.is_verified || p.status === 'verified') return 3;
              if (p.status === 'rejected') return 2;
              return 1;
          };
          const scoreA = getScore(a);
          const scoreB = getScore(b);

          if (scoreA !== scoreB) return scoreA - scoreB;
          return new Date(b.payment_date) - new Date(a.payment_date);
      });

      setPayments(myPayments);

      // --- 3. Fetch Bills & Calculate Balance ---
      const billsResponse = await fetch(`http://localhost:8000/api/bills/`, { headers });
      let allBills = await billsResponse.json();
      if (allBills.results) allBills = allBills.results;

      const myBills = allBills.filter(b => b.tenant === myTenant.id);

      const totalUnpaid = myBills
          .filter(b => !b.is_paid)
          .reduce((sum, b) => sum + parseFloat(b.amount), 0);

      setOutstandingBalance(totalUnpaid);

      // --- 4. Fetch My Maintenance ---
      const maintenanceResponse = await fetch(`http://localhost:8000/api/maintenance/`, { headers });
      let allMaintenance = await maintenanceResponse.json();
      if (allMaintenance.results) allMaintenance = allMaintenance.results;

      setMaintenance(allMaintenance);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data.');
      setLoading(false);
    }
  };

  const handleInitiatePayment = async () => {
    setPayLoading(true);
    setFieldErrors({});
    setError('');
    try {
        const token = localStorage.getItem('access_token');
        const paymentData = {
            tenant: tenantData.id,
            amount: payForm.amount,
            payment_method: payForm.method,
            payment_type: payForm.payment_type,
            reference_number: payForm.reference || `REF-${Date.now()}`,
            payment_date: payForm.payment_date,
            month_for: new Date().toISOString().split('T')[0]
        };

        const res = await fetch('http://localhost:8000/api/payments/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        if (res.ok) {
            setSuccess("Payment Recorded! Waiting for Admin Verification.");
            setError('');
            setOpenPayDialog(false);
            fetchTenantData();
        } else {
            const errorData = await res.json();
            const { global, fields } = parseBackendErrors(errorData);
            setError(global || "Failed to record payment. Please check the form.");
            setFieldErrors(fields);
        }
    } catch (err) {
        setError("Network error occurred");
    } finally {
        setPayLoading(false);
    }
  };

  // NEW: Clear field errors on input
  const handlePayFormChange = (field, value) => {
    setPayForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Status Chip Helper
  const getStatusChip = (p) => {
      if(p.status === 'rejected') return <Chip label="Rejected" color="error" size="small" />;
      if(p.status === 'verified' || p.is_verified) return <Chip label="Verified" color="success" size="small" />;
      return <Chip label="Pending" color="warning" size="small" />;
  };

  const activeMaintenanceCount = maintenance.filter(m => {
    const status = (m.status || '').toString().toLowerCase().trim();
    return ['new', 'pending', 'assigned', 'in_progress'].includes(status);
  }).length;

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  if (!tenantData) {
    return <Container maxWidth="lg"><Alert severity="warning">{error || "No tenant record found."}</Alert></Container>;
  }

  // --- Reusable Dashboard Card ---
  const DashboardCard = ({ icon, title, value, subtext, color, path, bgcolor }) => (
    <Card
        sx={{
            height: '100%',
            bgcolor: bgcolor || 'white',
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
            {icon}
            <Box ml={2}>
              <Typography variant="h6">{title}</Typography>
              <Typography variant="h4" fontWeight="bold">{value}</Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {subtext}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">My Dashboard</Typography>
        <Button
            variant="contained"
            color="success"
            startIcon={<AddCardIcon />}
            onClick={() => { setOpenPayDialog(true); setFieldErrors({}); setError(''); setSuccess(''); }}
        >
            Pay Rent
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <DashboardCard
            icon={<AccountBalanceWalletIcon color={outstandingBalance > 100 ? "error" : "success"} sx={{ fontSize: 40 }} />}
            title="Balance Due"
            value={formatCurrency(outstandingBalance > 0 ? outstandingBalance : 0)}
            subtext={outstandingBalance > 100 ? "Please clear your dues" : "You are up to date"}
            bgcolor={outstandingBalance > 100 ? "#ffebee" : "#e8f5e9"}
            path="/tenant-payments"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <DashboardCard
            icon={<HomeIcon color="primary" sx={{ fontSize: 40 }} />}
            title="My House"
            value={tenantData.house_number}
            subtext={`Rent: ${formatCurrency(tenantData.house?.rent_amount || 0)}`}
            path={null}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <DashboardCard
            icon={<BuildIcon color="warning" sx={{ fontSize: 40 }} />}
            title="Active Requests"
            value={activeMaintenanceCount}
            subtext={`${maintenance.length} Total Requests in History`}
            path="/maintenance"
          />
        </Grid>
      </Grid>

      {/* Recent Payments Table */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">Recent Payments</Typography>
          <Chip label="View All" onClick={() => navigate('/tenant-payments')} clickable color="primary" variant="outlined" size="small" />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.slice(0, 5).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>{payment.payment_type.toUpperCase()}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{payment.payment_method.toUpperCase()}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                        {getStatusChip(payment)}
                        {payment.status === 'rejected' && (
                            <Tooltip title={payment.rejection_reason || "No reason provided"}>
                                <InfoIcon color="error" fontSize="small" style={{cursor:'pointer'}}/>
                            </Tooltip>
                        )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Quick Pay Dialog */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Make a Payment</DialogTitle>
        <DialogContent>
            <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label="Amount (KES)"
                    type="number"
                    value={payForm.amount}
                    onChange={(e) => handlePayFormChange('amount', e.target.value)}
                    fullWidth
                    error={!!fieldErrors.amount}
                    helperText={fieldErrors.amount}
                />
                <TextField
                    select
                    label="Payment For"
                    value={payForm.payment_type}
                    onChange={(e) => handlePayFormChange('payment_type', e.target.value)}
                    fullWidth
                    error={!!fieldErrors.payment_type}
                    helperText={fieldErrors.payment_type}
                >
                    {['rent','water','electricity','garbage','damage','deposit','penalty','other'].map(o => <MenuItem key={o} value={o}>{o.toUpperCase()}</MenuItem>)}
                </TextField>
                <TextField
                    select
                    label="Method"
                    value={payForm.method}
                    onChange={(e) => handlePayFormChange('method', e.target.value)}
                    fullWidth
                    error={!!fieldErrors.method}
                    helperText={fieldErrors.method}
                >
                    <MenuItem value="mpesa">M-Pesa (Manual)</MenuItem>
                    <MenuItem value="bank">Bank Transfer</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                </TextField>

                <TextField
                    label="Transaction Ref (Last 4 Digits)"
                    value={payForm.reference}
                    onChange={(e) => handlePayFormChange('reference', e.target.value)}
                    fullWidth
                    inputProps={{ maxLength: 4 }}
                    helperText={fieldErrors.reference || "e.g. QK23"}
                    error={!!fieldErrors.reference}
                />
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenPayDialog(false)}>Cancel</Button>
            <Button onClick={handleInitiatePayment} variant="contained" color="success" disabled={payLoading}>
                {payLoading ? "Processing..." : "Pay Now"}
            </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TenantDashboard;