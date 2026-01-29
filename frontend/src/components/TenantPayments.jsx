import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, CircularProgress, Grid, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tabs, Tab, Tooltip
} from '@mui/material';
import AddCardIcon from '@mui/icons-material/AddCard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import InfoIcon from '@mui/icons-material/Info';

function TenantPayments() {
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tenantData, setTenantData] = useState(null);
  const [outstandingBalance, setOutstandingBalance] = useState(0);

  // Payment Dialog
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [isBillPayment, setIsBillPayment] = useState(false);

  const [payForm, setPayForm] = useState({
    amount: '', payment_type: 'rent', method: 'bank', reference: '', 
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

        // --- SORTING LOGIC: Pending (1) > Rejected (2) > Verified (3) ---
        myPayments.sort((a, b) => {
            const getScore = (p) => {
                // Verified/Completed -> Bottom
                if (p.is_verified || p.status === 'verified') return 3;
                // Rejected -> Middle
                if (p.status === 'rejected') return 2;
                // Pending (Actionable) -> Top
                return 1;
            };
            const scoreA = getScore(a);
            const scoreB = getScore(b);
            
            if (scoreA !== scoreB) return scoreA - scoreB; // Lower score first
            return new Date(b.payment_date) - new Date(a.payment_date); // Newest date first
        });

        setBills(myBills);
        setPayments(myPayments);
        setTenantData(myTenant);

        const totalUnpaid = myBills
            .filter(b => !b.is_paid)
            .reduce((sum, b) => sum + parseFloat(b.amount), 0);
        
        setOutstandingBalance(totalUnpaid);
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load financial data.');
      setLoading(false);
    }
  };

  // --- SMART CHECK ---
  const getBillStatus = (bill) => {
    if (bill.is_paid) return { label: "PAID", color: "success", canPay: false };

    // Find if there is a blocking payment.
    // A payment blocks the bill ONLY if it is:
    // 1. Not Verified AND
    // 2. Not Rejected
    const pendingPayment = payments.find(p => 
        (!p.is_verified && p.status !== 'rejected') && 
        parseFloat(p.amount) === parseFloat(bill.amount) && 
        p.payment_type === bill.bill_type
    );

    if (pendingPayment) {
        return { label: "Pending", color: "warning", canPay: false };
    }

    return { label: "UNPAID", color: "error", canPay: true };
  };

  const handlePayBill = (bill) => {
    setIsBillPayment(true);
    setPayForm({
        ...payForm,
        amount: bill.amount,
        payment_type: bill.bill_type, 
        payment_date: new Date().toISOString().split('T')[0],
        reference: '' 
    });
    setOpenPayDialog(true);
  };

  const handleOpenGenericPayment = () => {
    setIsBillPayment(false);
    setPayForm({
        amount: '', payment_type: 'rent', method: 'bank', reference: '', 
        phone: '', payment_date: new Date().toISOString().split('T')[0]
    });
    setOpenPayDialog(true);
  };

  const handleInitiatePayment = async () => {
    setSaving(true);
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
            fetchData();
        } else {
            const errData = await res.json();
            alert(`Failed: ${JSON.stringify(errData)}`);
        }
    } catch (err) {
        alert("Network error");
    } finally {
        setSaving(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  // Status Chip Helper
  const getStatusChip = (p) => {
      if(p.status === 'rejected') return <Chip label="Rejected" color="error" size="small" />;
      if(p.status === 'verified' || p.is_verified) return <Chip label="Verified" color="success" size="small" />;
      return <Chip label="Pending" color="warning" size="small" />;
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg">
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" fontWeight="bold">My Payments & Bills</Typography>
        <Button variant="contained" color="success" startIcon={<AddCardIcon />} onClick={handleOpenGenericPayment}>
            Make Payment
        </Button>
      </Box>

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

      {/* --- BILLS TAB --- */}
      {tabIndex === 0 && (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Bill For</TableCell>
                        <TableCell>Amount</TableCell>
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
                            
                            return (
                                <TableRow key={bill.id}>
                                    <TableCell>{new Date(bill.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell><Chip label={bill.bill_type.toUpperCase()} variant="outlined" /></TableCell>
                                    <TableCell fontWeight="bold">{formatCurrency(bill.amount)}</TableCell>
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
                                                {status.label === 'Pending' ? 'Verifying...' : 'Completed'}
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

      {/* --- PAYMENTS TAB --- */}
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

      {/* --- DIALOG --- */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{isBillPayment ? "Pay Bill" : "Make a Payment"}</DialogTitle>
        <DialogContent>
            <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField 
                    label="Amount (KES)" 
                    type="number" 
                    value={payForm.amount} 
                    onChange={(e) => setPayForm({...payForm, amount: e.target.value})} 
                    fullWidth 
                    // FIX: Lock field if paying a specific bill
                    disabled={isBillPayment}
                />
                <TextField 
                    select 
                    label="Payment For" 
                    value={payForm.payment_type} 
                    onChange={(e) => setPayForm({...payForm, payment_type: e.target.value})} 
                    fullWidth
                    // FIX: Lock field if paying a specific bill
                    disabled={isBillPayment}
                >
                    {/* Added 'penalty' to list */}
                    {['rent','water','electricity','garbage','damage','deposit','penalty','other'].map(o => <MenuItem key={o} value={o}>{o.toUpperCase()}</MenuItem>)}
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
                
                {/* 4 DIGIT RESTRICTION */}
                <TextField 
                    label="Transaction Ref (Last 4 Digits)" 
                    value={payForm.reference} 
                    onChange={(e) => setPayForm({...payForm, reference: e.target.value})} 
                    fullWidth 
                    inputProps={{ maxLength: 4 }} 
                    helperText="Enter only the last 4 characters"
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