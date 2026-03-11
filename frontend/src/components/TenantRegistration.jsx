import React, { useState } from 'react';
import { 
  Box, Typography, TextField, Button, Checkbox, FormControlLabel, Link, InputAdornment, IconButton, Alert, CircularProgress
} from '@mui/material';
import { 
  PersonOutline, EmailOutlined, LockOutlined, VisibilityOffOutlined, 
  PhoneOutlined, BadgeOutlined, CheckCircle, MarkEmailRead 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api'; 
import { parseBackendErrors } from '../utils/errorHandler'; 

import logoImage from '../assets/seamslogo.png';

const TenantRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); 
  
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    first_name: '', last_name: '', phone: '', id_number: '',
  });

  const [verificationCode, setVerificationCode] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (errorMessage) setErrorMessage('');
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
    
    if (!agreedToTerms) {
      setErrorMessage('You must agree to the Terms & Conditions.');
      return;
    }

    if (!validate()) return;

    setLoading(true);

    try {
      await authAPI.registerTenant({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        id_number: formData.id_number,
      });

      setSuccessMessage('Registration successful! A verification code has been sent to your email.');
      setStep(2);

    } catch (error) {
      console.error(error);
      const errorData = error.response?.data || {};
      
      const { global, fields } = parseBackendErrors(errorData);
      
      if (global) setErrorMessage(global);
      else setErrorMessage('Registration failed. Please fix the highlighted errors.');
      
      setErrors(fields);
      
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await authAPI.verifyEmail({
        email: formData.email,
        code: verificationCode
      });

      setStep(3); 

    } catch (error) {
      setErrorMessage(error.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const customInputStyles = {
    mb: 2.5,
    '& .MuiOutlinedInput-root': {
      borderRadius: '50px', 
      color: 'white', 
      backgroundColor: 'rgba(0,0,0,0.2)', 
      '& fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.7)', 
        borderWidth: '1.5px',
      },
      '&:hover fieldset': {
        borderColor: 'white', 
      },
      '&.Mui-focused fieldset': {
        borderColor: 'white',
        borderWidth: '2px',
      },
      '&.Mui-error fieldset': {
        borderColor: '#f44336', 
        borderWidth: '2px',
      },
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.6)', 
      fontFamily: "'Poppins', sans-serif",
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: 'white',
    },
    '& .MuiInputBase-input': {
      '&:-webkit-autofill': {
        transition: 'background-color 5000s ease-in-out 0s',
        WebkitTextFillColor: 'white !important',
      },
    },
    '& .MuiFormHelperText-root': {
      color: 'rgba(255,255,255,0.7)',
      marginLeft: '14px',
      fontFamily: "'Poppins', sans-serif",
    },
    '& .MuiFormHelperText-root.Mui-error': {
      color: '#ff8a80', 
    }
  };

  const glassCardStyles = {
    maxWidth: '550px', 
    width: '100%',
    bgcolor: 'rgba(0,0,0,0.5)', 
    p: { xs: 4, md: 5 }, 
    borderRadius: 4, 
    border: '1px solid rgba(255,255,255,0.2)', 
    textAlign: 'center', 
    backdropFilter: 'blur(10px)' 
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        backgroundImage: 'url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2075&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed', 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', 
          zIndex: 1,
        }}
      />

      <Box 
        sx={{ 
          position: 'relative', 
          zIndex: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: { xs: '20px', md: '30px 60px' },
        }}
      >
        <img 
          src={logoImage} 
          alt="SEAMS Logo" 
          style={{ height: '90px', objectFit: 'contain', cursor: 'pointer' }} 
          onClick={() => navigate('/')}
        />

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 4 }}>
          {['HOME', 'ABOUT', 'CONTACT', 'BLOG'].map((item) => (
            <Typography key={item} sx={{ color: 'white', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}>
              {item}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            onClick={() => navigate('/register')}
            sx={{ display: { xs: 'none', sm: 'block' }, color: 'white', borderRadius: '50px', px: 3, fontWeight: 'bold', fontFamily: "'Poppins', sans-serif" }}
          >
            SIGN UP
          </Button>
          <Button 
            onClick={() => navigate('/login')}
            variant="contained" 
            sx={{ bgcolor: 'white', color: 'black', borderRadius: '50px', px: 4, fontWeight: 'bold', fontFamily: "'Poppins', sans-serif", '&:hover': { bgcolor: 'grey.200' } }}
          >
            LOGIN
          </Button>
        </Box>
      </Box>

      <Box 
        sx={{ 
          position: 'relative', 
          zIndex: 2, 
          flexGrow: 1, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center', 
          padding: '20px', 
        }}
      >
        <Box sx={glassCardStyles}>

          {step === 1 && (
            <>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, letterSpacing: '2px', fontFamily: "'Ranade', sans-serif", mb: 2 }}>
                CREATE YOUR ACCOUNT
              </Typography>

              <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4, fontFamily: "'Poppins', sans-serif" }}>
                Join SEAMS to manage your stay effortlessly.
              </Typography>

              {errorMessage && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', textAlign: 'left' }}>{errorMessage}</Alert>}

              <Box component="form" onSubmit={handleRegisterSubmit}>
                
                <Box display="flex" gap={2}>
                  <TextField fullWidth name="first_name" placeholder="First Name" variant="outlined" value={formData.first_name} onChange={handleChange} disabled={loading} error={!!errors.first_name} helperText={errors.first_name} sx={customInputStyles} InputProps={{ startAdornment: (<InputAdornment position="start"><PersonOutline sx={{ color: 'white' }} /></InputAdornment>) }} />
                  <TextField fullWidth name="last_name" placeholder="Last Name" variant="outlined" value={formData.last_name} onChange={handleChange} disabled={loading} error={!!errors.last_name} helperText={errors.last_name} sx={customInputStyles} InputProps={{ startAdornment: (<InputAdornment position="start"><PersonOutline sx={{ color: 'white' }} /></InputAdornment>) }} />
                </Box>

                <TextField fullWidth name="username" placeholder="Username" variant="outlined" value={formData.username} onChange={handleChange} disabled={loading} error={!!errors.username} helperText={errors.username} sx={customInputStyles} InputProps={{ startAdornment: (<InputAdornment position="start"><PersonOutline sx={{ color: 'white' }} /></InputAdornment>) }} />
                <TextField fullWidth name="email" type="email" placeholder="Email Address" variant="outlined" value={formData.email} onChange={handleChange} disabled={loading} error={!!errors.email} helperText={errors.email} sx={customInputStyles} InputProps={{ startAdornment: (<InputAdornment position="start"><EmailOutlined sx={{ color: 'white' }} /></InputAdornment>) }} />
                
                <Box display="flex" gap={2}>
                  <TextField fullWidth name="phone" placeholder="Phone Number" variant="outlined" value={formData.phone} onChange={handleChange} disabled={loading} error={!!errors.phone} helperText={errors.phone} sx={customInputStyles} InputProps={{ startAdornment: (<InputAdornment position="start"><PhoneOutlined sx={{ color: 'white' }} /></InputAdornment>) }} />
                  <TextField fullWidth name="id_number" placeholder="ID Number" variant="outlined" value={formData.id_number} onChange={handleChange} disabled={loading} error={!!errors.id_number} helperText={errors.id_number} sx={customInputStyles} InputProps={{ startAdornment: (<InputAdornment position="start"><BadgeOutlined sx={{ color: 'white' }} /></InputAdornment>) }} />
                </Box>

                <TextField fullWidth name="password" type="password" placeholder="Password" variant="outlined" value={formData.password} onChange={handleChange} disabled={loading} error={!!errors.password} helperText={errors.password || 'Min 8 characters'} sx={customInputStyles} InputProps={{ startAdornment: (<InputAdornment position="start"><LockOutlined sx={{ color: 'white' }} /></InputAdornment>) }} />
                <TextField fullWidth name="confirmPassword" type="password" placeholder="Confirm Password" variant="outlined" value={formData.confirmPassword} onChange={handleChange} disabled={loading} error={!!errors.confirmPassword} helperText={errors.confirmPassword} sx={customInputStyles} InputProps={{ startAdornment: (<InputAdornment position="start"><LockOutlined sx={{ color: 'white' }} /></InputAdornment>) }} />

                <Box sx={{ mb: 4 }}>
                  <FormControlLabel
                    control={<Checkbox checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }} />}
                    label={<Typography sx={{ color: 'white', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif" }}>I agree to the Terms & Conditions</Typography>}
                  />
                </Box>

                <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ bgcolor: 'white', color: 'black', borderRadius: '50px', py: 1.5, fontSize: '1rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif", '&:hover': { bgcolor: 'grey.200' }, '&.Mui-disabled': { bgcolor: 'rgba(255, 255, 255, 0.7)' } }}>
                  {loading ? <CircularProgress size={24} sx={{ color: 'black' }} /> : 'CREATE ACCOUNT'}
                </Button>
                
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif" }}>
                    Already have an account?{' '}
                    <Link onClick={() => navigate('/login')} underline="hover" sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                      Login here
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </>
          )}

          {step === 2 && (
            <>
              <MarkEmailRead sx={{ fontSize: 60, color: 'white', mb: 2 }} />
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, fontFamily: "'Poppins', sans-serif", mb: 1 }}>VERIFY EMAIL</Typography>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4, fontFamily: "'Poppins', sans-serif" }}>
                Enter the code sent to <strong>{formData.email}</strong>
              </Typography>

              {successMessage && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px', textAlign: 'left' }}>{successMessage}</Alert>}
              {errorMessage && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', textAlign: 'left' }}>{errorMessage}</Alert>}

              <Box component="form" onSubmit={handleVerifySubmit}>
                <TextField 
                  fullWidth 
                  placeholder="6-Digit Code" 
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={loading}
                  required 
                  sx={{ 
                    ...customInputStyles, 
                    '& .MuiInputBase-input': { fontSize: 24, letterSpacing: 8, textAlign: 'center', color: 'white' } 
                  }}
                  inputProps={{ maxLength: 6 }}
                />
                <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 2, bgcolor: 'white', color: 'black', borderRadius: '50px', py: 1.5, fontSize: '1rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif", '&:hover': { bgcolor: 'grey.200' }, '&.Mui-disabled': { bgcolor: 'rgba(255, 255, 255, 0.7)' } }}>
                  {loading ? <CircularProgress size={24} sx={{ color: 'black' }} /> : 'VERIFY ACCOUNT'}
                </Button>
              </Box>
            </>
          )}

          {step === 3 && (
            <>
              <CheckCircle sx={{ fontSize: 80, color: '#4caf50', mb: 2 }} />
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, fontFamily: "'Poppins', sans-serif", mb: 2 }}>EMAIL VERIFIED!</Typography>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3, fontFamily: "'Poppins', sans-serif" }}>
                Your email is successfully verified. Your account is now pending Admin Approval.
              </Typography>
              
              <Alert severity="info" sx={{ mb: 4, borderRadius: '12px', textAlign: 'left' }}>
                You will receive an email once the Admin approves your account and assigns you a house.
              </Alert>
              
              <Button onClick={() => navigate('/login')} fullWidth variant="contained" sx={{ bgcolor: 'white', color: 'black', borderRadius: '50px', py: 1.5, fontSize: '1rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif", '&:hover': { bgcolor: 'grey.200' } }}>
                GO TO LOGIN
              </Button>
            </>
          )}

        </Box>
      </Box>
    </Box>
  );
};

export default TenantRegistration;