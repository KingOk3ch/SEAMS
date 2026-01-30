import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { parseBackendErrors } from '../utils/errorHandler';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // State for professional errors
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (setter, field) => (e) => {
      setter(e.target.value);
      // Clear specific field error when user types
      if (fieldErrors[field]) {
          setFieldErrors(prev => ({ ...prev, [field]: null }));
      }
      // Clear global error when user interacts (so red outline goes away)
      if (globalError) setGlobalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        
        const userResponse = await fetch('http://localhost:8000/api/users/me/', {
          headers: { 'Authorization': `Bearer ${data.access}` },
        });
        
        const fetchedUserData = await userResponse.json();
        localStorage.setItem('user', JSON.stringify(fetchedUserData));
        
        onLogin(fetchedUserData);
        navigateToDashboard(fetchedUserData.role);
        
      } else {
        const { global, fields } = parseBackendErrors(data);
        
        // Mask the error for security, but set globalError so inputs turn red
        if (response.status === 401 || (global && global.includes('active account'))) {
             setGlobalError('Invalid username or password.');
        } else {
             setGlobalError(global || 'Login failed. Please try again.');
        }
        
        setFieldErrors(fields);
        setLoading(false);
      }
    } catch (err) {
      setGlobalError('Connection error. Make sure backend is running on port 8000');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  const navigateToDashboard = (role) => {
    if (role === 'tenant') {
      navigate('/tenant-dashboard');
    } else if (role === 'technician') {
      navigate('/maintenance');
    } else {
      navigate('/dashboard');
    }
  };

  return (
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

          {globalError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {globalError}
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
              onChange={handleInputChange(setUsername, 'username')}
              disabled={loading}
              // VISUAL FEEDBACK: Turn red if specific error OR global error exists
              error={!!fieldErrors.username || !!globalError} 
              helperText={fieldErrors.username}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={handleInputChange(setPassword, 'password')}
              disabled={loading}
              // VISUAL FEEDBACK: Turn red if specific error OR global error exists
              error={!!fieldErrors.password || !!globalError}
              helperText={fieldErrors.password}
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

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                New tenant?{' '}
                <Link
                  href="/register"
                  underline="hover"
                  sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Register here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;