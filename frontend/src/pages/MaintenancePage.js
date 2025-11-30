import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { Build } from '@mui/icons-material';

const MaintenancePage = () => {
  const maintenanceRequests = [
    {
      id: 'MR-001',
      issue: 'Water leakage',
      house: '45B',
      priority: 'High',
      status: 'In Progress',
      technician: 'Mike Johnson',
      date: '2024-01-15',
    },
    {
      id: 'MR-002',
      issue: 'Broken window',
      house: '23A',
      priority: 'Medium',
      status: 'Pending',
      technician: 'Unassigned',
      date: '2024-01-16',
    },
    {
      id: 'MR-003',
      issue: 'Electrical fault',
      house: '67C',
      priority: 'High',
      status: 'Assigned',
      technician: 'Sarah Williams',
      date: '2024-01-14',
    },
    {
      id: 'MR-004',
      issue: 'Door lock broken',
      house: '12D',
      priority: 'Low',
      status: 'Completed',
      technician: 'Tom Brown',
      date: '2024-01-13',
    },
    {
      id: 'MR-005',
      issue: 'Roof leaking',
      house: '89E',
      priority: 'High',
      status: 'Pending',
      technician: 'Unassigned',
      date: '2024-01-16',
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Maintenance Management
        </Typography>
        <Button variant="contained" color="secondary" startIcon={<Build />}>
          New Request
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#F59E0B', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                23
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Awaiting assignment
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#4F5F8D', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                8
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Currently being worked on
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#10B981', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                156
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                This month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Maintenance Requests List */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Active Maintenance Requests
              </Typography>
              <List>
                {maintenanceRequests.map((request) => (
                  <ListItem
                    key={request.id}
                    divider
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      py: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography fontWeight="bold" variant="body1">
                          {request.id}
                        </Typography>
                        <Chip
                          label={request.priority}
                          size="small"
                          color={request.priority === 'High' ? 'error' : request.priority === 'Medium' ? 'warning' : 'default'}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Issue:</strong> {request.issue}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>House:</strong> {request.house} • <strong>Technician:</strong> {request.technician}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Date:</strong> {request.date}
                      </Typography>
                    </Box>
                    <Chip
                      label={request.status}
                      color={
                        request.status === 'Completed'
                          ? 'success'
                          : request.status === 'In Progress'
                          ? 'primary'
                          : request.status === 'Assigned'
                          ? 'info'
                          : 'warning'
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MaintenancePage;