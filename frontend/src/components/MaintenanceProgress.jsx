import React from 'react';
import {
  Box, Card, CardContent, Typography, Stepper, Step, StepLabel, 
  StepConnector, Chip, Grid, LinearProgress, Paper, Divider,
  stepConnectorClasses
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useTheme } from '@mui/material/styles';

// Custom styled connector to match the theme
const CustomConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
    left: `calc(-50% + 16px)`,
    right: `calc(50% + 16px)`,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient( 95deg,${theme.palette.primary.main} 0%,${theme.palette.primary.main} 100%)`,
      backgroundColor: theme.palette.primary.main,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient( 95deg,${theme.palette.success.main} 0%,${theme.palette.success.main} 100%)`,
      backgroundColor: theme.palette.success.main,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.text.secondary,
    borderRadius: 1,
  },
}));

// Custom styled step icon
const CustomStepIconRoot = styled('div')(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  ...(ownerState.active && {
    backgroundImage: `linear-gradient( 136deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
    boxShadow: `0 4px 20px 0 rgba(37, 99, 235, 0.3)`,
  }),
  ...(ownerState.completed && {
    backgroundImage: `linear-gradient( 136deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
  }),
}));

function CustomStepIcon(props) {
  const { active, completed, className } = props;

  const icons = {
    1: <AssignmentIcon />,
    2: <AccessTimeIcon />,
    3: <BuildCircleIcon />,
    4: <CheckCircleIcon />,
  };

  return (
    <CustomStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(props.icon)]}
    </CustomStepIconRoot>
  );
}

// Main Progress Component
export default function MaintenanceProgress({ maintenance = [] }) {
  const theme = useTheme();

  if (!maintenance || maintenance.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc' }}>
        <Typography variant="body1" color="text.secondary">
          No maintenance requests yet
        </Typography>
      </Paper>
    );
  }

  const statusOrder = {
    'new': 0,
    'pending': 1,
    'assigned': 1,
    'in_progress': 2,
    'completed': 3,
    'cancelled': -1,
  };

  const statusLabels = {
    'new': 'New Request',
    'pending': 'Assigned',
    'assigned': 'Assigned',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  };

  const statusColors = {
    'new': 'info',
    'pending': 'warning',
    'assigned': 'warning',
    'in_progress': 'warning',
    'completed': 'success',
    'cancelled': 'error',
  };

  const getProgressPercentage = (status) => {
    const order = statusOrder[status] || 0;
    return (order / 3) * 100;
  };

  const categoryCounts = {
    completed: maintenance.filter(m => m.status === 'completed').length,
    inProgress: maintenance.filter(m => ['in_progress', 'assigned', 'pending'].includes(m.status)).length,
    new: maintenance.filter(m => m.status === 'new').length,
  };

  return (
    <Box sx={{ mt: 4 }}>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9', border: `2px solid ${theme.palette.success.main}` }}>
            <Typography variant="h4" sx={{ color: theme.palette.success.main, fontWeight: 'bold' }}>
              {categoryCounts.completed}
            </Typography>
            <Typography variant="body2" color="text.secondary">Completed</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0', border: `2px solid ${theme.palette.warning.main}` }}>
            <Typography variant="h4" sx={{ color: theme.palette.warning.main, fontWeight: 'bold' }}>
              {categoryCounts.inProgress}
            </Typography>
            <Typography variant="body2" color="text.secondary">In Progress</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd', border: `2px solid ${theme.palette.info.main}` }}>
            <Typography variant="h4" sx={{ color: theme.palette.info.main, fontWeight: 'bold' }}>
              {categoryCounts.new}
            </Typography>
            <Typography variant="body2" color="text.secondary">New</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', border: `2px solid ${theme.palette.text.secondary}` }}>
            <Typography variant="h4" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>
              {maintenance.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Total</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Individual Request Progress */}
      <Box>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Your Maintenance Requests</Typography>
        {maintenance.map((request, index) => {
          const status = (request.status || 'new').toLowerCase().trim();
          const stepIndex = statusOrder[status] >= 0 ? statusOrder[status] : 0;
          const isCancelled = status === 'cancelled';

          return (
            <Card key={request.id} sx={{ mb: 3, border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                {/* Header: Request Info */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box flex={1}>
                    <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuildCircleIcon sx={{ color: theme.palette.primary.main }} />
                      {request.issue_description}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Request ID: {request.request_id}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Chip
                      label={statusLabels[status] || status.toUpperCase()}
                      color={statusColors[status] || 'default'}
                      size="small"
                      sx={{ mb: 1, fontWeight: 600 }}
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {new Date(request.created_at).toLocaleDateString('en-KE')}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Details Grid */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">Category</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {request.category?.charAt(0).toUpperCase() + request.category?.slice(1) || 'General'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">Priority</Typography>
                    <Chip 
                      label={request.priority?.toUpperCase()} 
                      size="small"
                      color={
                        request.priority === 'urgent' ? 'error' :
                        request.priority === 'high' ? 'warning' :
                        request.priority === 'medium' ? 'info' : 'default'
                      }
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">Assigned To</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {request.assigned_to_name || (
                        request.assigned_to && (
                          (request.assigned_to.first_name ? `${request.assigned_to.first_name} ${request.assigned_to.last_name}` : String(request.assigned_to))
                        )
                      ) || 'Awaiting Assignment'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">Est. Cost</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {request.estimated_cost ? `KES ${request.estimated_cost.toLocaleString()}` : 'TBD'}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Progress bar */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" fontWeight={600}>Progress</Typography>
                    <Typography variant="caption" color="text.secondary">{Math.round(getProgressPercentage(status))}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={isCancelled ? 0 : getProgressPercentage(status)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.palette.action.disabledBackground,
                      '& .MuiLinearProgress-bar': {
                        backgroundImage: isCancelled 
                          ? `linear-gradient(90deg, ${theme.palette.error.main} 0%, ${theme.palette.error.light} 100%)`
                          : `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`
                      }
                    }}
                  />
                </Box>

                {/* Status Timeline (Stepper) */}
                {!isCancelled && (
                  <Box sx={{ mt: 2 }}>
                    <Stepper
                      activeStep={stepIndex}
                      connector={<CustomConnector />}
                      sx={{ pt: 1, pb: 1 }}
                    >
                      <Step>
                        <StepLabel StepIconComponent={CustomStepIcon}>New</StepLabel>
                      </Step>
                      <Step>
                        <StepLabel StepIconComponent={CustomStepIcon}>Assigned</StepLabel>
                      </Step>
                      <Step>
                        <StepLabel StepIconComponent={CustomStepIcon}>In Progress</StepLabel>
                      </Step>
                      <Step>
                        <StepLabel StepIconComponent={CustomStepIcon}>Completed</StepLabel>
                      </Step>
                    </Stepper>
                  </Box>
                )}

                {isCancelled && (
                  <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
                      This request has been cancelled
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
