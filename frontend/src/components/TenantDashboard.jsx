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
  Chip
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PaymentIcon from '@mui/icons-material/Payment';
import BuildIcon from '@mui/icons-material/Build';

function TenantDashboard() {
  const [tenantData, setTenantData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!tenantData) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning">No tenant record found for your account.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        My Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <HomeIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">My House</Typography>
                  <Typography variant="h4">{tenantData.house_number}</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Monthly Rent: {formatCurrency(tenantData.house?.rent_amount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PaymentIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">Payments</Typography>
                  <Typography variant="h4">{payments.length}</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Paid: {formatCurrency(payments.reduce((sum, p) => sum + parseFloat(p.amount), 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BuildIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">Maintenance</Typography>
                  <Typography variant="h4">{maintenance.length}</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Pending: {maintenance.filter(m => m.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Contract Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Contract Information
        </Typography>
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
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Recent Payments</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Reference</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.slice(0, 5).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <Chip label={payment.payment_method.toUpperCase()} size="small" />
                  </TableCell>
                  <TableCell>{payment.reference_number || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Recent Maintenance */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">My Maintenance Requests</Typography>
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
    </Container>
  );
}

export default TenantDashboard;