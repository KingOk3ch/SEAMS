import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Download, PictureAsPdf } from '@mui/icons-material';

const ReportsPage = () => {
  const occupancyData = [
    { month: 'January', occupied: 195, vacant: 50, rate: '79.6%' },
    { month: 'February', occupied: 198, vacant: 47, rate: '80.8%' },
    { month: 'March', occupied: 202, vacant: 43, rate: '82.4%' },
    { month: 'April', occupied: 200, vacant: 45, rate: '81.6%' },
  ];

  const maintenanceData = [
    { category: 'Plumbing', requests: 45, completed: 40, pending: 5 },
    { category: 'Electrical', requests: 32, completed: 28, pending: 4 },
    { category: 'Structural', requests: 18, completed: 15, pending: 3 },
    { category: 'General', requests: 52, completed: 48, pending: 4 },
  ];

  const financialData = [
    { month: 'January', rent: 'KES 2,450,000', maintenance: 'KES 320,000', net: 'KES 2,130,000' },
    { month: 'February', rent: 'KES 2,480,000', maintenance: 'KES 290,000', net: 'KES 2,190,000' },
    { month: 'March', rent: 'KES 2,520,000', maintenance: 'KES 350,000', net: 'KES 2,170,000' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Reports & Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Download />}>
            Export Excel
          </Button>
          <Button variant="contained" startIcon={<PictureAsPdf />}>
            Generate PDF
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Occupancy Report */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Occupancy Report
              </Typography>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Month</strong></TableCell>
                      <TableCell align="right"><strong>Occupied</strong></TableCell>
                      <TableCell align="right"><strong>Vacant</strong></TableCell>
                      <TableCell align="right"><strong>Occupancy Rate</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {occupancyData.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell>{row.month}</TableCell>
                        <TableCell align="right">{row.occupied}</TableCell>
                        <TableCell align="right">{row.vacant}</TableCell>
                        <TableCell align="right">{row.rate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Maintenance Report */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Maintenance Report
              </Typography>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell align="right"><strong>Total</strong></TableCell>
                      <TableCell align="right"><strong>Completed</strong></TableCell>
                      <TableCell align="right"><strong>Pending</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {maintenanceData.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell align="right">{row.requests}</TableCell>
                        <TableCell align="right">{row.completed}</TableCell>
                        <TableCell align="right">{row.pending}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Financial Report */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Financial Summary
              </Typography>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Month</strong></TableCell>
                      <TableCell align="right"><strong>Rent</strong></TableCell>
                      <TableCell align="right"><strong>Maintenance</strong></TableCell>
                      <TableCell align="right"><strong>Net</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {financialData.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell>{row.month}</TableCell>
                        <TableCell align="right">{row.rent}</TableCell>
                        <TableCell align="right">{row.maintenance}</TableCell>
                        <TableCell align="right">{row.net}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsPage;