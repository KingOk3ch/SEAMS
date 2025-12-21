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
  CardActionArea,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PaymentIcon from '@mui/icons-material/Payment';
import BuildIcon from '@mui/icons-material/Build';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddCardIcon from '@mui/icons-material/AddCard';
import { useNavigate } from 'react-router-dom';

function TenantDashboard() {
  const [tenantData, setTenantData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment Dialog State
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  
  // Updated defaults to match Manual System (Bank default)
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

      // 1. Fetch Tenant (Backend now filters this to only return MY tenant profile)
      const tenantResponse = await fetch(`http://localhost:8000/api/tenants/`, { headers });
      const tenants = await tenantResponse.json();
      const myTenant = tenants.find(t => t.user.id === user.id) || tenants[0];
      
      setTenantData(myTenant);

      if (myTenant) {
        // Pre-fill payment amount with rent
        setPayForm(prev => ({ ...prev, amount: myTenant.house?.rent_amount || '' }));

        // 2. Fetch My Payments
        const paymentsResponse = await fetch(`http://localhost:8000/api/payments/`, { headers });
        const allPayments = await paymentsResponse.json();
        const myPayments = allPayments.filter(p => p.tenant === myTenant.id);
        setPayments(myPayments);

        // 3. Fetch My Bills (Needed for Balance Calculation)
        const billsResponse = await fetch(`http://localhost:8000/api/bills/`, { headers });
        const allBills = await billsResponse.json();
        const myBills = allBills.filter(b => b.tenant === myTenant.id);

        // 4. Fetch My Maintenance
        const maintenanceResponse = await fetch(`http://localhost:8000/api/maintenance/`, { headers });
        const allMaintenance = await maintenanceResponse.json();
        const myMaintenance = allMaintenance.filter(m => m.reported_by === user.id);
        setMaintenance(myMaintenance);

        // 5. Calculate Outstanding Balance
        const rentDue = parseFloat(myTenant.house?.rent_amount || 0);
        const totalBills = myBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
        const totalPaid = myPayments
            .filter(p => p.is_verified)
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        setOutstandingBalance((rentDue + totalBills) - totalPaid);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load data');
      setLoading(false);
      console.error('Error:', err);
    }
  };

  // --- Payment Handler ---
  const handleInitiatePayment = async () => {
    setPayLoading(true);
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
            alert("Payment Recorded! Waiting for Admin Verification.");
            setOpenPayDialog(false);
            fetchTenantData(); // Refresh data immediately
        } else {
            alert("Failed to record payment");
        }
    } catch (err) {
        alert("Network error");
    } finally {
        setPayLoading(false);
    }
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

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  if (!tenantData) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning">No tenant record found for your account.</Alert>
      </Container>
    );
  }

  // --- Reusable Interactive Card ---
  const DashboardCard = ({ icon, title, value, subtext, color, path, action, bgcolor }) => (
    <Card 
        sx={{ 
            height: '100%',
            bgcolor: bgcolor || 'white',
            transition: 'transform 0.2s',
            '&:hover': (path || action) ? { transform: 'scale(1.02)', boxShadow: 6 } : {}
        }}
    >
      <CardActionArea 
        onClick={() => {
            if (action) action();
            else if (path) navigate(path);
        }} 
        disabled={!path && !action}
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
            onClick={() => setOpenPayDialog(true)}
        >
            Pay Rent
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        
        {/* Outstanding Balance Card (NEW) */}
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
            title="Maintenance"
            value={maintenance.length}
            subtext={`Pending: ${maintenance.filter(m => m.status === 'pending').length}`}
            path="/maintenance" 
          />
        </Grid>
      </Grid>

      {/* Recent Payments */}
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
                    <Chip 
                        label={payment.is_verified ? "Verified" : "Pending"} 
                        color={payment.is_verified ? "success" : "warning"} 
                        size="small" 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* QUICK PAY DIALOG (Updated to match TenantPayments.jsx) */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Make a Payment</DialogTitle>
        <DialogContent>
            <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField 
                    label="Amount (KES)" 
                    type="number" 
                    value={payForm.amount} 
                    onChange={(e) => setPayForm({...payForm, amount: e.target.value})} 
                    fullWidth 
                />
                <TextField 
                    select 
                    label="Payment For" 
                    value={payForm.payment_type} 
                    onChange={(e) => setPayForm({...payForm, payment_type: e.target.value})} 
                    fullWidth
                >
                    {['rent','water','electricity','garbage','damage','deposit','other'].map(o => <MenuItem key={o} value={o}>{o.toUpperCase()}</MenuItem>)}
                </TextField>
                <TextField 
                    select 
                    label="Method" 
                    value={payForm.method} 
                    onChange={(e) => setPayForm({...payForm, method: e.target.value})} 
                    fullWidth
                >
                    <MenuItem value="mpesa">M-Pesa (Manual)</MenuItem>
                    <MenuItem value="bank">Bank Transfer</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                </TextField>
                
                {/* Reference Input (Replaces Phone Number) */}
                <TextField 
                    label="Reference Number / Transaction Code" 
                    value={payForm.reference} 
                    onChange={(e) => setPayForm({...payForm, reference: e.target.value})} 
                    fullWidth 
                    helperText="e.g. QK23... or Bank Ref"
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