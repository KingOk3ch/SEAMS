import React, { useState } from 'react';
import { 
  Box, Typography, TextField, Button, Checkbox, FormControlLabel, Link, InputAdornment, IconButton, Alert, CircularProgress
} from '@mui/material';
import { PersonOutline, LockOutlined, VisibilityOffOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { parseBackendErrors } from '../utils/errorHandler';

import logoImage from '../assets/seamslogo.png';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleInputChange = (setter, field) => (e) => {
      setter(e.target.value);
      if (fieldErrors[field]) {
          setFieldErrors(prev => ({ ...prev, [field]: null }));
      }
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
    '& .MuiFormHelperText-root.Mui-error': {
      color: '#ff8a80', 
      marginLeft: '14px',
      fontFamily: "'Poppins', sans-serif",
    }
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
            sx={{ display: { xs: 'none', sm: 'block' }, color: 'white', borderRadius: '50px', px: 3, fontFamily: "'Poppins', sans-serif" }}
          >
            SIGN UP
          </Button>
          <Button 
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
        <Box 
          sx={{ 
            maxWidth: '450px', 
            width: '100%',
            bgcolor: 'rgba(0,0,0,0.5)', 
            p: { xs: 4, md: 5 }, 
            borderRadius: 4, 
            border: '1px solid rgba(255,255,255,0.2)', 
            textAlign: 'center', 
            backdropFilter: 'blur(10px)' 
          }}
        >
          
          <Typography 
            variant="h4" 
            sx={{ color: 'white', fontWeight: 800, letterSpacing: '2px', fontFamily: "'Ranade', sans-serif", mb: 1 }}
          >
            WELCOME BACK
          </Typography>
          
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4, fontFamily: "'Poppins', sans-serif" }}>
            Please enter your login details.
          </Typography>

          {globalError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', textAlign: 'left' }}>
              {globalError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              name="username"
              placeholder="Username or Email"
              variant="outlined"
              autoFocus
              disabled={loading}
              value={username}
              onChange={handleInputChange(setUsername, 'username')}
              error={!!fieldErrors.username || !!globalError} 
              helperText={fieldErrors.username}
              sx={customInputStyles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline sx={{ color: 'white' }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              name="password"
              type="password"
              placeholder="Password"
              variant="outlined"
              disabled={loading}
              value={password}
              onChange={handleInputChange(setPassword, 'password')}
              error={!!fieldErrors.password || !!globalError}
              helperText={fieldErrors.password}
              sx={customInputStyles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined sx={{ color: 'white' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" disableRipple>
                      <VisibilityOffOutlined sx={{ color: 'white', opacity: 0.6 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <FormControlLabel
                control={<Checkbox sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }} />}
                label={<Typography sx={{ color: 'white', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif" }}>Remember me</Typography>}
              />
              <Link href="#" sx={{ color: '#ff4d4d', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif", textDecorationColor: '#ff4d4d' }}>
                Forgot Password
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                bgcolor: 'white',
                color: 'black',
                borderRadius: '50px', 
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
                '&:hover': { bgcolor: 'grey.200' },
                '&.Mui-disabled': { bgcolor: 'rgba(255, 255, 255, 0.7)' }
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'black' }} /> : 'LOGIN'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif" }}>
                New tenant?{' '}
                <Link
                  onClick={() => navigate('/register')}
                  underline="hover"
                  sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Register here
                </Link>
              </Typography>
            </Box>
            
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default Login;