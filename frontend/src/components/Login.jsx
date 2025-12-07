import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ProfileCompletion from './ProfileCompletion';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store tokens in localStorage
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        
        // Get user info
        const userResponse = await fetch('http://localhost:8000/api/users/me/', {
          headers: {
            'Authorization': `Bearer ${data.access}`,
          },
        });
        
        const fetchedUserData = await userResponse.json();
        localStorage.setItem('user', JSON.stringify(fetchedUserData));
        
        // Check if profile is completed
        if (!fetchedUserData.profile_completed) {
          // Show profile completion dialog
          setUserData(fetchedUserData);
          setShowProfileCompletion(true);
          setLoading(false);
        } else {
          // Profile already completed, proceed to dashboard
          onLogin(fetchedUserData);
          navigateToDashboard(fetchedUserData.role);
        }
      } else {
        setError(data.detail || 'Invalid username or password');
        setLoading(false);
      }
    } catch (err) {
      setError('Connection error. Make sure backend is running on port 8000');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  const handleProfileComplete = () => {
    // Profile completed successfully
    setShowProfileCompletion(false);
    
    // Get updated user data from localStorage
    const updatedUser = JSON.parse(localStorage.getItem('user'));
    onLogin(updatedUser);
    navigateToDashboard(updatedUser.role);
  };

  const navigateToDashboard = (role) => {
    // Navigate based on user role
    if (role === 'tenant') {
      navigate('/tenant-dashboard');
    } else if (role === 'technician') {
      navigate('/maintenance');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <>
      <Container maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              SEAMS Login
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
              Staff Estates Administration & Management System
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Login'}
              </Button>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" display="block" gutterBottom>
                  <strong>Test Accounts:</strong>
                </Typography>
                <Typography variant="caption" display="block">
                  Admin: john_admin / admin123
                </Typography>
                <Typography variant="caption" display="block">
                  Technician: mike_tech / tech123
                </Typography>
                <Typography variant="caption" display="block">
                  Tenant: jane_smith / tenant123
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>

      {/* Profile Completion Dialog */}
      <ProfileCompletion 
        open={showProfileCompletion} 
        onComplete={handleProfileComplete}
      />
    </>
  );
}

export default Login;