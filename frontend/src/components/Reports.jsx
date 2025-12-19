import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Typography, Box, CircularProgress, Alert,
  Card, CardContent, Divider, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, IconButton, Snackbar, Tooltip
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import WarningIcon from '@mui/icons-material/Warning';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

// Register ChartJS components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, ChartTooltip, Legend, ArcElement
);

function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [debtors, setDebtors] = useState([]);

  // Alert State
  const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [summaryRes, trendsRes, occupancyRes, debtorsRes] = await Promise.all([
        fetch('http://localhost:8000/api/reports/dashboard_summary/', { headers }),
        fetch('http://localhost:8000/api/reports/monthly_trends/', { headers }),
        fetch('http://localhost:8000/api/reports/occupancy_stats/', { headers }),
        fetch('http://localhost:8000/api/reports/debtors_list/', { headers })
      ]);

      if (summaryRes.ok && trendsRes.ok && occupancyRes.ok && debtorsRes.ok) {
        setSummary(await summaryRes.json());
        setTrends(await trendsRes.json());
        setOccupancy(await occupancyRes.json());
        setDebtors(await debtorsRes.json());
      } else {
        setError('Failed to fetch some report data.');
      }
    } catch (err) {
      setError('Network error loading reports.');
    } finally {
      setLoading(false);
    }
  };

  const handlePingDebtor = async (tenantId, tenantName) => {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/reports/ping_debtor/', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tenant_id: tenantId })
        });

        if (response.ok) {
            setAlertInfo({ open: true, message: `Reminder sent to ${tenantName}!`, severity: 'success' });
        } else {
            setAlertInfo({ open: true, message: 'Failed to send reminder', severity: 'error' });
        }
    } catch (err) {
        setAlertInfo({ open: true, message: 'Network error', severity: 'error' });
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(val || 0);
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  // --- Chart Configurations ---

  const lineChartData = {
    labels: trends?.labels || [],
    datasets: [
      {
        label: 'Income (KES)',
        data: trends?.income || [],
        borderColor: 'rgb(46, 125, 50)', // Green
        backgroundColor: 'rgba(46, 125, 50, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Expenses (KES)',
        data: trends?.expense || [],
        borderColor: 'rgb(211, 47, 47)', // Red
        backgroundColor: 'rgba(211, 47, 47, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const occupancyChartData = {
    labels: ['Occupied', 'Vacant', 'Maintenance'],
    datasets: [
      {
        data: [
          occupancy?.occupancy.occupied || 0,
          occupancy?.occupancy.vacant || 0,
          occupancy?.occupancy.maintenance || 0,
        ],
        backgroundColor: [
          'rgba(46, 125, 50, 0.8)', // Green
          'rgba(25, 118, 210, 0.8)', // Blue
          'rgba(237, 108, 2, 0.8)',  // Orange
        ],
        borderWidth: 1,
      },
    ],
  };

  const maintenanceChartData = {
    labels: occupancy?.maintenance_categories.map(c => c.category.toUpperCase()) || [],
    datasets: [
      {
        label: 'Requests Count',
        data: occupancy?.maintenance_categories.map(c => c.count) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  };

  const StatCard = ({ title, value, subValue, icon, color }) => (
    <Card sx={{ height: '100%', borderLeft: `5px solid ${color}` }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography color="textSecondary" variant="caption" textTransform="uppercase">{title}</Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ my: 1 }}>{value}</Typography>
            {subValue && <Typography variant="body2" color="textSecondary">{subValue}</Typography>}
          </Box>
          <Box sx={{ color: color, p: 1, bgcolor: `${color}15`, borderRadius: '50%' }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold">Analytics & Reports</Typography>
        <Typography color="textSecondary">Financial and operational performance</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      {/* Alert Snackbar */}
      <Snackbar 
        open={alertInfo.open} 
        autoHideDuration={6000} 
        onClose={() => setAlertInfo({...alertInfo, open: false})}
      >
        <Alert severity={alertInfo.severity} sx={{ width: '100%' }}>
            {alertInfo.message}
        </Alert>
      </Snackbar>

      {/* 1. FINANCIAL SUMMARY CARDS */}
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} md={4}>
          <StatCard 
            title="Total Income" 
            value={formatCurrency(summary?.total_income)}
            subValue={`This Month: ${formatCurrency(summary?.monthly_income)}`}
            icon={<AttachMoneyIcon fontSize="large" />}
            color="#2e7d32" // Green
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard 
            title="Total Expenses" 
            value={formatCurrency(summary?.total_expenses)}
            subValue={`This Month: ${formatCurrency(summary?.monthly_expenses)}`}
            icon={<TrendingDownIcon fontSize="large" />}
            color="#d32f2f" // Red
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard 
            title="Net Profit" 
            value={formatCurrency(summary?.net_profit)}
            subValue="Income - Expenses"
            icon={<AccountBalanceWalletIcon fontSize="large" />}
            color="#1976d2" // Blue
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 2. INCOME VS EXPENSES CHART */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" gutterBottom>Financial Trends (6 Months)</Typography>
            <Box height="320px">
              <Line data={lineChartData} options={{ maintainAspectRatio: false, responsive: true }} />
            </Box>
          </Paper>
        </Grid>

        {/* 3. OCCUPANCY PIE CHART */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>Occupancy Rate</Typography>
            <Box height="250px" width="100%" display="flex" justifyContent="center">
              <Doughnut data={occupancyChartData} options={{ maintainAspectRatio: false }} />
            </Box>
            <Box mt={3} width="100%">
                <Divider />
                <Box display="flex" justifyContent="space-between" mt={2}>
                    <Typography variant="body2">Total Houses:</Typography>
                    <Typography variant="body2" fontWeight="bold">{occupancy?.occupancy.total}</Typography>
                </Box>
            </Box>
          </Paper>
        </Grid>

        {/* 4. MAINTENANCE CATEGORIES BAR CHART */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Maintenance Issues by Category</Typography>
            <Box height="300px">
              <Bar 
                data={maintenanceChartData} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                }} 
              />
            </Box>
          </Paper>
        </Grid>

        {/* 5. DEBTORS / ARREARS TABLE */}
        <Grid item xs={12} md={6}>
            <Paper sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
                <Box p={2} bgcolor="#ffebee" display="flex" alignItems="center">
                    <WarningIcon color="error" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="error.main">Outstanding Rent (This Month)</Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 300 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Tenant</TableCell>
                                <TableCell>House</TableCell>
                                <TableCell>Balance</TableCell>
                                <TableCell>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {debtors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        <Typography variant="body2" color="textSecondary" py={3}>
                                            No outstanding rent! 🎉
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                debtors.map((d) => (
                                    <TableRow key={d.id}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">{d.name}</Typography>
                                            <Typography variant="caption" color="textSecondary">{d.phone}</Typography>
                                        </TableCell>
                                        <TableCell>{d.house}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={formatCurrency(d.balance)} 
                                                size="small" 
                                                color="error" 
                                                variant="outlined" 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title="Send Reminder">
                                                <IconButton 
                                                    color="primary" 
                                                    onClick={() => handlePingDebtor(d.id, d.name)}
                                                    size="small"
                                                >
                                                    <NotificationsActiveIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Reports;