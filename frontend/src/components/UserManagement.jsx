import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LockResetIcon from '@mui/icons-material/LockReset';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'tenant',
    phone: '',
    id_number: '',
    specialization: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/users/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError('Connection error');
      setLoading(false);
      console.error('Error:', err);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditMode(true);
      setCurrentUser(user);
      setFormData({
        username: user.username,
        email: user.email || '',
        password: '',
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        phone: user.phone || '',
        id_number: user.id_number || '',
        specialization: user.specialization || ''
      });
    } else {
      setEditMode(false);
      setCurrentUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'tenant',
        phone: '',
        id_number: '',
        specialization: ''
      });
    }
    setGeneratedPassword('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentUser(null);
    setGeneratedPassword('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specialization if role is not technician
    if (name === 'role' && value !== 'technician') {
      setFormData(prev => ({
        ...prev,
        specialization: ''
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (editMode) {
        // Update user (excluding password if empty)
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        
        const response = await fetch(`http://localhost:8000/api/users/${currentUser.id}/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          fetchUsers();
          handleCloseDialog();
          setSuccess('User updated successfully');
          setError('');
        } else {
          const data = await response.json();
          setError(JSON.stringify(data));
        }
      } else {
        // Create new user - don't send password, let backend generate it
        const submitData = { ...formData };
        delete submitData.password; // Remove password field to trigger auto-generation
        
        const response = await fetch('http://localhost:8000/api/users/register/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData)
        });

        if (response.ok) {
          const data = await response.json();
          
          // Show generated password to admin
          if (data.temporary_password) {
            setGeneratedPassword(data.temporary_password);
            setSuccess(`User created! Temporary password: ${data.temporary_password} - Please share this with the user.`);
          } else {
            setSuccess('User created successfully');
          }
          
          fetchUsers();
          setError('');
          // Don't close dialog yet - show password first
        } else {
          const data = await response.json();
          setError(JSON.stringify(data));
        }
      }
    } catch (err) {
      setError('Failed to save user');
      console.error('Error:', err);
    }
  };

  const handleResetPassword = async (userId, username) => {
    if (!window.confirm(`Reset password for ${username}? This will generate a new temporary password and they'll need to complete their profile again.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/users/${userId}/reset_password/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        fetchUsers();
        setSuccess(`Password reset successfully! New temporary password: ${data.temporary_password} - Please share this with ${username}.`);
        setError('');
      } else {
        setError('Failed to reset password');
      }
    } catch (err) {
      setError('Failed to reset password');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/users/${userId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchUsers();
        setSuccess('User deleted successfully');
        setError('');
      } else {
        setError('Failed to delete user');
      }
    } catch (err) {
      setError('Failed to delete user');
      console.error('Error:', err);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'estate_admin': return 'error';
      case 'technician': return 'primary';
      case 'tenant': return 'success';
      case 'manager': return 'warning';
      default: return 'default';
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Password copied to clipboard!');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>
            User Management
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add User
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Total Users: {users.length}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Username</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Phone</strong></TableCell>
              <TableCell><strong>Role</strong></TableCell>
              <TableCell><strong>Specialization</strong></TableCell>
              <TableCell><strong>Profile Complete</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.first_name} {user.last_name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                <TableCell>{user.phone || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.role.replace('_', ' ').toUpperCase()} 
                    color={getRoleColor(user.role)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {user.specialization ? (
                    <Chip 
                      label={user.specialization.replace('_', ' ').toUpperCase()} 
                      size="small"
                      variant="outlined"
                    />
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {user.profile_completed ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <CancelIcon color="warning" />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleOpenDialog(user)}
                    title="Edit User"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="warning"
                    onClick={() => handleResetPassword(user.id, user.username)}
                    title="Reset Password"
                  >
                    <LockResetIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDelete(user.id)}
                    title="Delete User"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          {!editMode && !generatedPassword && (
            <Alert severity="info" sx={{ mb: 2 }}>
              A random temporary password will be generated automatically. User will change it on first login.
            </Alert>
          )}
          
          {generatedPassword && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>User created successfully!</strong>
              </Typography>
              <Typography variant="body2" gutterBottom>
                Temporary Password: <strong>{generatedPassword}</strong>
              </Typography>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => copyToClipboard(generatedPassword)}
                sx={{ mt: 1 }}
              >
                Copy Password
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                ⚠️ Please share this password with the user. It won't be shown again!
              </Typography>
            </Alert>
          )}
          
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  disabled={editMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  fullWidth
                >
                  <MenuItem value="estate_admin">Estate Admin</MenuItem>
                  <MenuItem value="technician">Technician</MenuItem>
                  <MenuItem value="tenant">Tenant</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                </TextField>
              </Grid>
              {formData.role === 'technician' && (
                <Grid item xs={12}>
                  <TextField
                    select
                    label="Specialization"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    required
                    fullWidth
                  >
                    <MenuItem value="plumbing">Plumbing</MenuItem>
                    <MenuItem value="electrical">Electrical</MenuItem>
                    <MenuItem value="structural">Structural</MenuItem>
                    <MenuItem value="pest_control">Pest Control</MenuItem>
                    <MenuItem value="general">General Maintenance</MenuItem>
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12}>
                <Alert severity="info">
                  Email, Phone, and ID Number are optional. Users will add these on first login.
                </Alert>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {generatedPassword ? 'Close' : 'Cancel'}
          </Button>
          {!generatedPassword && (
            <Button onClick={handleSubmit} variant="contained">
              {editMode ? 'Update' : 'Create User'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default UserManagement;