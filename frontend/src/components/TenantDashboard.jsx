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
import ArticleIcon from '@mui/icons-material/Article';
import EventIcon from '@mui/icons-material/Event';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'; 
import { useNavigate } from 'react-router-dom';
import { parseBackendErrors } from '../utils/errorHandler';
import LogoLoader from './LogoLoader';
import MaintenanceProgress from './MaintenanceProgress';

const DEFAULT_TERMS = `1. Rent Payment: Rent is due on or before the 5th of every month.
2. Security Deposit: Refundable upon vacating, minus cost of repairs/unpaid bills.
3. Utilities: Tenant pays for electricity (Token) and Water bill.
4. Maintenance: Tenant keeps interior clean; Landlord handles structural repairs.
5. Notice: One month written notice required before vacating.
6. Conduct: No noise pollution or illegal activities allowed.`;

function TenantDashboard() {
  const [tenantData, setTenantData] = useState(null);
  const [contractData, setContractData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});

  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openLeaseDialog, setOpenLeaseDialog] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  
  // State for digital lease acceptance
  const [acceptingLease, setAcceptingLease] = useState(false); 

  // Strictly initialized to mpesa, reference removed to enforce STK Push
  const [payForm, setPayForm] = useState({
    amount: '', payment_type: 'rent', method: 'mpesa',
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
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Tenant Profile
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

      if (myTenant.house) {
          try {
              const houseRes = await fetch(`http://localhost:8000/api/houses/${myTenant.house}/`, { headers });
              if (houseRes.ok) {
                  const houseData = await houseRes.json();
                  myTenant.rent_amount = houseData.rent_amount; 
              }
          } catch (e) { console.error("Could not fetch house details"); }
      }

      setTenantData(myTenant);
      
      // Default: set amount to rent if balance is 0
      setPayForm(prev => ({ ...prev, amount: myTenant.rent_amount || '' }));

      // Fetch Active Contract
      try {
          const contractRes = await fetch(`http://localhost:8000/api/contracts/`, { headers });
          if (contractRes.ok) {
              let allContracts = await contractRes.json();
              const myContract = allContracts.find(c => c.tenant === myTenant.id);
              if (myContract) setContractData(myContract);
          }
      } catch (e) { console.error("Could not fetch contract"); }

      // Fetch Payments
      const paymentsResponse = await fetch(`http://localhost:8000/api/payments/`, { headers });
      let allPayments = await paymentsResponse.json();
      if (allPayments.results) allPayments = allPayments.results;

      const myPayments = allPayments.filter(p => p.tenant === myTenant.id);

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

      // Fetch Bills & Calculate Smart Balance
      const billsResponse = await fetch(`http://localhost:8000/api/bills/`, { headers });
      let allBills = await billsResponse.json();
      if (allBills.results) allBills = allBills.results;

      const myBills = allBills.filter(b => b.tenant === myTenant.id);

      // Subtract amount_paid from total bill amount to get true outstanding balance
      const totalUnpaid = myBills
          .filter(b => !b.is_paid)
          .reduce((sum, b) => {
              const billAmount = parseFloat(b.amount) || 0;
              const paidAmount = parseFloat(b.amount_paid) || 0;
              return sum + (billAmount - paidAmount);
          }, 0);

      setOutstandingBalance(totalUnpaid);

      // Fetch Maintenance
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

    // Frontend Validation: Regex constraints deprecated.
    // If M-Pesa or Bank, ensure strict format (Alphanumeric only) -> Replaced by Automated STK Push payload formatting.

    try {
        const token = localStorage.getItem('access_token');
        
        // Automated STK Push is now the only allowed pathway for tenants
        const mpesaData = {
            amount: payForm.amount,
            phone_number: payForm.phone,
            payment_type: payForm.payment_type,
            month_for: payForm.payment_date
        };

        const res = await fetch('http://localhost:8000/api/payments/mpesa/stk-push/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mpesaData)
        });

        if (res.ok) {
            setSuccess("STK Push initiated! Please check your phone to enter your M-Pesa PIN.");
            setError('');
            setOpenPayDialog(false);
            setTimeout(() => fetchTenantData(), 5000); // Refresh to see pending status
        } else {
            const errorData = await res.json();
            const { global, fields } = parseBackendErrors(errorData);
            setError(global || errorData.error || "Failed to initiate STK push. Check your phone number.");
            setFieldErrors(fields || {});
        }
    } catch (err) {
        setError("Network error occurred");
    } finally {
        setPayLoading(false);
    }
  };

  // Handle Digital Signature
  const handleAcceptLease = async () => {
    setAcceptingLease(true);
    setError('');
    
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8000/api/contracts/${contractData.id}/accept/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            // Instantly update state to unblock the dashboard without full reload
            setContractData(prev => ({ ...prev, is_accepted: true }));
            setSuccess("Lease agreement accepted successfully! Welcome to SEAMS.");
        } else {
            const data = await res.json();
            setError(data.error || "Failed to accept lease. Please try again.");
        }
    } catch (err) {
        setError("Network error occurred while trying to accept lease.");
    } finally {
        setAcceptingLease(false);
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
      if(p.payment_method === 'mpesa') return <Chip label="Awaiting Auto-Verify" color="info" size="small" />;
      return <Chip label="Pending Admin Verify" color="warning" size="small" />;
  };

  const activeMaintenanceCount = maintenance.filter(m => {
    const status = (m.status || '').toString().toLowerCase().trim();
    return ['new', 'pending', 'assigned', 'in_progress'].includes(status);
  }).length;

  const getContractStatus = () => {
      if (!contractData) return { label: 'No Lease', color: 'default' };
      const today = new Date();
      const end = new Date(contractData.end_date);
      const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      
      if (daysLeft < 0) return { label: 'Expired', color: 'error' };
      if (daysLeft < 30) return { label: 'Expiring Soon', color: 'warning' };
      return { label: 'Active', color: 'success' };
  };

  // Enforces brand consistency during the initial dashboard data fetch
  if (loading) return <LogoLoader />;

  if (!tenantData) {
    return <Container maxWidth="lg"><Alert severity="warning">{error || "No tenant record found."}</Alert></Container>;
  }

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
    <Container maxWidth="lg" sx={{ position: 'relative' }}>
        
      {/* THE FORCED LEASE ACCEPTANCE BLOCKER */}
      {/* This renders specifically if a contract exists but is NOT accepted yet */}
      <Dialog 
        open={Boolean(contractData && contractData.is_accepted === false)} 
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown // Traps the user
        hideBackdrop={false}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentTurnedInIcon />
            Action Required: Accept Lease
        </DialogTitle>
        <DialogContent dividers sx={{ mt: 1 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
                Welcome to SEAMS! Before you can access your dashboard, you must review and accept your lease agreement.
            </Alert>
            
            <Typography variant="caption" fontWeight="bold" color="text.secondary">LEASE DETAILS</Typography>
            <Grid container spacing={2} sx={{ mb: 3, mt: 0.5 }}>
                <Grid item xs={6}>
                    <TextField label="Start Date" value={formatDate(contractData?.start_date)} fullWidth InputProps={{ readOnly: true }} variant="filled" size="small" />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="End Date" value={formatDate(contractData?.end_date)} fullWidth InputProps={{ readOnly: true }} variant="filled" size="small" />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="Monthly Rent" value={contractData ? formatCurrency(contractData.monthly_rent) : ''} fullWidth InputProps={{ readOnly: true }} variant="filled" size="small" />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="Deposit Required" value={contractData ? formatCurrency(contractData.deposit_paid) : ''} fullWidth InputProps={{ readOnly: true }} variant="filled" size="small" />
                </Grid>
            </Grid>

            <Typography variant="caption" fontWeight="bold" color="text.secondary">TERMS & CONDITIONS</Typography>
            <TextField 
                multiline 
                rows={6} 
                value={contractData?.terms || DEFAULT_TERMS} 
                fullWidth 
                InputProps={{ readOnly: true }} 
                variant="outlined" 
                sx={{ bgcolor: '#f9f9f9', mt: 1 }}
            />
        </DialogContent>
        <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
            <Button 
                onClick={handleAcceptLease} 
                variant="contained" 
                color="success" 
                size="large" 
                fullWidth
                disabled={acceptingLease}
            >
                {acceptingLease ? <CircularProgress size={24} color="inherit" /> : "I Agree & Accept Lease Terms"}
            </Button>
        </DialogActions>
      </Dialog>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">My Dashboard</Typography>
        
        {/* SMART PAY BUTTON */}
        <Button
            variant="contained"
            color={outstandingBalance > 0 ? "error" : "success"} // Red if balance due, else Green
            startIcon={<AddCardIcon />}
            onClick={() => { 
                setOpenPayDialog(true); 
                setFieldErrors({}); 
                setError(''); 
                setSuccess(''); 
                
                // If they owe money, auto-fill the balance
                if (outstandingBalance > 0) {
                    setPayForm(prev => ({
                        ...prev,
                        amount: outstandingBalance.toString(),
                        payment_type: 'rent' // Assumption: Usually rent, but could be general
                    }));
                } else {
                    // Explicitly reset form to empty if no balance
                    setPayForm({
                        amount: '', payment_type: 'rent', method: 'mpesa',
                        phone: '', payment_date: new Date().toISOString().split('T')[0]
                    });
                }
            }}
        >
            {outstandingBalance > 0 ? `Pay Balance (${formatCurrency(outstandingBalance)})` : "Make Payment"}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
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

        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            icon={<HomeIcon color="primary" sx={{ fontSize: 40 }} />}
            title="My House"
            value={tenantData.house_number}
            subtext={`Rent: ${formatCurrency(tenantData.rent_amount || 0)}`}
            path={null}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            icon={<BuildIcon color="warning" sx={{ fontSize: 40 }} />}
            title="Requests"
            value={activeMaintenanceCount}
            subtext={`${maintenance.length} Total Requests`}
            path="/maintenance"
          />
        </Grid>

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

      {/* Maintenance Progress Section */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Maintenance Progress</Typography>
          <Chip label="View Requests" onClick={() => navigate('/maintenance')} clickable color="primary" size="small" />
        </Box>
      </Paper>
      <MaintenanceProgress maintenance={maintenance} />

      {/* Quick Pay Dialog */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Make a Payment</DialogTitle>
        <DialogContent>
            <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                
                {/* STRICT M-PESA ENFORCEMENT - Legacy payment method dropdown permanently removed to guarantee STK Push */}
                <Alert severity="info">Payments are processed securely via M-Pesa STK Push.</Alert>

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
                    label="Safaricom Phone Number"
                    placeholder="e.g. 254712345678"
                    value={payForm.phone}
                    onChange={(e) => handlePayFormChange('phone', e.target.value)}
                    fullWidth
                    helperText={fieldErrors.phone || "Enter your Safaricom number format (2547...)"}
                    error={!!fieldErrors.phone}
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

      {/* View Accepted Lease Dialog (Read Only) */}
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