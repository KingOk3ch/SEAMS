import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Grid
} from '@mui/material';

function ProfileCompletion({ open, onComplete }) {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    id_number: '',
    new_password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    // Validate all fields are filled
    if (!formData.email || !formData.phone || !formData.id_number || !formData.new_password) {
      setError('All fields are required');
      return;
    }

    // Validate password length
    if (formData.new_password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/users/complete_profile/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        // Update user in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        onComplete();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to complete profile');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle>
        <Typography variant="h5">Complete Your Profile</Typography>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Please complete your profile to continue. This is required for first-time login.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                fullWidth
                autoComplete="email"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                fullWidth
                autoComplete="tel"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="ID Number"
                name="id_number"
                value={formData.id_number}
                onChange={handleInputChange}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="New Password"
                name="new_password"
                type="password"
                value={formData.new_password}
                onChange={handleInputChange}
                required
                fullWidth
                helperText="Must be at least 8 characters"
                autoComplete="new-password"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          fullWidth
          disabled={loading}
        >
          {loading ? 'Completing Profile...' : 'Complete Profile'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProfileCompletion;