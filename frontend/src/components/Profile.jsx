import React, { useState, useEffect } from 'react';
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
  InputAdornment
} from '@mui/material';
import { PhotoCamera, Save, Lock, Person, Email, Phone, Badge } from '@mui/icons-material';

function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
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
        
        // Clear previews and re-fetch to get the server URL
        setNewProfileImage(null);
        setPreviewImage(null);
        fetchProfile(); 
      } else {
        const errorMsg = Object.values(data).flat().join(', ');
        setError(errorMsg || 'Failed to update profile');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');

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

      if (response.ok) {
        setSuccess('Password changed successfully');
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setSaving(false);
    }
  };

  // Helper to construct the correct image URL
  const getProfileImageUrl = () => {
    if (previewImage) return previewImage;
    if (!profileData.profile_picture) return undefined;
    
    // Check if the URL is already absolute (contains http)
    if (profileData.profile_picture.startsWith('http')) {
      return `${profileData.profile_picture}?t=${imageHash}`;
    }
    
    // If relative, append localhost
    return `http://localhost:8000${profileData.profile_picture}?t=${imageHash}`;
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <Container maxWidth="md" sx={{ mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        My Profile
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Person sx={{ mr: 1 }} /> Personal Details
        </Typography>
        
        <form onSubmit={handleSaveProfile}>
          <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
            <Avatar
              src={getProfileImageUrl()}
              sx={{ width: 120, height: 120, mb: 2, border: '4px solid white', boxShadow: 3 }}
            />
            <Button variant="outlined" component="label" startIcon={<PhotoCamera />}>
              Change Photo
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </Button>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="First Name" 
                value={profileData.first_name} 
                fullWidth 
                disabled 
                variant="filled"
                InputProps={{ startAdornment: <InputAdornment position="start"><Badge /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Last Name" 
                value={profileData.last_name} 
                fullWidth 
                disabled 
                variant="filled"
                InputProps={{ startAdornment: <InputAdornment position="start"><Badge /></InputAdornment> }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Username" 
                name="username" 
                value={profileData.username} 
                onChange={handleInputChange} 
                fullWidth 
                required 
                InputProps={{ startAdornment: <InputAdornment position="start"><Person /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Email" 
                name="email" 
                value={profileData.email} 
                onChange={handleInputChange} 
                fullWidth 
                required 
                InputProps={{ startAdornment: <InputAdornment position="start"><Email /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Phone" 
                name="phone" 
                value={profileData.phone} 
                onChange={handleInputChange} 
                fullWidth 
                InputProps={{ startAdornment: <InputAdornment position="start"><Phone /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="ID Number" 
                value={profileData.id_number} 
                fullWidth 
                disabled 
                variant="filled"
                helperText="Contact admin to change ID"
                InputProps={{ startAdornment: <InputAdornment position="start"><Badge /></InputAdornment> }}
              />
            </Grid>
          </Grid>

          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button type="submit" variant="contained" size="large" startIcon={<Save />} disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </Box>
        </form>
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Lock sx={{ mr: 1 }} /> Change Password
        </Typography>
        
        <form onSubmit={handleSavePassword}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField 
                label="Current Password" 
                name="old_password" 
                type="password" 
                value={passwordData.old_password} 
                onChange={handlePasswordChange} 
                fullWidth 
                required 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="New Password" 
                name="new_password" 
                type="password" 
                value={passwordData.new_password} 
                onChange={handlePasswordChange} 
                fullWidth 
                required 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Confirm New Password" 
                name="confirm_password" 
                type="password" 
                value={passwordData.confirm_password} 
                onChange={handlePasswordChange} 
                fullWidth 
                required 
              />
            </Grid>
          </Grid>
          
          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button type="submit" variant="contained" color="error" size="large" startIcon={<Lock />} disabled={saving}>
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}

export default Profile;