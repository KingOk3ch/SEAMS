import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Typography, Box, Alert,
  Card, CardContent, Divider, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, IconButton, Snackbar, Tooltip, Button,
  Tabs, Tab, TextField, MenuItem, CircularProgress
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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import LogoLoader from './LogoLoader';

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
  
  const [tabValue, setTabValue] = useState(0);
  const [tenantsList, setTenantsList] = useState([]);
  const [techniciansList, setTechniciansList] = useState([]);

  // Granular Ledger States defaulting to 'all' to ensure UI label rendering consistency
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [txFilters, setTxFilters] = useState({ start_date: '', end_date: '', tenant_id: 'all', payment_type: 'all', status: 'all' });

  // Granular Maintenance States with multi-personnel tracing
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [loadingMx, setLoadingMx] = useState(false);
  const [mxFilters, setMxFilters] = useState({ start_date: '', end_date: '', tenant_id: 'all', technician_id: 'all', category: 'all', status: 'all' });

  // Alert State
  const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [summaryRes, trendsRes, occupancyRes, debtorsRes, tenantsRes, usersRes] = await Promise.all([
        fetch('http://localhost:8000/api/reports/dashboard_summary/', { headers }),
        fetch('http://localhost:8000/api/reports/monthly_trends/', { headers }),
        fetch('http://localhost:8000/api/reports/occupancy_stats/', { headers }),
        fetch('http://localhost:8000/api/reports/debtors_list/', { headers }),
        fetch('http://localhost:8000/api/tenants/', { headers }),
        fetch('http://localhost:8000/api/users/', { headers })
      ]);

      if (summaryRes.ok && trendsRes.ok && occupancyRes.ok && debtorsRes.ok) {
        setSummary(await summaryRes.json());
        setTrends(await trendsRes.json());
        setOccupancy(await occupancyRes.json());
        setDebtors(await debtorsRes.json());
      } else {
        setError('Failed to fetch some report data.');
      }

      if (tenantsRes.ok) {
          const tenantsData = await tenantsRes.json();
          setTenantsList(tenantsData.results ? tenantsData.results : tenantsData);
      }
      
      if (usersRes.ok) {
          const usersData = await usersRes.json();
          // Isolate technicians specifically to build the specialized audit filter
          const techList = (usersData.results || usersData).filter(u => (u.role || '').toLowerCase() === 'technician');
          setTechniciansList(techList);
      }

    } catch (err) {
      setError('Network error loading reports.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
      setLoadingTx(true);
      try {
          const token = localStorage.getItem('access_token');
          const query = new URLSearchParams();
          if (txFilters.start_date) query.append('start_date', txFilters.start_date);
          if (txFilters.end_date) query.append('end_date', txFilters.end_date);
          if (txFilters.tenant_id && txFilters.tenant_id !== 'all') query.append('tenant_id', txFilters.tenant_id);
          if (txFilters.payment_type && txFilters.payment_type !== 'all') query.append('payment_type', txFilters.payment_type);
          if (txFilters.status && txFilters.status !== 'all') query.append('status', txFilters.status);

          const res = await fetch(`http://localhost:8000/api/reports/transactions/?${query.toString()}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) setTransactions(await res.json());
      } catch (err) {
          setAlertInfo({ open: true, message: 'Failed to fetch ledger', severity: 'error' });
      } finally {
          setLoadingTx(false);
      }
  };

  const fetchMaintenanceLogs = async () => {
      setLoadingMx(true);
      try {
          const token = localStorage.getItem('access_token');
          const query = new URLSearchParams();
          if (mxFilters.start_date) query.append('start_date', mxFilters.start_date);
          if (mxFilters.end_date) query.append('end_date', mxFilters.end_date);
          if (mxFilters.tenant_id && mxFilters.tenant_id !== 'all') query.append('tenant_id', mxFilters.tenant_id);
          if (mxFilters.technician_id && mxFilters.technician_id !== 'all') query.append('technician_id', mxFilters.technician_id);
          if (mxFilters.category && mxFilters.category !== 'all') query.append('category', mxFilters.category);
          if (mxFilters.status && mxFilters.status !== 'all') query.append('status', mxFilters.status);

          const res = await fetch(`http://localhost:8000/api/reports/maintenance_logs/?${query.toString()}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) setMaintenanceLogs(await res.json());
      } catch (err) {
          setAlertInfo({ open: true, message: 'Failed to fetch logs', severity: 'error' });
      } finally {
          setLoadingMx(false);
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

  // Compiles and formats backend JSON data into a downloadable Excel-ready CSV string
  const handleExportCSV = (type) => {
      let dataToExport = [];
      let headers = [];
      let filename = '';

      if (type === 'debtors') {
          if (debtors.length === 0) return setAlertInfo({ open: true, message: 'No data to export.', severity: 'info' });
          headers = ['Tenant Name', 'House Number', 'Phone', 'Outstanding Balance (KES)'];
          dataToExport = debtors.map(d => `"${d.name}","${d.house}","${d.phone}","${d.balance}"`);
          filename = 'Debtors_List';
      } else if (type === 'transactions') {
          if (transactions.length === 0) return setAlertInfo({ open: true, message: 'No data to export.', severity: 'info' });
          headers = ['Date', 'Tenant', 'House', 'Type', 'Amount (KES)', 'Method', 'Ref', 'Status'];
          dataToExport = transactions.map(t => `"${t.date}","${t.tenant}","${t.house}","${t.type.toUpperCase()}","${t.amount}","${t.method.toUpperCase()}","${t.reference}","${t.status.toUpperCase()}"`);
          filename = 'Transaction_Ledger';
      } else if (type === 'maintenance') {
          if (maintenanceLogs.length === 0) return setAlertInfo({ open: true, message: 'No data to export.', severity: 'info' });
          headers = ['Date', 'House', 'Category', 'Priority', 'Status', 'Technician', 'Cost (KES)', 'Description'];
          dataToExport = maintenanceLogs.map(m => `"${m.date}","${m.house}","${m.category.toUpperCase()}","${m.priority.toUpperCase()}","${m.status.toUpperCase()}","${m.technician}","${m.cost}","${m.issue.replace(/"/g, '""')}"`);
          filename = 'Maintenance_Logs';
      }

      const csvString = [headers.join(','), ...dataToExport].join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `SEAMS_${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(val || 0);
  };

  if (loading) return <LogoLoader />;

  // --- Chart Configurations ---

  const lineChartData = {
    labels: trends?.labels || [],
    datasets: [
      {
        label: 'Income',
        data: trends?.income || [],
        borderColor: 'rgb(46, 125, 50)', // Green
        backgroundColor: 'rgba(46, 125, 50, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Expenses',
        data: trends?.expense || [],
        borderColor: 'rgb(211, 47, 47)', // Red
        backgroundColor: 'rgba(211, 47, 47, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const lineChartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value) {
            return 'KES ' + value.toLocaleString();
          }
        }
      }
    }
  };

  const occupancyChartData = {
    labels: ['Occupied', 'Vacant', 'Maintenance', 'Reserved'],
    datasets: [
      {
        data: [
          occupancy?.occupancy.occupied || 0,
          occupancy?.occupancy.vacant || 0,
          occupancy?.occupancy.maintenance || 0,
          occupancy?.occupancy.reserved || 0,
        ],
        backgroundColor: [
          'rgba(46, 125, 50, 0.8)',   // Green (Occupied)
          'rgba(25, 118, 210, 0.8)',  // Blue (Vacant)
          'rgba(237, 108, 2, 0.8)',   // Orange (Maintenance)
          'rgba(156, 39, 176, 0.8)',  // Purple (Reserved)
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
      <Box mb={2}>
        <Typography variant="h4" fontWeight="bold">Analytics & Reports</Typography>
        <Typography color="textSecondary">Financial ledgers and operational performance</Typography>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} indicatorColor="primary" textColor="primary">
            <Tab label="Dashboard Overview" />
            <Tab label="Transaction Ledger" />
            <Tab label="Maintenance Logs" />
        </Tabs>
      </Paper>

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

      {tabValue === 0 && (
        <>
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
                  <Line data={lineChartData} options={lineChartOptions} />
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
                    <Box p={2} bgcolor="#ffebee" display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center">
                            <WarningIcon color="error" sx={{ mr: 1 }} />
                            <Typography variant="h6" color="error.main">Outstanding Rent</Typography>
                        </Box>
                        <Button 
                            size="small" 
                            variant="outlined" 
                            color="error" 
                            startIcon={<FileDownloadIcon />}
                            onClick={() => handleExportCSV('debtors')}
                            disabled={debtors.length === 0}
                        >
                            Export CSV
                        </Button>
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
        </>
      )}

      {tabValue === 1 && (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
                    <TextField label="Start Date" type="date" value={txFilters.start_date} onChange={(e) => setTxFilters({...txFilters, start_date: e.target.value})} InputLabelProps={{ shrink: true }} size="small" sx={{ flex: 1, minWidth: '130px' }} />
                    <TextField label="End Date" type="date" value={txFilters.end_date} onChange={(e) => setTxFilters({...txFilters, end_date: e.target.value})} InputLabelProps={{ shrink: true }} size="small" sx={{ flex: 1, minWidth: '130px' }} />
                    <TextField select label="Tenant" value={txFilters.tenant_id} onChange={(e) => setTxFilters({...txFilters, tenant_id: e.target.value})} size="small" sx={{ flex: 1, minWidth: '130px' }}>
                        <MenuItem value="all">All Tenants</MenuItem>
                        {tenantsList.map(t => <MenuItem key={t.id} value={t.id}>{t.user.first_name} {t.user.last_name}</MenuItem>)}
                    </TextField>
                    <TextField select label="Type" value={txFilters.payment_type} onChange={(e) => setTxFilters({...txFilters, payment_type: e.target.value})} size="small" sx={{ flex: 1, minWidth: '130px' }}>
                        <MenuItem value="all">All Types</MenuItem>
                        {['rent','water','electricity','garbage','damage','deposit','penalty','other'].map(o => <MenuItem key={o} value={o}>{o.toUpperCase()}</MenuItem>)}
                    </TextField>
                    <TextField select label="Status" value={txFilters.status} onChange={(e) => setTxFilters({...txFilters, status: e.target.value})} size="small" sx={{ flex: 1, minWidth: '130px' }}>
                        <MenuItem value="all">All Statuses</MenuItem>
                        <MenuItem value="verified">Verified</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="rejected">Rejected</MenuItem>
                    </TextField>
                    <Button variant="contained" onClick={fetchTransactions} disabled={loadingTx} sx={{ height: '40px', minWidth: '50px' }}>
                        {loadingTx ? <CircularProgress size={24} color="inherit"/> : <SearchIcon />}
                    </Button>
                </Box>
            </Paper>

            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Transaction Results ({transactions.length})</Typography>
                    <Button variant="outlined" color="success" startIcon={<FileDownloadIcon />} onClick={() => handleExportCSV('transactions')} disabled={transactions.length === 0}>
                        Export Ledger
                    </Button>
                </Box>
                <Divider />
                <TableContainer sx={{ maxHeight: 500 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Tenant</TableCell>
                                <TableCell>House</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Method</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {transactions.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}>No transactions match criteria.</TableCell></TableRow>
                            ) : (
                                transactions.map((tx) => (
                                    <TableRow key={tx.id} hover>
                                        <TableCell>{tx.date}</TableCell>
                                        <TableCell>{tx.tenant}</TableCell>
                                        <TableCell>{tx.house}</TableCell>
                                        <TableCell>{tx.type.toUpperCase()}</TableCell>
                                        <TableCell fontWeight="bold">{formatCurrency(tx.amount)}</TableCell>
                                        <TableCell>{tx.method.toUpperCase()}</TableCell>
                                        <TableCell>
                                            <Chip label={tx.status.toUpperCase()} size="small" color={tx.status === 'verified' ? 'success' : tx.status === 'rejected' ? 'error' : 'warning'} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
                    <TextField label="Start Date" type="date" value={mxFilters.start_date} onChange={(e) => setMxFilters({...mxFilters, start_date: e.target.value})} InputLabelProps={{ shrink: true }} size="small" sx={{ flex: 1, minWidth: '130px' }} />
                    <TextField label="End Date" type="date" value={mxFilters.end_date} onChange={(e) => setMxFilters({...mxFilters, end_date: e.target.value})} InputLabelProps={{ shrink: true }} size="small" sx={{ flex: 1, minWidth: '130px' }} />
                    <TextField select label="Tenant" value={mxFilters.tenant_id} onChange={(e) => setMxFilters({...mxFilters, tenant_id: e.target.value})} size="small" sx={{ flex: 1, minWidth: '130px' }}>
                        <MenuItem value="all">All Tenants</MenuItem>
                        {tenantsList.map(t => <MenuItem key={t.id} value={t.id}>{t.user.first_name} {t.user.last_name}</MenuItem>)}
                    </TextField>
                    <TextField select label="Technician" value={mxFilters.technician_id} onChange={(e) => setMxFilters({...mxFilters, technician_id: e.target.value})} size="small" sx={{ flex: 1, minWidth: '150px' }}>
                        <MenuItem value="all">All Technicians</MenuItem>
                        {techniciansList.map(t => (
                            <MenuItem key={t.id} value={t.id}>
                                {t.first_name} {t.last_name} ({t.specialization ? t.specialization.charAt(0).toUpperCase() + t.specialization.slice(1) : 'General'})
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField select label="Category" value={mxFilters.category} onChange={(e) => setMxFilters({...mxFilters, category: e.target.value})} size="small" sx={{ flex: 1, minWidth: '130px' }}>
                        <MenuItem value="all">All Categories</MenuItem>
                        {['plumbing','electrical','structural','pest_control','general'].map(c => <MenuItem key={c} value={c}>{c.toUpperCase()}</MenuItem>)}
                    </TextField>
                    <TextField select label="Status" value={mxFilters.status} onChange={(e) => setMxFilters({...mxFilters, status: e.target.value})} size="small" sx={{ flex: 1, minWidth: '130px' }}>
                        <MenuItem value="all">All Statuses</MenuItem>
                        {['new','pending','assigned','in_progress','completed'].map(s => <MenuItem key={s} value={s}>{s.replace('_',' ').toUpperCase()}</MenuItem>)}
                    </TextField>
                    <Button variant="contained" onClick={fetchMaintenanceLogs} disabled={loadingMx} sx={{ height: '40px', minWidth: '50px' }}>
                        {loadingMx ? <CircularProgress size={24} color="inherit"/> : <SearchIcon />}
                    </Button>
                </Box>
            </Paper>

            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Maintenance Logs ({maintenanceLogs.length})</Typography>
                    <Button variant="outlined" color="success" startIcon={<FileDownloadIcon />} onClick={() => handleExportCSV('maintenance')} disabled={maintenanceLogs.length === 0}>
                        Export Logs
                    </Button>
                </Box>
                <Divider />
                <TableContainer sx={{ maxHeight: 500 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>House</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Technician</TableCell>
                                <TableCell>Cost</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {maintenanceLogs.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>No logs match criteria.</TableCell></TableRow>
                            ) : (
                                maintenanceLogs.map((mx) => (
                                    <TableRow key={mx.id} hover>
                                        <TableCell>{mx.date}</TableCell>
                                        <TableCell>{mx.house}</TableCell>
                                        <TableCell>{mx.category.toUpperCase()}</TableCell>
                                        <TableCell>
                                            <Chip label={mx.status.replace('_', ' ').toUpperCase()} size="small" />
                                        </TableCell>
                                        <TableCell>{mx.technician}</TableCell>
                                        <TableCell fontWeight="bold">{formatCurrency(mx.cost)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
      )}

    </Container>
  );
}

export default Reports;