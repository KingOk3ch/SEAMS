import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  CircularProgress,
} from '@mui/material';
import { PersonAdd, CheckCircle } from '@mui/icons-material';

const TenantRegistration = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    id_number: '',
    house_number: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) return;

    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/register/tenant/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          id_number: formData.id_number,
          house_number: formData.house_number,
        })
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const errorData = await response.json();
        const newErrors = {};
        
        // Backend sends back field-specific errors
        Object.keys(errorData).forEach(key => {
          if (Array.isArray(errorData[key])) {
            newErrors[key] = errorData[key][0];
          } else {
            newErrors[key] = errorData[key];
          }
        });
        
        setErrors(newErrors);
        setErrorMessage('Please fix the errors below');
      }
    } catch (error) {
      setErrorMessage('Registration failed. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 80, color: '#10B981', mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Registration Successful!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Your account has been created and is pending admin approval.
              Please check your email to verify your account.
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              You will receive an email notification once your account is approved.
              You can then log in to access the system.
            </Alert>
            <Button
              variant="contained"
              href="/"
              fullWidth
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <PersonAdd sx={{ fontSize: 40, color: '#1976d2' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Tenant Registration
              </Typography>
              <Typography color="text.secondary">
                Create your account to access SEAMS
              </Typography>
            </Box>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box display="flex" gap={2} mb={2}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                error={!!errors.first_name}
                helperText={errors.first_name}
                required
              />
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                error={!!errors.last_name}
                helperText={errors.last_name}
                required
              />
            </Box>

            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              error={!!errors.username}
              helperText={errors.username}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="ID Number"
              name="id_number"
              value={formData.id_number}
              onChange={handleChange}
              error={!!errors.id_number}
              helperText={errors.id_number}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="House Number (if known)"
              name="house_number"
              value={formData.house_number}
              onChange={handleChange}
              error={!!errors.house_number}
              helperText={errors.house_number}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password || 'Minimum 8 characters'}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              sx={{ mb: 3 }}
              required
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Register'}
            </Button>

            <Button
              variant="text"
              fullWidth
              href="/"
            >
              Already have an account? Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default TenantRegistration;