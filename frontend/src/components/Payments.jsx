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
  Chip,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/payments/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      } else {
        setError('Failed to fetch payments');
      }
      setLoading(false);
    } catch (err) {
      setError('Connection error');
      setLoading(false);
      console.error('Error:', err);
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'mpesa': return 'success';
      case 'bank': return 'primary';
      case 'cash': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>
            Payment Records
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />}>
            Record Payment
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Total Payments: {payments.length}
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Tenant</strong></TableCell>
              <TableCell><strong>House</strong></TableCell>
              <TableCell><strong>Amount (KSH)</strong></TableCell>
              <TableCell><strong>Method</strong></TableCell>
              <TableCell><strong>Reference</strong></TableCell>
              <TableCell><strong>Month For</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} hover>
                <TableCell>{formatDate(payment.payment_date)}</TableCell>
                <TableCell>{payment.tenant_name}</TableCell>
                <TableCell>{payment.house_number}</TableCell>
                <TableCell>{payment.amount.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    label={payment.payment_method.toUpperCase()} 
                    color={getMethodColor(payment.payment_method)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{payment.reference_number}</TableCell>
                <TableCell>{formatDate(payment.month_for)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default Payments;