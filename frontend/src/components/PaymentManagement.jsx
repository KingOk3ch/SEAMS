import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Tabs, Tab, Badge
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HistoryIcon from '@mui/icons-material/History';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { parseBackendErrors } from '../utils/errorHandler';
import LogoLoader from './LogoLoader';

function PaymentManagement() {
  // 0: Verification Queue (Default), 1: Payment History, 2: Bills
  const [tabIndex, setTabIndex] = useState(0);
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Tracks which specific payment row is currently processing a verification to show localized loading spinners
  const [processingId, setProcessingId] = useState(null);

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openBillDialog, setOpenBillDialog] = useState(false);

  // Reject Dialog
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [saving, setSaving] = useState(false);

  const [payForm, setPayForm] = useState({
    tenant: '', amount: '', payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash', payment_type: 'rent', reference_number: '',
    month_for: new Date().toISOString().split('T')[0]
  });

  const [billForm, setBillForm] = useState({
    tenant: '', bill_type: 'water', amount: '',
    month_for: new Date().toISOString().split('T')[0], description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [payRes, billRes, tenRes] = await Promise.all([
        fetch('http://localhost:8000/api/payments/', { headers }),
        fetch('http://localhost:8000/api/bills/', { headers }),
        fetch('http://localhost:8000/api/tenants/', { headers })
      ]);

      let payData = await payRes.json();
      if (payData.results) payData = payData.results;

      // Sort: Pending first, then by date
      payData.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return new Date(b.payment_date) - new Date(a.payment_date);
      });

      let billData = await billRes.json();
      if (billData.results) billData = billData.results;
      billData.sort((a, b) => (a.is_paid === b.is_paid) ? 0 : a.is_paid ? 1 : -1);

      let tenData = await tenRes.json();
      if (tenData.results) tenData = tenData.results;

      setPayments(payData);
      setBills(billData);
      setTenants(tenData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  // --- SMART VERIFY HANDLER ---
  const handleVerifyPayment = async (id) => {
    if(!window.confirm("Confirm verification? This will automatically allocate funds to unpaid bills.")) return;
    
    setProcessingId(id);
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8000/api/payments/${id}/verify/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if(res.ok) {
            // SHOW THE SMART MESSAGE FROM BACKEND (e.g. "Verified. 2 Bills Paid")
            setSuccess(data.message || 'Payment verified successfully');
            setError('');
            fetchData();
        } else {
            const { global } = parseBackendErrors(data);
            setError(global || 'Verification failed');
        }
    } catch(err) { 
        setError('Network error occurred');
    } finally {
        setProcessingId(null);
    }
  };

  const handleOpenReject = (id) => {
      setSelectedPaymentId(id);
      setRejectReason('');
      setFieldErrors({}); 
      setOpenRejectDialog(true);
  };

  const handleRejectPayment = async () => {
      if(!rejectReason.trim()) {
          setFieldErrors({ reason: 'Rejection reason is required' });
          return;
      }
      setSaving(true);
      setFieldErrors({});
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8000/api/payments/${selectedPaymentId}/reject/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: rejectReason })
        });
        if(res.ok) {
            setSuccess('Payment rejected and tenant notified');
            setError('');
            setOpenRejectDialog(false);
            fetchData();
        } else {
            const data = await res.json();
            const { global, fields } = parseBackendErrors(data);
            setError(global || 'Failed to reject payment');
            setFieldErrors(fields);
        }
      } catch(err) { 
          setError('Network error occurred');
      }
      finally { setSaving(false); }
  };

  const handleSavePayment = async () => {
    setSaving(true);
    setFieldErrors({});
    setError('');
    await postData('http://localhost:8000/api/payments/', payForm);
    setSaving(false);
  };

  const handleSaveBill = async () => {
    setSaving(true);
    setFieldErrors({});
    setError('');
    await postData('http://localhost:8000/api/bills/', billForm);
    setSaving(false);
  };

  const postData = async (url, data) => {
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if(res.ok) {
            fetchData();
            setSuccess('Saved successfully!');
            setError('');
            if(url.includes('payments')) setOpenPayDialog(false);
            if(url.includes('bills')) setOpenBillDialog(false);
        } else {
            const errorData = await res.json();
            const { global, fields } = parseBackendErrors(errorData);
            setError(global || 'Failed to save. Please check the form.');
            setFieldErrors(fields);
        }
    } catch(err) { 
        setError('Network error occurred');
    }
  };

  const handlePayFormChange = (field, value) => {
    setPayForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleBillFormChange = (field, value) => {
    setBillForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  const getStatusChip = (status) => {
      if (status === 'rejected') return <Chip label="Rejected" color="error" size="small" />;
      if (status === 'verified') return <Chip label="Verified" color="success" size="small" />;
      return <Chip label="Pending Action" color="warning" variant="filled" size="small" />;
  };

  // --- FILTERING LOGIC ---
  const pendingPayments = payments.filter(p => p.status === 'pending');
  // History = Verified OR Rejected
  const historyPayments = payments.filter(p => p.status !== 'pending');

  if (loading) return <LogoLoader />;

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>Financial Management</Typography>
        
        {/* --- CLEANER TABS --- */}
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} textColor="primary" indicatorColor="primary" variant="scrollable" scrollButtons="auto">
            {/* TAB 0: VERIFICATION QUEUE */}
            <Tab 
                icon={<Badge badgeContent={pendingPayments.length} color="error"><AssignmentTurnedInIcon /></Badge>} 
                iconPosition="start" 
                label="Verification Queue" 
            />
            {/* TAB 1: HISTORY */}
            <Tab icon={<HistoryIcon />} iconPosition="start" label="Payment History" />
            {/* TAB 2: BILLS */}
            <Tab icon={<ReceiptIcon />} iconPosition="start" label="Bills & Invoices" />
        </Tabs>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* --- TAB 0: VERIFICATION QUEUE (ACTIONABLE) --- */}
      {tabIndex === 0 && (
          <>
            <Box display="flex" justifyContent="flex-end" mb={2}>
                 {/* Only show "Add" if you really need manual entry here, otherwise keep it clean */}
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { setOpenPayDialog(true); setFieldErrors({}); }}>
                    Manual Entry
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Date</strong></TableCell>
                            <TableCell><strong>Tenant</strong></TableCell>
                            <TableCell><strong>Type</strong></TableCell>
                            <TableCell><strong>Amount</strong></TableCell>
                            <TableCell><strong>Ref (Last 4)</strong></TableCell>
                            <TableCell><strong>Method</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pendingPayments.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}><Typography color="text.secondary">All caught up! No pending payments.</Typography></TableCell></TableRow>
                        ) : (
                            pendingPayments.map((p) => {
                                const t = tenants.find(ten => ten.id === p.tenant);
                                const name = t ? `${t.user.first_name} ${t.user.last_name}` : 'Unknown';
                                return (
                                <TableRow key={p.id} hover>
                                    <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{name}</TableCell>
                                    <TableCell><Chip label={p.payment_type.toUpperCase()} size="small" /></TableCell>
                                    <TableCell><strong>{formatCurrency(p.amount)}</strong></TableCell>
                                    <TableCell>{p.reference_number}</TableCell>
                                    <TableCell>{p.payment_method}</TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" justifyContent="center" gap={1}>
                                            <Button 
                                                variant="contained" 
                                                color="success" 
                                                size="small" 
                                                startIcon={processingId === p.id ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                                                disabled={processingId === p.id}
                                                onClick={() => handleVerifyPayment(p.id)}
                                            >
                                                {processingId === p.id ? 'Verifying...' : 'Verify'}
                                            </Button>
                                            <Button 
                                                variant="outlined" 
                                                color="error" 
                                                size="small" 
                                                startIcon={<CancelIcon />}
                                                disabled={processingId === p.id}
                                                onClick={() => handleOpenReject(p.id)}
                                            >
                                                Reject
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
          </>
      )}

      {/* --- TAB 1: HISTORY (READ ONLY) --- */}
      {tabIndex === 1 && (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Tenant</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Ref</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Details</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {historyPayments.map((p) => {
                        const t = tenants.find(ten => ten.id === p.tenant);
                        const name = t ? `${t.user.first_name} ${t.user.last_name}` : 'Unknown';
                        return (
                        <TableRow key={p.id}>
                            <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                            <TableCell>{name}</TableCell>
                            <TableCell>{p.payment_type.toUpperCase()}</TableCell>
                            <TableCell>{formatCurrency(p.amount)}</TableCell>
                            <TableCell>{p.reference_number}</TableCell>
                            <TableCell>{getStatusChip(p.status)}</TableCell>
                            <TableCell>
                                {p.status === 'rejected' ? 
                                    <Typography variant="caption" color="error">{p.rejection_reason}</Typography> : 
                                    <Typography variant="caption" color="text.secondary">Processed</Typography>
                                }
                            </TableCell>
                        </TableRow>
                    )})}
                    {historyPayments.length === 0 && <TableRow><TableCell colSpan={7} align="center">No history available.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </TableContainer>
      )}

      {/* --- TAB 2: BILLS --- */}
      {tabIndex === 2 && (
        <>
            <Box display="flex" justifyContent="flex-end" mb={2}>
                <Button variant="contained" color="secondary" startIcon={<ReceiptLongIcon />} onClick={() => { setOpenBillDialog(true); setFieldErrors({}); setError(''); }}>
                    Post New Bill
                </Button>
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date Posted</TableCell>
                            <TableCell>Tenant</TableCell>
                            <TableCell>Bill Type</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Paid</TableCell>
                            <TableCell>Balance</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bills.map((b) => {
                            const t = tenants.find(ten => ten.id === b.tenant);
                            const name = t ? `${t.user.first_name} ${t.user.last_name}` : 'Unknown';
                            return (
                            <TableRow key={b.id}>
                                <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>{name}</TableCell>
                                <TableCell><Chip label={b.bill_type.toUpperCase()} variant="outlined" size="small" /></TableCell>
                                <TableCell>{formatCurrency(b.amount)}</TableCell>
                                <TableCell sx={{ color: 'green' }}>{formatCurrency(b.amount_paid)}</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>{formatCurrency(b.balance)}</TableCell>
                                <TableCell><Chip label={b.is_paid ? "PAID" : "Pending"} color={b.is_paid ? "success" : "error"} size="small" /></TableCell>
                            </TableRow>
                        )})}
                        {bills.length === 0 && <TableRow><TableCell colSpan={7} align="center">No bills posted.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
      )}

      {/* REJECT DIALOG */}
      <Dialog open={openRejectDialog} onClose={() => setOpenRejectDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Payment</DialogTitle>
        <DialogContent>
            <Typography variant="body2" gutterBottom>Please explain why this payment is being rejected.</Typography>
            <TextField autoFocus margin="dense" label="Rejection Reason" fullWidth variant="outlined" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} error={!!fieldErrors.reason} helperText={fieldErrors.reason} />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenRejectDialog(false)}>Cancel</Button>
            <Button onClick={handleRejectPayment} variant="contained" color="error" disabled={saving}>{saving ? "Rejecting..." : "Confirm Reject"}</Button>
        </DialogActions>
      </Dialog>

      {/* MANUAL PAYMENT DIALOG */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
            <Box component="form" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" icon={<AddIcon />}>Record a manual payment below</Alert>
                <TextField select label="Tenant" value={payForm.tenant} onChange={(e) => handlePayFormChange('tenant', e.target.value)} fullWidth error={!!fieldErrors.tenant} helperText={fieldErrors.tenant}>
                    {tenants.map((t) => (
                        <MenuItem key={t.id} value={t.id}>{t.user.first_name} {t.user.last_name} ({t.house_number || (t.house ? t.house.house_number : '')})</MenuItem>
                    ))}
                </TextField>
                <TextField label="Amount" type="number" value={payForm.amount} onChange={(e) => handlePayFormChange('amount', e.target.value)} fullWidth error={!!fieldErrors.amount} helperText={fieldErrors.amount} />
                <TextField select label="Type" value={payForm.payment_type} onChange={(e) => handlePayFormChange('payment_type', e.target.value)} fullWidth error={!!fieldErrors.payment_type} helperText={fieldErrors.payment_type}>
                    {['rent','water','electricity','garbage','damage','deposit','penalty','other'].map(o => <MenuItem key={o} value={o}>{o.toUpperCase()}</MenuItem>)}
                </TextField>
                <TextField label="Date Paid" type="date" value={payForm.payment_date} onChange={(e) => handlePayFormChange('payment_date', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} error={!!fieldErrors.payment_date} helperText={fieldErrors.payment_date} />
                 <TextField select label="Method" value={payForm.payment_method} onChange={(e) => handlePayFormChange('payment_method', e.target.value)} fullWidth error={!!fieldErrors.payment_method} helperText={fieldErrors.payment_method}>
                    <MenuItem value="cash">Cash</MenuItem><MenuItem value="bank">Bank Transfer</MenuItem><MenuItem value="mpesa">M-Pesa (Manual)</MenuItem>
                </TextField>
                <TextField label="Ref (Last 4 Digits)" value={payForm.reference_number} onChange={(e) => handlePayFormChange('reference_number', e.target.value)} fullWidth inputProps={{ maxLength: 10 }} helperText={fieldErrors.reference_number} error={!!fieldErrors.reference_number} />
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenPayDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* BILL DIALOG */}
      <Dialog open={openBillDialog} onClose={() => setOpenBillDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Post New Bill</DialogTitle>
        <DialogContent>
            <Box component="form" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" icon={<ReceiptLongIcon />}>
                    Create a new invoice for a tenant
                </Alert>
                <TextField select label="Tenant" value={billForm.tenant} onChange={(e) => handleBillFormChange('tenant', e.target.value)} fullWidth error={!!fieldErrors.tenant} helperText={fieldErrors.tenant}>
                    {tenants.map((t) => (
                        <MenuItem key={t.id} value={t.id}>{t.user.first_name} {t.user.last_name} ({t.house_number || (t.house ? t.house.house_number : '')})</MenuItem>
                    ))}
                </TextField>
                <TextField select label="Bill Type" value={billForm.bill_type} onChange={(e) => handleBillFormChange('bill_type', e.target.value)} fullWidth error={!!fieldErrors.bill_type} helperText={fieldErrors.bill_type}>
                    {['water','electricity','garbage','damage','penalty','other'].map(o => <MenuItem key={o} value={o}>{o.toUpperCase()}</MenuItem>)}
                </TextField>
                <TextField label="Amount (KES)" type="number" value={billForm.amount} onChange={(e) => handleBillFormChange('amount', e.target.value)} fullWidth error={!!fieldErrors.amount} helperText={fieldErrors.amount} />
                <TextField label="Month For" type="date" value={billForm.month_for} onChange={(e) => handleBillFormChange('month_for', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} error={!!fieldErrors.month_for} helperText={fieldErrors.month_for} />
                <TextField label="Description (Optional)" value={billForm.description} onChange={(e) => handleBillFormChange('description', e.target.value)} fullWidth multiline rows={3} error={!!fieldErrors.description} helperText={fieldErrors.description} />
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenBillDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveBill} variant="contained" color="secondary" disabled={saving}>{saving ? 'Posting...' : 'Post Bill'}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default PaymentManagement;