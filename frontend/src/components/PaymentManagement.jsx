import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

function PaymentManagement() {
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tenant: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    payment_type: 'rent',
    reference_number: '',
    month_for: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const [paymentsRes, tenantsRes] = await Promise.all([
        fetch('http://localhost:8000/api/payments/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/tenants/', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const paymentsData = await paymentsRes.json();
      const tenantsData = await tenantsRes.json();

      setPayments(paymentsData);
      setTenants(tenantsData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/payments/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchData();
        setOpenDialog(false);
        setFormData({
            tenant: '',
            amount: '',
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'cash',
            payment_type: 'rent',
            reference_number: '',
            month_for: new Date().toISOString().split('T')[0]
        });
      } else {
        alert('Failed to record payment');
      }
    } catch (err) {
      alert('Error saving payment');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">Payments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          Record Payment
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Tenant</TableCell>
              <TableCell>House</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Reference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                <TableCell>{payment.tenant_name}</TableCell>
                <TableCell>{payment.house_number}</TableCell>
                <TableCell>
                    <Chip 
                        label={payment.payment_type ? payment.payment_type.replace('_', ' ').toUpperCase() : 'RENT'} 
                        color="primary" 
                        variant="outlined" 
                        size="small" 
                    />
                </TableCell>
                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                <TableCell><Chip label={payment.payment_method.toUpperCase()} size="small" /></TableCell>
                <TableCell>{payment.reference_number || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Manual Payment Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Manual Payment</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Tenant"
              name="tenant"
              value={formData.tenant}
              onChange={handleInputChange}
              fullWidth
            >
              {tenants.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.user.first_name} {t.user.last_name} ({t.house?.house_number})
                </MenuItem>
              ))}
            </TextField>

            <TextField
                select
                label="Payment Type"
                name="payment_type"
                value={formData.payment_type}
                onChange={handleInputChange}
                fullWidth
            >
                <MenuItem value="rent">Rent</MenuItem>
                <MenuItem value="water">Water Bill</MenuItem>
                <MenuItem value="electricity">Electricity Bill</MenuItem>
                <MenuItem value="garbage">Garbage Fee</MenuItem>
                <MenuItem value="damage">Damage Repair</MenuItem>
                <MenuItem value="deposit">Security Deposit</MenuItem>
                <MenuItem value="other">Other</MenuItem>
            </TextField>

            <TextField
              label="Amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              fullWidth
            />

            <Box display="flex" gap={2}>
                <TextField
                label="Date Paid"
                name="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={handleInputChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                />
                <TextField
                select
                label="Method"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleInputChange}
                fullWidth
                >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="bank">Bank Transfer</MenuItem>
                <MenuItem value="mpesa">M-Pesa</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                </TextField>
            </Box>

            <TextField
              label="Reference Number"
              name="reference_number"
              value={formData.reference_number}
              onChange={handleInputChange}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default PaymentManagement;