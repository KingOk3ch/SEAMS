import React, { useState } from 'react';
import { Box, Container, Card, Typography, TextField, Button, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // TODO: Replace with actual API call
      // const response = await authAPI.login(credentials);
      
      // Demo login for now
      const demoUser = {
        id: 1,
        name: credentials.username || 'John Doe',
        email: 'john@seams.com',
        role: 'Estate Admin',
        avatar: null,
      };
      
      login(demoUser, 'demo-jwt-token-12345');
    } catch (err) {
      setError('Login failed. Please check your credentials.');
      console.error('Login error:', err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #5C7E6D 0%, #7A9B8A 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
              SEAMS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Smart Estates Administration & Maintenance System
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              variant="outlined"
              margin="normal"
              value={credentials.username}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              variant="outlined"
              margin="normal"
              value={credentials.password}
              onChange={handleChange}
              required
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              Sign In
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Demo Mode:</strong> Enter any username and password to login
          </Alert>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginPage;