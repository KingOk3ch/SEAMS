import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Tabs, Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptIcon from '@mui/icons-material/Receipt';

function PaymentManagement() {
  const [tabIndex, setTabIndex] = useState(0); 
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openBillDialog, setOpenBillDialog] = useState(false);
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

      // --- 1. Handle Payments ---
      let payData = await payRes.json();
      if (payData.results) payData = payData.results;
      // Sort: Unverified (false) comes before Verified (true)
      payData.sort((a, b) => (a.is_verified === b.is_verified) ? 0 : a.is_verified ? 1 : -1);

      // --- 2. Handle Bills (Pending at Top) ---
      let billData = await billRes.json();
      if (billData.results) billData = billData.results;
      // Sort: Unpaid (false) comes before Paid (true)
      billData.sort((a, b) => (a.is_paid === b.is_paid) ? 0 : a.is_paid ? 1 : -1);

      // --- 3. Handle Tenants ---
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

  const handleVerifyPayment = async (id) => {
    if(!window.confirm("Confirm verification?")) return;
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8000/api/payments/${id}/verify/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) fetchData();
        else alert("Verification failed");
    } catch(err) { alert("Error verifying"); }
  };

  const handleSavePayment = async () => {
    setSaving(true);
    await postData('http://localhost:8000/api/payments/', payForm);
    setOpenPayDialog(false);
    setSaving(false);
  };

  const handleSaveBill = async () => {
    setSaving(true);
    await postData('http://localhost:8000/api/bills/', billForm);
    setOpenBillDialog(false);
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
            alert("Saved successfully!");
        } else {
             alert("Failed to save.");
        }
    } catch(err) { alert("Network Error"); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>Financial Management</Typography>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} textColor="primary" indicatorColor="primary">
            <Tab label="Payments Received" />
            <Tab label="Bills & Invoices" />
        </Tabs>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* --- TAB 1: PAYMENTS --- */}
      {tabIndex === 0 && (
        <>
            <Box display="flex" justifyContent="flex-end" mb={2}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenPayDialog(true)}>
                    Record Payment
                </Button>
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Tenant</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Ref (Last 4)</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {payments.map((p) => {
                            const t = tenants.find(ten => ten.id === p.tenant);
                            const name = t ? `${t.user.first_name} ${t.user.last_name}` : 'Unknown';
                            const house = t ? (t.house_number || (t.house ? t.house.house_number : '')) : '';

                            return (
                            <TableRow 
                                key={p.id}
                                sx={{
                                    bgcolor: !p.is_verified ? '#fffde7' : 'inherit',
                                    '&:hover': { bgcolor: !p.is_verified ? '#fff9c4' : 'rgba(0,0,0,0.04)' }
                                }}
                            >
                                <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                                <TableCell>{name} ({house})</TableCell>
                                <TableCell>{p.payment_type.toUpperCase()}</TableCell>
                                <TableCell>{formatCurrency(p.amount)}</TableCell>
                                <TableCell>
                                    <Typography fontWeight="bold">{p.reference_number}</Typography>
                                    <Typography variant="caption" display="block">{p.payment_method}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label={p.is_verified ? "Verified" : "Pending"} 
                                        color={p.is_verified ? "success" : "warning"} 
                                        size="small" 
                                    />
                                </TableCell>
                                <TableCell>
                                    {!p.is_verified && (
                                        <Button size="small" variant="contained" onClick={() => handleVerifyPayment(p.id)}>
                                            Verify
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        )})}
                        {payments.length === 0 && <TableRow><TableCell colSpan={7} align="center">No payments found.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
      )}

      {/* --- TAB 2: BILLS --- */}
      {tabIndex === 1 && (
        <>
            <Box display="flex" justifyContent="flex-end" mb={2}>
                <Button variant="contained" color="secondary" startIcon={<ReceiptIcon />} onClick={() => setOpenBillDialog(true)}>
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
                            <TableCell>Status</TableCell>
                            <TableCell>Description</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bills.map((b) => {
                            const t = tenants.find(ten => ten.id === b.tenant);
                            const name = t ? `${t.user.first_name} ${t.user.last_name}` : 'Unknown';
                            const house = t ? (t.house_number || (t.house ? t.house.house_number : '')) : '';
                            return (
                            <TableRow key={b.id}>
                                <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>{name} ({house})</TableCell>
                                <TableCell><Chip label={b.bill_type.toUpperCase()} variant="outlined" /></TableCell>
                                <TableCell>{formatCurrency(b.amount)}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={b.is_paid ? "PAID" : "Pending"} 
                                        color={b.is_paid ? "success" : "error"} 
                                        size="small" 
                                    />
                                </TableCell>
                                <TableCell>{b.description || '-'}</TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
      )}

      {/* DIALOGS */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Manual Payment</DialogTitle>
        <DialogContent>
            <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField select label="Tenant" value={payForm.tenant} onChange={(e) => setPayForm({...payForm, tenant: e.target.value})} fullWidth>
                    {tenants.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                            {t.user.first_name} {t.user.last_name} ({t.house_number || (t.house ? t.house.house_number : '')})
                        </MenuItem>
                    ))}
                </TextField>
                <TextField label="Amount" type="number" value={payForm.amount} onChange={(e) => setPayForm({...payForm, amount: e.target.value})} fullWidth />
                <TextField select label="Type" value={payForm.payment_type} onChange={(e) => setPayForm({...payForm, payment_type: e.target.value})} fullWidth>
                    {['rent','water','electricity','garbage','damage','deposit','penalty','other'].map(o => <MenuItem key={o} value={o}>{o.toUpperCase()}</MenuItem>)}
                </TextField>
                <TextField label="Date Paid" type="date" value={payForm.payment_date} onChange={(e) => setPayForm({...payForm, payment_date: e.target.value})} fullWidth InputLabelProps={{ shrink: true }} />
                 <TextField select label="Method" value={payForm.payment_method} onChange={(e) => setPayForm({...payForm, payment_method: e.target.value})} fullWidth>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="bank">Bank Transfer</MenuItem>
                    <MenuItem value="mpesa">M-Pesa (Manual)</MenuItem>
                </TextField>
                {/* 4 DIGIT RESTRICTION */}
                <TextField 
                    label="Transaction Ref (Last 4 Digits)" 
                    value={payForm.reference_number} 
                    onChange={(e) => setPayForm({...payForm, reference_number: e.target.value})} 
                    fullWidth 
                    inputProps={{ maxLength: 4 }} 
                    helperText="Please enter only the last 4 characters"
                />
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenPayDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openBillDialog} onClose={() => setOpenBillDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Post New Bill</DialogTitle>
        <DialogContent>
            <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField select label="Tenant" value={billForm.tenant} onChange={(e) => setBillForm({...billForm, tenant: e.target.value})} fullWidth>
                    {tenants.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                            {t.user.first_name} {t.user.last_name} ({t.house_number || (t.house ? t.house.house_number : '')})
                        </MenuItem>
                    ))}
                </TextField>
                <TextField select label="Bill Type" value={billForm.bill_type} onChange={(e) => setBillForm({...billForm, bill_type: e.target.value})} fullWidth>
                    {['water','electricity','garbage','damage','penalty','other'].map(o => <MenuItem key={o} value={o}>{o.toUpperCase()}</MenuItem>)}
                </TextField>
                <TextField label="Amount" type="number" value={billForm.amount} onChange={(e) => setBillForm({...billForm, amount: e.target.value})} fullWidth />
                <TextField label="Month For" type="date" value={billForm.month_for} onChange={(e) => setBillForm({...billForm, month_for: e.target.value})} fullWidth InputLabelProps={{ shrink: true }} />
                <TextField label="Description (Optional)" value={billForm.description} onChange={(e) => setBillForm({...billForm, description: e.target.value})} fullWidth multiline rows={2} />
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenBillDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveBill} variant="contained" color="secondary">Post Bill</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default PaymentManagement;