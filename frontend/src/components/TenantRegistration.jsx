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
import { PersonAdd, CheckCircle, MarkEmailRead } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const TenantRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Register, 2 = Verify Code
  
  // Registration Form Data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    id_number: '',
  });

  // Verification Form Data
  const [verificationCode, setVerificationCode] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
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
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Min 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords mismatch';
    if (!formData.first_name.trim()) newErrors.first_name = 'Required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Required';
    if (!formData.phone.trim()) newErrors.phone = 'Required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!validate()) return;

    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/register/tenant/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          id_number: formData.id_number,
        })
      });

      if (response.ok) {
        // Move to verification step
        setSuccessMessage('Registration successful! A verification code has been sent to your email.');
        setStep(2);
      } else {
        const errorData = await response.json();
        const newErrors = {};
        Object.keys(errorData).forEach(key => {
          newErrors[key] = Array.isArray(errorData[key]) ? errorData[key][0] : errorData[key];
        });
        setErrors(newErrors);
        setErrorMessage('Registration failed. Please fix errors.');
      }
    } catch (error) {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/verify-email/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email, // Use email from state
          code: verificationCode
        })
      });

      if (response.ok) {
        setStep(3); // Success Step
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setErrorMessage('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: Success View ---
  if (step === 3) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 80, color: '#10B981', mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Email Verified!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Your email is verified. Your account is now pending Admin Approval.
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              You will receive an email once the Admin approves your account and assigns you a house.
            </Alert>
            <Button variant="contained" href="/" fullWidth>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // --- Step 2: Verification Code View ---
  if (step === 2) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <MarkEmailRead sx={{ fontSize: 40, color: '#1976d2' }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  Verify Email
                </Typography>
                <Typography color="text.secondary">
                  Enter the code sent to <strong>{formData.email}</strong>
                </Typography>
              </Box>
            </Box>

            {successMessage && <Alert severity="success" sx={{ mb: 3 }}>{successMessage}</Alert>}
            {errorMessage && <Alert severity="error" sx={{ mb: 3 }}>{errorMessage}</Alert>}

            <form onSubmit={handleVerifySubmit}>
              <TextField
                fullWidth
                label="6-Digit Code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                sx={{ mb: 3 }}
                inputProps={{ maxLength: 6, style: { fontSize: 24, letterSpacing: 4, textAlign: 'center' } }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify Account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // --- Step 1: Registration View ---
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

          {errorMessage && <Alert severity="error" sx={{ mb: 3 }}>{errorMessage}</Alert>}

          <form onSubmit={handleRegisterSubmit}>
            <Box display="flex" gap={2} mb={2}>
              <TextField fullWidth label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} error={!!errors.first_name} helperText={errors.first_name} required />
              <TextField fullWidth label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} error={!!errors.last_name} helperText={errors.last_name} required />
            </Box>

            <TextField fullWidth label="Username" name="username" value={formData.username} onChange={handleChange} error={!!errors.username} helperText={errors.username} sx={{ mb: 2 }} required />
            <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={!!errors.email} helperText={errors.email} sx={{ mb: 2 }} required />
            <TextField fullWidth label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} error={!!errors.phone} helperText={errors.phone} sx={{ mb: 2 }} required />
            <TextField fullWidth label="ID Number" name="id_number" value={formData.id_number} onChange={handleChange} error={!!errors.id_number} helperText={errors.id_number} sx={{ mb: 2 }} />
            
            <TextField fullWidth label="Password" name="password" type="password" value={formData.password} onChange={handleChange} error={!!errors.password} helperText={errors.password || 'Minimum 8 characters'} sx={{ mb: 2 }} required />
            <TextField fullWidth label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} error={!!errors.confirmPassword} helperText={errors.confirmPassword} sx={{ mb: 3 }} required />

            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ mb: 2 }}>
              {loading ? <CircularProgress size={24} /> : 'Register'}
            </Button>

            <Button variant="text" fullWidth href="/">
              Already have an account? Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default TenantRegistration;