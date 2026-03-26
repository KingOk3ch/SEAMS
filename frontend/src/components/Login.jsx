import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Button, Checkbox, FormControlLabel, Link, InputAdornment, IconButton, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { PersonOutline, LockOutlined, VisibilityOffOutlined, VisibilityOutlined } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import { parseBackendErrors } from '../utils/errorHandler';

import logoImage from '../assets/seamslogo.png';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false); 
  const [rememberMe, setRememberMe] = useState(false);

  // --- Verification Modal State ---
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyData, setVerifyData] = useState({ email: '', code: '' });
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState({ type: '', text: '' });

  // --- Forgot Password Modal State ---
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ type: '', text: '' });

  // --- Navbar Info Modals State ---
  const [aboutOpen, setAboutOpen] = useState(false);
  const [faqsOpen, setFaqsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const savedUsername = localStorage.getItem('seams_remembered_username');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleInputChange = (setter, field) => (e) => {
      setter(e.target.value);
      if (fieldErrors[field]) {
          setFieldErrors(prev => ({ ...prev, [field]: null }));
      }
      if (globalError) setGlobalError('');
  };

  const handleVerifyChange = (e) => {
    setVerifyData({
      ...verifyData,
      [e.target.name]: e.target.value,
    });
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
        if (rememberMe) {
          localStorage.setItem('seams_remembered_username', username);
        } else {
          localStorage.removeItem('seams_remembered_username');
        }

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

  const handleVerifySubmit = async () => {
    if (!verifyData.email || !verifyData.code) {
      setVerifyMsg({ type: 'error', text: 'Please fill in both fields.' });
      return;
    }

    setVerifyLoading(true);
    setVerifyMsg({ type: '', text: '' });

    try {
      const response = await fetch('http://localhost:8000/api/auth/verify-email/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyData)
      });

      const data = await response.json();

      if (response.ok) {
        setVerifyMsg({ type: 'success', text: 'Email verified successfully! You can now close this and log in.' });
        setTimeout(() => {
          setVerifyOpen(false);
          setVerifyMsg({ type: '', text: '' });
          setVerifyData({ email: '', code: '' });
        }, 3000);
      } else {
        setVerifyMsg({ type: 'error', text: data.error || 'Verification failed. Please check your code.' });
      }
    } catch (err) {
      setVerifyMsg({ type: 'error', text: 'Network error. Please make sure the server is running.' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleForgotSubmit = async () => {
    if (!forgotEmail) {
      setForgotMsg({ type: 'error', text: 'Please enter your email address.' });
      return;
    }
    setForgotLoading(true);
    setForgotMsg({ type: '', text: '' });

    try {
      const response = await fetch('http://localhost:8000/api/users/forgot_password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await response.json();
      
      if (response.ok) {
        setForgotMsg({ type: 'success', text: data.message || 'Password reset instructions sent.' });
        setTimeout(() => {
          setForgotOpen(false);
          setForgotMsg({ type: '', text: '' });
          setForgotEmail('');
        }, 4000);
      } else {
        setForgotMsg({ type: 'error', text: data.error || 'Failed to process request.' });
      }
    } catch (err) {
      setForgotMsg({ type: 'error', text: 'Network error. Please make sure the server is running.' });
    } finally {
      setForgotLoading(false);
    }
  };

  const closeVerifyDialog = () => {
    if (!verifyLoading) {
      setVerifyOpen(false);
      setVerifyMsg({ type: '', text: '' });
      setVerifyData({ email: '', code: '' });
    }
  };

  const closeForgotDialog = () => {
    if (!forgotLoading) {
      setForgotOpen(false);
      setForgotMsg({ type: '', text: '' });
      setForgotEmail('');
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

  const handleTopLoginClick = () => {
    const inputElement = document.getElementById('login-username-input');
    if (inputElement) {
      inputElement.focus();
    }
  };

  const handleFaqChange = (panel) => (event, isExpanded) => {
    setExpandedFaq(isExpanded ? panel : false);
  };

  const navItems = [
    { label: 'HOME', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { label: 'ABOUT', action: () => setAboutOpen(true) },
    { label: 'FAQS', action: () => setFaqsOpen(true) },
    { label: 'CONTACT', action: () => setContactOpen(true) }
  ];

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
      color: 'white',        
      caretColor: 'white',   
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

  // Reusable glass style for all modals
  const glassDialogStyle = {
    backdropFilter: 'blur(15px)',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
  };

  // Helper for dialog divider color
  const dividerStyle = { borderColor: 'rgba(255,255,255,0.15)' };

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
          {navItems.map((item) => (
            <Typography 
              key={item.label} 
              onClick={item.action}
              sx={{ color: 'white', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
            >
              {item.label}
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
            onClick={handleTopLoginClick}
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
              id="login-username-input"
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
              type={showPassword ? 'text' : 'password'}
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
                    <IconButton 
                      edge="end" 
                      disableRipple 
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {showPassword ? (
                        <VisibilityOutlined sx={{ color: 'white', opacity: 0.9 }} />
                      ) : (
                        <VisibilityOffOutlined sx={{ color: 'white', opacity: 0.6 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)} 
                    sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }} 
                  />
                }
                label={<Typography sx={{ color: 'white', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif" }}>Remember me</Typography>}
              />
              <Link 
                component="button"
                type="button"
                onClick={(e) => { e.preventDefault(); setForgotOpen(true); }}
                sx={{ color: '#ff4d4d', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif", textDecorationColor: '#ff4d4d', cursor: 'pointer' }}
              >
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
                '&.Mui-disabled': { bgcolor: 'rgba(255, 255, 255, 0.7)' },
                mb: 2
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'black' }} /> : 'LOGIN'}
            </Button>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Link 
                component="button" 
                type="button"
                variant="body2" 
                underline="hover"
                onClick={(e) => {
                  e.preventDefault();
                  setVerifyOpen(true);
                }}
                sx={{ color: '#a5d6a7', fontFamily: "'Poppins', sans-serif" }}
              >
                Have a verification code? Verify your account
              </Link>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
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

      {/* --- INFO MODALS (ABOUT, FAQS, CONTACT) --- */}
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: glassDialogStyle }}>
        <DialogTitle sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 'bold' }}>About SEAMS</DialogTitle>
        <DialogContent dividers sx={dividerStyle}>
          <Typography variant="body1" sx={{ fontFamily: "'Poppins', sans-serif", mb: 2, color: 'rgba(255,255,255,0.9)' }}>
            The Smart Estate & Apartment Management System (SEAMS) is your centralized, modern portal for streamlined property living. 
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "'Poppins', sans-serif", color: 'rgba(255,255,255,0.7)' }}>
            We eliminate manual paperwork by providing an easy-to-use platform for digital lease signing, automated billing, transparent payment tracking, and responsive maintenance reporting.
          </Typography>
        </DialogContent>
        <DialogActions sx={dividerStyle}>
          <Button onClick={() => setAboutOpen(false)} sx={{ color: 'white', fontFamily: "'Poppins', sans-serif" }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={faqsOpen} onClose={() => setFaqsOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: glassDialogStyle }}>
        <DialogTitle sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 'bold' }}>Frequently Asked Questions</DialogTitle>
        <DialogContent dividers sx={{ p: 0, ...dividerStyle }}>
          <Accordion 
            expanded={expandedFaq === 'panel1'} 
            onChange={handleFaqChange('panel1')} 
            disableGutters elevation={0} square
            sx={{ bgcolor: 'transparent', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
              <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500 }}>How do I get my login details?</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif" }}>
                If you are a new tenant, click "SIGN UP" or "Register here" to create your account. Once an administrator approves your registration and allocates your unit, you will be able to log in.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion 
            expanded={expandedFaq === 'panel2'} 
            onChange={handleFaqChange('panel2')} 
            disableGutters elevation={0} square
            sx={{ bgcolor: 'transparent', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
              <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500 }}>What if I forgot my password?</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif" }}>
                Click the "Forgot Password" link on the login form. Enter your registered email, and we will send you a temporary password to regain access to your account.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion 
            expanded={expandedFaq === 'panel3'} 
            onChange={handleFaqChange('panel3')} 
            disableGutters elevation={0} square
            sx={{ bgcolor: 'transparent', color: 'white', '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
              <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500 }}>How do I report a maintenance issue?</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif" }}>
                Log in to your Tenant Dashboard, navigate to the "Requests" or "Maintenance" section, and click "Report Issue". You can describe the problem and even upload a photo for the technician.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions sx={dividerStyle}>
          <Button onClick={() => setFaqsOpen(false)} sx={{ color: 'white', fontFamily: "'Poppins', sans-serif" }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={contactOpen} onClose={() => setContactOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: glassDialogStyle }}>
        <DialogTitle sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 'bold' }}>Contact Support</DialogTitle>
        <DialogContent dividers sx={dividerStyle}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontFamily: "'Poppins', sans-serif" }}>
              Need immediate assistance? Reach out to the estate management team:
            </Typography>
            <Box>
              <Typography variant="subtitle2" sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 'bold' }}>Email Support:</Typography>
              <Typography variant="body1" sx={{ color: '#a5d6a7', fontFamily: "'Poppins', sans-serif" }}>support.seams@gmail.com</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 'bold' }}>Phone Support:</Typography>
              <Typography variant="body1" sx={{ color: '#a5d6a7', fontFamily: "'Poppins', sans-serif" }}>+254 700 000 000</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={dividerStyle}>
          <Button onClick={() => setContactOpen(false)} sx={{ color: 'white', fontFamily: "'Poppins', sans-serif" }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* --- VERIFICATION MODAL --- */}
      <Dialog open={verifyOpen} onClose={closeVerifyDialog} maxWidth="xs" fullWidth PaperProps={{ sx: glassDialogStyle }}>
        <DialogTitle sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 'bold' }}>Verify Your Account</DialogTitle>
        <DialogContent dividers sx={dividerStyle}>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontFamily: "'Poppins', sans-serif", mb: 2 }}>
              Enter the email address associated with your account and the 6-digit verification code you received.
            </Typography>

            {verifyMsg.text && (
              <Alert severity={verifyMsg.type} sx={{ mb: 2 }}>
                {verifyMsg.text}
              </Alert>
            )}

            <TextField
              label="Email Address"
              name="email"
              type="email"
              value={verifyData.email}
              onChange={handleVerifyChange}
              fullWidth
              required
              sx={customInputStyles}
            />
            <TextField
              label="6-Digit Verification Code"
              name="code"
              value={verifyData.code}
              onChange={handleVerifyChange}
              fullWidth
              required
              inputProps={{ maxLength: 6 }}
              sx={{ ...customInputStyles, mb: 0 }} // Remove bottom margin for the last input
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, ...dividerStyle }}>
          <Button onClick={closeVerifyDialog} disabled={verifyLoading} sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif" }}>
            Cancel
          </Button>
          <Button 
            onClick={handleVerifySubmit} 
            variant="contained" 
            sx={{ bgcolor: 'white', color: 'black', fontFamily: "'Poppins', sans-serif", '&:hover': { bgcolor: 'grey.200' } }}
            disabled={verifyLoading || !verifyData.email || !verifyData.code}
          >
            {verifyLoading ? <CircularProgress size={24} sx={{ color: 'black' }} /> : 'Verify'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- FORGOT PASSWORD MODAL --- */}
      <Dialog open={forgotOpen} onClose={closeForgotDialog} maxWidth="xs" fullWidth PaperProps={{ sx: glassDialogStyle }}>
        <DialogTitle sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 'bold' }}>Reset Password</DialogTitle>
        <DialogContent dividers sx={dividerStyle}>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontFamily: "'Poppins', sans-serif", mb: 2 }}>
              Enter your registered email address to receive a temporary password.
            </Typography>

            {forgotMsg.text && (
              <Alert severity={forgotMsg.type} sx={{ mb: 2 }}>
                {forgotMsg.text}
              </Alert>
            )}

            <TextField
              label="Email Address"
              name="forgotEmail"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              fullWidth
              required
              autoFocus
              sx={{ ...customInputStyles, mb: 0 }} 
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, ...dividerStyle }}>
          <Button onClick={closeForgotDialog} disabled={forgotLoading} sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif" }}>
            Cancel
          </Button>
          <Button 
            onClick={handleForgotSubmit} 
            variant="contained" 
            sx={{ bgcolor: 'white', color: 'black', fontFamily: "'Poppins', sans-serif", '&:hover': { bgcolor: 'grey.200' } }}
            disabled={forgotLoading || !forgotEmail}
          >
            {forgotLoading ? <CircularProgress size={24} sx={{ color: 'black' }} /> : 'Send Link'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Login;