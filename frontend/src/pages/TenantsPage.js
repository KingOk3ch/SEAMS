import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Chip, Avatar } from '@mui/material';
import { PersonAdd } from '@mui/icons-material';

const TenantsPage = () => {
  const tenants = [
    {
      id: 1,
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+254 712 345 678',
      house: '45B',
      moveInDate: '2023-06-15',
      status: 'Active',
      contractExpiry: '2024-06-15',
    },
    {
      id: 2,
      name: 'Mike Johnson',
      email: 'mike.j@example.com',
      phone: '+254 723 456 789',
      house: '12D',
      moveInDate: '2023-03-20',
      status: 'Active',
      contractExpiry: '2024-03-20',
    },
    {
      id: 3,
      name: 'Sarah Williams',
      email: 'sarah.w@example.com',
      phone: '+254 734 567 890',
      house: '78F',
      moveInDate: '2023-09-10',
      status: 'Active',
      contractExpiry: '2024-09-10',
    },
    {
      id: 4,
      name: 'Tom Brown',
      email: 'tom.brown@example.com',
      phone: '+254 745 678 901',
      house: '34G',
      moveInDate: '2023-01-05',
      status: 'Expiring Soon',
      contractExpiry: '2024-01-05',
    },
    {
      id: 5,
      name: 'Emily Davis',
      email: 'emily.d@example.com',
      phone: '+254 756 789 012',
      house: '91H',
      moveInDate: '2023-11-22',
      status: 'Active',
      contractExpiry: '2024-11-22',
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Tenant Management
        </Typography>
        <Button variant="contained" startIcon={<PersonAdd />}>
          Add New Tenant
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#10B981', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Tenants
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                198
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Currently residing
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#F59E0B', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Expiring Soon
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                12
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Within 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#4F5F8D', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                New This Month
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                8
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Recent move-ins
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Tenants List */}
        {tenants.map((tenant) => (
          <Grid item xs={12} md={6} lg={4} key={tenant.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: '#5C7E6D',
                      width: 56,
                      height: 56,
                      mr: 2,
                      fontSize: '1.5rem',
                    }}
                  >
                    {tenant.name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {tenant.name}
                    </Typography>
                    <Chip
                      label={tenant.status}
                      size="small"
                      color={tenant.status === 'Active' ? 'success' : 'warning'}
                    />
                  </Box>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>House:</strong> {tenant.house}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Email:</strong> {tenant.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Phone:</strong> {tenant.phone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Move-in:</strong> {tenant.moveInDate}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Contract Expiry:</strong> {tenant.contractExpiry}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button size="small" variant="outlined" fullWidth>
                    View Details
                  </Button>
                  <Button size="small" variant="outlined" fullWidth>
                    Edit
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TenantsPage;