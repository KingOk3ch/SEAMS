import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Avatar,
  Grid,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
  IconButton
} from '@mui/material';
import { 
    PhotoCamera, 
    Save, 
    Lock, 
    Person, 
    Email, 
    Phone, 
    Badge, 
    ManageAccounts 
} from '@mui/icons-material';
import { parseBackendErrors } from '../utils/errorHandler';

function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Cache buster timestamp
  const [imageHash, setImageHash] = useState(Date.now());

  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    id_number: '',
    specialization: '',
    profile_picture: null
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [newProfileImage, setNewProfileImage] = useState(null);

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/users/me/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData({
          username: data.username || '',
          email: data.email || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          id_number: data.id_number || '',
          specialization: data.specialization || '',
          profile_picture: data.profile_picture
        });
        setImageHash(Date.now());
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    setFieldErrors({});

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();

      Object.keys(profileData).forEach(key => {
        if (key !== 'profile_picture' && profileData[key] !== null) {
          formData.append(key, profileData[key]);
        }
      });

      if (newProfileImage) {
        formData.append('profile_picture', newProfileImage);
      }

      const response = await fetch('http://localhost:8000/api/users/update_profile/', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile updated successfully');
        localStorage.setItem('user', JSON.stringify(data.user));
        setNewProfileImage(null);
        setPreviewImage(null);
        fetchProfile();
      } else {
        const { global, fields } = parseBackendErrors(data);
        setError(global || 'Failed to update profile.');
        setFieldErrors(fields);
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setFieldErrors({ confirm_password: 'New passwords do not match' });
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    setFieldErrors({});

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/users/update_profile/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          old_password: passwordData.old_password,
          new_password: passwordData.new_password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        
        // Check if the backend flagged that a password was changed
        if (data.password_changed) {
            setSuccess('Password changed successfully! Redirecting to login for security...');
            
            setTimeout(() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                navigate('/');
                window.location.reload(); 
            }, 3000); 
        } else {
            setSuccess('Profile updated successfully.');
        }

      } else {
        const { global, fields } = parseBackendErrors(data);
        setError(global || 'Failed to change password.');
        setFieldErrors(fields);
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const getProfileImageUrl = () => {
    if (previewImage) return previewImage;
    if (!profileData.profile_picture) return undefined;
    if (profileData.profile_picture.startsWith('http')) {
      return `${profileData.profile_picture}?t=${imageHash}`;
    }
    return `http://localhost:8000${profileData.profile_picture}?t=${imageHash}`;
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <Container maxWidth="sm" sx={{ mb: 4, mt: 2 }}>
      
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        
        {/* --- Minimal Header --- */}
        <Alert severity="info" icon={<ManageAccounts />} sx={{ mb: 3 }}>
            Manage your personal details and security
        </Alert>

        <form onSubmit={handleSaveProfile}>
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box position="relative">
                <Avatar
                src={getProfileImageUrl()}
                sx={{ width: 100, height: 100, border: '3px solid #e0e0e0', boxShadow: 1 }}
                />
                <IconButton 
                    component="label" 
                    size="small"
                    sx={{ 
                        position: 'absolute', bottom: 0, right: 0, 
                        bgcolor: 'primary.main', color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' }
                    }}
                >
                    <PhotoCamera fontSize="small" />
                    <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                </IconButton>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {/* Read Only Row */}
            <Grid item xs={6}>
              <TextField
                label="First Name"
                value={profileData.first_name}
                fullWidth
                disabled
                size="small"
                variant="filled"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Last Name"
                value={profileData.last_name}
                fullWidth
                disabled
                size="small"
                variant="filled"
              />
            </Grid>

            {/* Editable Fields Stacked Vertically */}
            <Grid item xs={12}>
              <TextField
                label="Username"
                name="username"
                value={profileData.username}
                onChange={handleInputChange}
                fullWidth
                required
                size="small"
                InputProps={{ startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment> }}
                error={!!fieldErrors.username}
                helperText={fieldErrors.username}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Email Address"
                name="email"
                value={profileData.email}
                onChange={handleInputChange}
                fullWidth
                required
                size="small"
                InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment> }}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Phone Number"
                name="phone"
                value={profileData.phone}
                onChange={handleInputChange}
                fullWidth
                size="small"
                InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }}
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="National ID"
                value={profileData.id_number}
                fullWidth
                disabled
                variant="filled"
                size="small"
                helperText="Contact admin to update ID"
                InputProps={{ startAdornment: <InputAdornment position="start"><Badge fontSize="small" /></InputAdornment> }}
              />
            </Grid>

            <Grid item xs={12}>
                <Button type="submit" variant="contained" fullWidth startIcon={<Save />} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Profile'}
                </Button>
            </Grid>
          </Grid>
        </form>

        <Divider sx={{ my: 4 }}>
            <Typography variant="caption" color="text.secondary">SECURITY</Typography>
        </Divider>

        <form onSubmit={handleSavePassword}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Current Password"
                name="old_password"
                type="password"
                value={passwordData.old_password}
                onChange={handlePasswordChange}
                fullWidth
                required
                size="small"
                InputProps={{ startAdornment: <InputAdornment position="start"><Lock fontSize="small" /></InputAdornment> }}
                error={!!fieldErrors.old_password}
                helperText={fieldErrors.old_password}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="New Password"
                name="new_password"
                type="password"
                value={passwordData.new_password}
                onChange={handlePasswordChange}
                fullWidth
                required
                size="small"
                error={!!fieldErrors.new_password}
                helperText={fieldErrors.new_password}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Confirm"
                name="confirm_password"
                type="password"
                value={passwordData.confirm_password}
                onChange={handlePasswordChange}
                fullWidth
                required
                size="small"
                error={!!fieldErrors.confirm_password}
                helperText={fieldErrors.confirm_password}
              />
            </Grid>
            <Grid item xs={12}>
                <Button type="submit" variant="outlined" color="error" fullWidth disabled={saving}>
                    {saving ? 'Updating...' : 'Update Password'}
                </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

export default Profile;