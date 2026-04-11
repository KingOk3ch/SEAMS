import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, Grid, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tabs, Tab, Tooltip, Alert
} from '@mui/material';
import AddCardIcon from '@mui/icons-material/AddCard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import InfoIcon from '@mui/icons-material/Info';
import { parseBackendErrors } from '../utils/errorHandler';
import LogoLoader from './LogoLoader';

function TenantPayments() {
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});

  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tenantData, setTenantData] = useState(null);
  const [outstandingBalance, setOutstandingBalance] = useState(0);

  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [isBillPayment, setIsBillPayment] = useState(false);

  // Strictly initialized to mpesa, reference removed
  const [payForm, setPayForm] = useState({
    amount: '', payment_type: 'rent', method: 'mpesa',
    phone: '', payment_date: new Date().toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const user = JSON.parse(localStorage.getItem('user'));
      const headers = { 'Authorization': `Bearer ${token}` };

      const [billsRes, paymentsRes, tenantsRes] = await Promise.all([
        fetch('http://localhost:8000/api/bills/', { headers }),
        fetch('http://localhost:8000/api/payments/', { headers }),
        fetch('http://localhost:8000/api/tenants/', { headers })
      ]);

      let billsData = await billsRes.json();
      if(billsData.results) billsData = billsData.results;

      let paymentsData = await paymentsRes.json();
      if(paymentsData.results) paymentsData = paymentsData.results;

      let allTenants = await tenantsRes.json();
      if(allTenants.results) allTenants = allTenants.results;

      const myTenant = allTenants.find(t => {
          const uId = t.user.id || t.user;
          return String(uId) === String(user.id);
      });

      if (myTenant) {
        const myBills = billsData.filter(b => b.tenant === myTenant.id);
        const myPayments = paymentsData.filter(p => p.tenant === myTenant.id);

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

        setBills(myBills);
        setPayments(myPayments);
        setTenantData(myTenant);

        const totalUnpaid = myBills
            .filter(b => !b.is_paid)
            .reduce((sum, b) => {
                const balance = parseFloat(b.amount) - parseFloat(b.amount_paid || 0);
                return sum + (balance > 0 ? balance : 0);
            }, 0);

        setOutstandingBalance(totalUnpaid);
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load financial data.');
      setLoading(false);
    }
  };

  const getBillStatus = (bill) => {
    const balanceDue = parseFloat(bill.amount) - parseFloat(bill.amount_paid || 0);

    if (bill.is_paid || balanceDue <= 0) return { label: "PAID", color: "success", canPay: false };

    const pendingPayment = payments.find(p =>
        (!p.is_verified && p.status !== 'rejected') &&
        p.payment_type === bill.bill_type &&
        parseFloat(p.amount) <= balanceDue 
    );

    if (pendingPayment) {
        return { label: "VERIFYING", color: "info", canPay: false };
    }

    if (parseFloat(bill.amount_paid) > 0) {
        return { label: "PARTIALLY PAID", color: "warning", canPay: true };
    }

    return { label: "UNPAID", color: "error", canPay: true };
  };

  const handlePayBill = (bill) => {
    const balanceDue = parseFloat(bill.amount) - parseFloat(bill.amount_paid || 0);
    
    setIsBillPayment(true);
    setFieldErrors({});
    setError('');
    setSuccess('');
    
    setPayForm({
        amount: balanceDue > 0 ? balanceDue : 0,
        payment_type: bill.bill_type,
        method: 'mpesa',
        phone: '',
        payment_date: new Date().toISOString().split('T')[0]
    });
    setOpenPayDialog(true);
  };

  const handleOpenGenericPayment = () => {
    setIsBillPayment(false);
    setFieldErrors({});
    setError('');
    setSuccess('');
    setPayForm({
        amount: '', payment_type: 'rent', method: 'mpesa',
        phone: '', payment_date: new Date().toISOString().split('T')[0]
    });
    setOpenPayDialog(true);
  };

  const handleInitiatePayment = async () => {
    setSaving(true);
    setFieldErrors({});
    setError('');
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
            setSuccess('STK Push initiated! Please check your phone to enter your M-Pesa PIN.');
            setError('');
            setOpenPayDialog(false);
            setTimeout(() => fetchData(), 5000); 
        } else {
            const errorData = await res.json();
            const { global, fields } = parseBackendErrors(errorData);
            setError(global || errorData.error || 'Failed to initiate STK push. Check your phone number.');
            setFieldErrors(fields || {});
        }
    } catch (err) {
        setError('Network error occurred');
    } finally {
        setSaving(false);
    }
  };

  const handlePayFormChange = (field, value) => {
    setPayForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  const getStatusChip = (p) => {
      if(p.status === 'rejected') return <Chip label="Rejected" color="error" size="small" />;
      if(p.status === 'verified' || p.is_verified) return <Chip label="Verified" color="success" size="small" />;
      if(p.payment_method === 'mpesa') return <Chip label="Awaiting Auto-Verify" color="info" size="small" />;
      return <Chip label="Pending Admin Verify" color="warning" size="small" />;
  };

  // Use the branded LogoLoader for the initial full-page data fetch
  if (loading) return <LogoLoader />;

  return (
    <Container maxWidth="lg">
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" fontWeight="bold">My Payments & Bills</Typography>
        <Button variant="contained" color="success" startIcon={<AddCardIcon />} onClick={handleOpenGenericPayment}>
            Make Payment
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: outstandingBalance > 100 ? '#ffebee' : '#e8f5e9' }}>
                <CardContent>
                    <Typography color="textSecondary" gutterBottom>Outstanding Balance</Typography>
                    <Typography variant="h3" fontWeight="bold" color={outstandingBalance > 100 ? 'error' : 'success'}>
                        {formatCurrency(outstandingBalance > 0 ? outstandingBalance : 0)}
                    </Typography>
                    <Typography variant="caption">
                        {outstandingBalance > 100 ? "You have pending dues." : "You are all clear!"}
                    </Typography>
                </CardContent>
            </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 4 }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} variant="fullWidth">
            <Tab icon={<ReceiptLongIcon />} label="My Bills (Invoices)" />
            <Tab icon={<HistoryIcon />} label="Payment History" />
        </Tabs>
      </Paper>

      {tabIndex === 0 && (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Bill For</TableCell>
                        <TableCell>Amount Due</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Action</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {bills.length === 0 ? (
                        <TableRow><TableCell colSpan={6} align="center">No bills found.</TableCell></TableRow>
                    ) : (
                        bills.map((bill) => {
                            const status = getBillStatus(bill);
                            const balanceDue = parseFloat(bill.amount) - parseFloat(bill.amount_paid || 0);

                            return (
                                <TableRow key={bill.id}>
                                    <TableCell>{new Date(bill.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell><Chip label={bill.bill_type.toUpperCase()} variant="outlined" /></TableCell>
                                    <TableCell>
                                        <Typography fontWeight="bold">
                                            {formatCurrency(balanceDue > 0 ? balanceDue : 0)}
                                        </Typography>
                                        {parseFloat(bill.amount_paid) > 0 && balanceDue > 0 && (
                                            <Typography variant="caption" color="textSecondary" display="block">
                                                Original: {formatCurrency(bill.amount)}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>{bill.description || '-'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={status.label}
                                            color={status.color}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {status.canPay ? (
                                            <Button size="small" variant="contained" onClick={() => handlePayBill(bill)}>
                                                Pay This
                                            </Button>
                                        ) : (
                                            <Typography variant="caption" color="textSecondary">
                                                {status.label === 'VERIFYING' ? 'Verifying...' : 'Completed'}
                                            </Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </TableContainer>
      )}

      {tabIndex === 1 && (
        <TableContainer component={Paper}>
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
                    {payments.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center">No payments made yet.</TableCell></TableRow>
                    ) : (
                        payments.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                                <TableCell>{p.payment_type.toUpperCase()}</TableCell>
                                <TableCell>{formatCurrency(p.amount)}</TableCell>
                                <TableCell>{p.payment_method.toUpperCase()}</TableCell>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        {getStatusChip(p)}
                                        {p.status === 'rejected' && (
                                            <Tooltip title={p.rejection_reason || "No reason provided"}>
                                                <InfoIcon color="error" fontSize="small" style={{cursor:'pointer'}}/>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
      )}

      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{isBillPayment ? "Pay Bill" : "Make a Payment"}</DialogTitle>
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
                    disabled={isBillPayment}
                    error={!!fieldErrors.amount}
                    helperText={fieldErrors.amount}
                />
                <TextField
                    select
                    label="Payment For"
                    value={payForm.payment_type}
                    onChange={(e) => handlePayFormChange('payment_type', e.target.value)}
                    fullWidth
                    disabled={isBillPayment}
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
            <Button onClick={handleInitiatePayment} variant="contained" color="success" disabled={saving}>
                {saving ? "Processing..." : "Pay Now"}
            </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TenantPayments;