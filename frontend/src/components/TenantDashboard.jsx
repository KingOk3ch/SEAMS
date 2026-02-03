import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent, CircularProgress, Alert, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CardActionArea, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tooltip, Divider
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BuildIcon from '@mui/icons-material/Build';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddCardIcon from '@mui/icons-material/AddCard';
import InfoIcon from '@mui/icons-material/Info';
import ArticleIcon from '@mui/icons-material/Article'; // Lease Icon
import EventIcon from '@mui/icons-material/Event'; // Date Icon
import { useNavigate } from 'react-router-dom';
import { parseBackendErrors } from '../utils/errorHandler';

// --- NEW: Standard Terms Fallback ---
const DEFAULT_TERMS = `1. Rent Payment: Rent is due on or before the 5th of every month.
2. Security Deposit: Refundable upon vacating, minus cost of repairs/unpaid bills.
3. Utilities: Tenant pays for electricity (Token) and Water bill.
4. Maintenance: Tenant keeps interior clean; Landlord handles structural repairs.
5. Notice: One month written notice required before vacating.
6. Conduct: No noise pollution or illegal activities allowed.`;

function TenantDashboard() {
  const [tenantData, setTenantData] = useState(null);
  const [contractData, setContractData] = useState(null); // NEW: Store Contract
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Dialog States
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openLeaseDialog, setOpenLeaseDialog] = useState(false); // NEW: Lease Dialog
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

      // PRESERVED: Fetch House Details specifically to get the Rent Amount
      if (myTenant.house) {
          try {
              const houseRes = await fetch(`http://localhost:8000/api/houses/${myTenant.house}/`, { headers });
              if (houseRes.ok) {
                  const houseData = await houseRes.json();
                  myTenant.rent_amount = houseData.rent_amount; 
              }
          } catch (e) {
              console.error("Could not fetch house details");
          }
      }

      setTenantData(myTenant);
      
      // Auto-fill payment amount
      setPayForm(prev => ({ ...prev, amount: myTenant.rent_amount || '' }));

      // --- 2. Fetch Active Contract (NEW) ---
      try {
          const contractRes = await fetch(`http://localhost:8000/api/contracts/`, { headers });
          if (contractRes.ok) {
              let allContracts = await contractRes.json();
              // Find contract belonging to this tenant
              const myContract = allContracts.find(c => c.tenant === myTenant.id);
              if (myContract) setContractData(myContract);
          }
      } catch (e) { console.error("Could not fetch contract"); }

      // --- 3. Fetch Payments ---
      const paymentsResponse = await fetch(`http://localhost:8000/api/payments/`, { headers });
      let allPayments = await paymentsResponse.json();
      if (allPayments.results) allPayments = allPayments.results;

      const myPayments = allPayments.filter(p => p.tenant === myTenant.id);

      // PRESERVED: Strict Sorting Logic
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

      // --- 4. Fetch Bills & Calculate Balance ---
      const billsResponse = await fetch(`http://localhost:8000/api/bills/`, { headers });
      let allBills = await billsResponse.json();
      if (allBills.results) allBills = allBills.results;

      const myBills = allBills.filter(b => b.tenant === myTenant.id);

      const totalUnpaid = myBills
          .filter(b => !b.is_paid)
          .reduce((sum, b) => sum + parseFloat(b.amount), 0);

      setOutstandingBalance(totalUnpaid);

      // --- 5. Fetch Maintenance ---
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

  const getStatusChip = (p) => {
      if(p.status === 'rejected') return <Chip label="Rejected" color="error" size="small" />;
      if(p.status === 'verified' || p.is_verified) return <Chip label="Verified" color="success" size="small" />;
      return <Chip label="Pending" color="warning" size="small" />;
  };

  const activeMaintenanceCount = maintenance.filter(m => {
    const status = (m.status || '').toString().toLowerCase().trim();
    return ['new', 'pending', 'assigned', 'in_progress'].includes(status);
  }).length;

  // --- Contract Status Logic ---
  const getContractStatus = () => {
      if (!contractData) return { label: 'No Lease', color: 'default' };
      const today = new Date();
      const end = new Date(contractData.end_date);
      const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      
      if (daysLeft < 0) return { label: 'Expired', color: 'error' };
      if (daysLeft < 30) return { label: 'Expiring Soon', color: 'warning' };
      return { label: 'Active', color: 'success' };
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  if (!tenantData) {
    return <Container maxWidth="lg"><Alert severity="warning">{error || "No tenant record found."}</Alert></Container>;
  }

  // --- Reusable Dashboard Card ---
  const DashboardCard = ({ icon, title, value, subtext, color, path, onClick, bgcolor }) => (
    <Card
        sx={{
            height: '100%',
            bgcolor: bgcolor || 'white',
            transition: 'transform 0.2s',
            '&:hover': (path || onClick) ? { transform: 'scale(1.02)', boxShadow: 6, cursor: 'pointer' } : {}
        }}
    >
      <CardActionArea
        onClick={() => {
            if (onClick) onClick();
            else if (path) navigate(path);
        }}
        disabled={!path && !onClick}
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

  const contractStatus = getContractStatus();

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
        {/* Balance Card */}
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            icon={<AccountBalanceWalletIcon color={outstandingBalance > 100 ? "error" : "success"} sx={{ fontSize: 40 }} />}
            title="Balance"
            value={formatCurrency(outstandingBalance > 0 ? outstandingBalance : 0)}
            subtext={outstandingBalance > 100 ? "Please clear dues" : "Up to date"}
            bgcolor={outstandingBalance > 100 ? "#ffebee" : "#e8f5e9"}
            path="/tenant-payments"
          />
        </Grid>

        {/* House Card */}
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            icon={<HomeIcon color="primary" sx={{ fontSize: 40 }} />}
            title="My House"
            value={tenantData.house_number}
            subtext={`Rent: ${formatCurrency(tenantData.rent_amount || 0)}`}
            path={null}
          />
        </Grid>

        {/* Maintenance Card */}
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            icon={<BuildIcon color="warning" sx={{ fontSize: 40 }} />}
            title="Requests"
            value={activeMaintenanceCount}
            subtext={`${maintenance.length} Total Requests`}
            path="/maintenance"
          />
        </Grid>

        {/* NEW: My Lease Card */}
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            icon={<ArticleIcon color="info" sx={{ fontSize: 40 }} />}
            title="My Lease"
            value={contractStatus.label}
            subtext={contractData ? `Ends: ${formatDate(contractData.end_date)}` : "No active contract"}
            onClick={() => contractData && setOpenLeaseDialog(true)}
            bgcolor="#e3f2fd"
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

      {/* NEW: View Lease Dialog (Read Only) */}
      <Dialog open={openLeaseDialog} onClose={() => setOpenLeaseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
                <ArticleIcon color="primary" />
                My Lease Agreement
            </Box>
        </DialogTitle>
        <DialogContent>
            {contractData && (
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Alert severity="info" icon={<EventIcon />}>
                        Lease Valid from <strong>{formatDate(contractData.start_date)}</strong> to <strong>{formatDate(contractData.end_date)}</strong>
                    </Alert>
                    
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">FINANCIALS</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField label="Monthly Rent" value={formatCurrency(contractData.monthly_rent)} fullWidth InputProps={{ readOnly: true }} variant="filled" />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField label="Deposit Held" value={formatCurrency(contractData.deposit_paid)} fullWidth InputProps={{ readOnly: true }} variant="filled" />
                        </Grid>
                    </Grid>

                    <Divider />
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">TERMS & CONDITIONS</Typography>
                    {/* AUTOMATIC TERMS FALLBACK */}
                    <TextField 
                        multiline 
                        rows={6} 
                        value={contractData.terms || DEFAULT_TERMS} 
                        fullWidth 
                        InputProps={{ readOnly: true }} 
                        variant="outlined" 
                        sx={{ bgcolor: '#f9f9f9' }}
                    />
                </Box>
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenLeaseDialog(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}

export default TenantDashboard;