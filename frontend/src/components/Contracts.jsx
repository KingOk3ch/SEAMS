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
  Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/contracts/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setContracts(data);
      } else {
        setError('Failed to fetch contracts');
      }
      setLoading(false);
    } catch (err) {
      setError('Connection error');
      setLoading(false);
      console.error('Error:', err);
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
            Contracts
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />}>
            New Contract
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Total Contracts: {contracts.length}
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Tenant</strong></TableCell>
              <TableCell><strong>House</strong></TableCell>
              <TableCell><strong>Start Date</strong></TableCell>
              <TableCell><strong>End Date</strong></TableCell>
              <TableCell><strong>Monthly Rent (KSH)</strong></TableCell>
              <TableCell><strong>Deposit Paid (KSH)</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} hover>
                <TableCell>{contract.tenant_name}</TableCell>
                <TableCell>{contract.house_number}</TableCell>
                <TableCell>{formatDate(contract.start_date)}</TableCell>
                <TableCell>{formatDate(contract.end_date)}</TableCell>
                <TableCell>{contract.monthly_rent.toLocaleString()}</TableCell>
                <TableCell>{contract.deposit_paid.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default Contracts;