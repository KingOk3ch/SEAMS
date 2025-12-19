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
import AddCardIcon from '@mui/icons-material/AddCard';
import { useNavigate } from 'react-router-dom';

function TenantDashboard() {
  const [tenantData, setTenantData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment Dialog State (Restored)
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '', payment_type: 'rent', method: 'mpesa', reference: '', 
    phone: '', payment_date: new Date().toISOString().split('T')[0]
  });

  const navigate = useNavigate();

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
        // Pre-fill payment amount
        setPayForm(prev => ({ ...prev, amount: myTenant.house?.rent_amount || '' }));

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

  // --- Payment Handlers (Restored) ---
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
  const DashboardCard = ({ icon, title, value, subtext, color, path, action }) => (
    <Card 
        sx={{ 
            height: '100%',
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
              <Typography variant="h4">{value}</Typography>
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
            onClick={() => setOpenPayDialog(true)} // Quick Pay Button
        >
            Pay Rent
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <DashboardCard 
            icon={<HomeIcon color="primary" sx={{ fontSize: 40 }} />}
            title="My House"
            value={tenantData.house_number}
            subtext={`Monthly Rent: ${formatCurrency(tenantData.house?.rent_amount || 0)}`}
            path={null} 
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <DashboardCard 
            icon={<PaymentIcon color="success" sx={{ fontSize: 40 }} />}
            title="Payments"
            value={payments.length}
            subtext={`Total Paid: ${formatCurrency(payments.reduce((sum, p) => sum + parseFloat(p.amount), 0))}`}
            path="/tenant-payments" // Navigates to full history
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <DashboardCard 
            icon={<BuildIcon color="warning" sx={{ fontSize: 40 }} />}
            title="Maintenance"
            value={maintenance.length}
            subtext={`Pending: ${maintenance.filter(m => m.status === 'pending').length}`}
            path="/maintenance" // Navigates to maintenance page
          />
        </Grid>
      </Grid>

      {/* Contract Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Contract Information</Typography>
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
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.slice(0, 5).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>{payment.payment_type.toUpperCase()}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
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

      {/* Recent Maintenance */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">My Maintenance Requests</Typography>
          <Chip label="View All" onClick={() => navigate('/maintenance')} clickable color="primary" variant="outlined" size="small" />
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
              {maintenance.slice(0, 5).map((request) => (
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* QUICK PAY DIALOG (Restored) */}
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
                    <MenuItem value="mpesa">M-Pesa</MenuItem>
                    <MenuItem value="bank">Bank Transfer</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                </TextField>
                {payForm.method === 'mpesa' && (
                     <TextField 
                        label="Phone Number" 
                        value={payForm.phone} 
                        onChange={(e) => setPayForm({...payForm, phone: e.target.value})} 
                        fullWidth 
                        placeholder="0712..."
                    />
                )}
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