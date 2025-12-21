import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Tabs, Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptIcon from '@mui/icons-material/Receipt';

function PaymentManagement() {
  const [tabIndex, setTabIndex] = useState(0); // 0 = Payments, 1 = Bills
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dialogs
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openBillDialog, setOpenBillDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Forms
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

      setPayments(await payRes.json());
      setBills(await billRes.json());
      setTenants(await tenRes.json());
      setLoading(false);
    } catch (err) {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (id) => {
    if(!window.confirm("Confirm this payment is real?")) return;
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8000/api/payments/${id}/verify/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.status === 'verified') {
            alert(data.message); // Shows "X Bills marked as Paid"
            fetchData();
        }
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
        if(res.ok) fetchData();
        else alert("Failed to save");
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
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {payments.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                                <TableCell>{p.tenant_name} ({p.house_number})</TableCell>
                                <TableCell>{p.payment_type.toUpperCase()}</TableCell>
                                <TableCell>{formatCurrency(p.amount)}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={p.is_verified ? "Verified" : "Pending"} 
                                        color={p.is_verified ? "success" : "warning"} 
                                        size="small" 
                                    />
                                </TableCell>
                                <TableCell>
                                    {!p.is_verified && (
                                        <Button size="small" onClick={() => handleVerifyPayment(p.id)}>Verify</Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
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
                            <TableCell>Status</TableCell> {/* NEW COLUMN */}
                            <TableCell>Description</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bills.map((b) => (
                            <TableRow key={b.id}>
                                <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>{b.tenant_name} ({b.house_number})</TableCell>
                                <TableCell>
                                    <Chip label={b.bill_type.toUpperCase()} variant="outlined" />
                                </TableCell>
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
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
      )}

      {/* --- DIALOG: RECORD PAYMENT --- */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Manual Payment</DialogTitle>
        <DialogContent>
            <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField select label="Tenant" value={payForm.tenant} onChange={(e) => setPayForm({...payForm, tenant: e.target.value})} fullWidth>
                    {tenants.map((t) => <MenuItem key={t.id} value={t.id}>{t.user.first_name} {t.user.last_name} ({t.house?.house_number})</MenuItem>)}
                </TextField>
                <TextField label="Amount" type="number" value={payForm.amount} onChange={(e) => setPayForm({...payForm, amount: e.target.value})} fullWidth />
                <TextField select label="Type" value={payForm.payment_type} onChange={(e) => setPayForm({...payForm, payment_type: e.target.value})} fullWidth>
                    {['rent','water','electricity','garbage','damage','deposit','other'].map(o => <MenuItem key={o} value={o}>{o.toUpperCase()}</MenuItem>)}
                </TextField>
                <TextField label="Date Paid" type="date" value={payForm.payment_date} onChange={(e) => setPayForm({...payForm, payment_date: e.target.value})} fullWidth InputLabelProps={{ shrink: true }} />
                 <TextField select label="Method" value={payForm.payment_method} onChange={(e) => setPayForm({...payForm, payment_method: e.target.value})} fullWidth>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="bank">Bank Transfer</MenuItem>
                    <MenuItem value="mpesa">M-Pesa (Manual)</MenuItem>
                </TextField>
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenPayDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} variant="contained" disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG: POST BILL --- */}
      <Dialog open={openBillDialog} onClose={() => setOpenBillDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Post New Bill</DialogTitle>
        <DialogContent>
            <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField select label="Tenant" value={billForm.tenant} onChange={(e) => setBillForm({...billForm, tenant: e.target.value})} fullWidth>
                    {tenants.map((t) => <MenuItem key={t.id} value={t.id}>{t.user.first_name} {t.user.last_name} ({t.house?.house_number})</MenuItem>)}
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
            <Button onClick={handleSaveBill} variant="contained" color="secondary" disabled={saving}>Post Bill</Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}

export default PaymentManagement;