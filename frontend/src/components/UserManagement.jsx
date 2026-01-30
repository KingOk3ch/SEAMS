import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, Alert, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, IconButton, Grid, Tabs, Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LockResetIcon from '@mui/icons-material/LockReset';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [vacantHouses, setVacantHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog States
  const [openDialog, setOpenDialog] = useState(false);
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  
  // Validation State
  const [validationErrors, setValidationErrors] = useState({});

  // User Form Data
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '', // Added confirm
    first_name: '', last_name: '', role: 'tenant', phone: '', id_number: '', specialization: ''
  });

  // Approval Form Data
  const [approvalData, setApprovalData] = useState({
    house_id: '',
    move_in_date: new Date().toISOString().split('T')[0],
    contract_start: new Date().toISOString().split('T')[0],
    contract_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchUsers();
    fetchVacantHouses();
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
    }
  };

  const fetchVacantHouses = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/houses/vacant/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setVacantHouses(data);
      }
    } catch (err) { console.error(err); }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSuccess('');
    setError('');
  };

  // --- VALIDATION HELPER ---
  const validateField = (name, value) => {
      let errors = { ...validationErrors };
      
      // Kenyan Phone Regex
      if (name === 'phone') {
          const phoneRegex = /^(?:07|01)[0-9]{8}$/;
          if (value && !phoneRegex.test(value)) {
              errors.phone = "Must be 10 digits starting with 07 or 01";
          } else {
              delete errors.phone;
          }
      }
      
      // Password Match
      if (name === 'confirmPassword' || name === 'password') {
          const pass = name === 'password' ? value : formData.password;
          const confirm = name === 'confirmPassword' ? value : formData.confirmPassword;
          
          if (confirm && pass !== confirm) {
              errors.confirmPassword = "Passwords do not match";
          } else {
              delete errors.confirmPassword;
          }
      }
      setValidationErrors(errors);
  };

  // --- User CRUD Handlers ---

  const handleOpenDialog = (user = null) => {
    setValidationErrors({});
    if (user) {
      setEditMode(true);
      setCurrentUser(user);
      setFormData({
        username: user.username, email: user.email || '', password: '', confirmPassword: '',
        first_name: user.first_name, last_name: user.last_name, role: user.role,
        phone: user.phone || '', id_number: user.id_number || '', specialization: user.specialization || ''
      });
    } else {
      setEditMode(false);
      setCurrentUser(null);
      setFormData({
        username: '', email: '', password: '', confirmPassword: '',
        first_name: '', last_name: '', role: 'tenant', phone: '', id_number: '', specialization: ''
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
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value); // Trigger validation
    
    if (name === 'role' && value !== 'technician') {
      setFormData(prev => ({ ...prev, specialization: '' }));
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const token = localStorage.getItem('access_token');
      const { confirmPassword, ...submitData } = formData; // Exclude confirm field
      
      if (editMode) {
        if (!submitData.password) delete submitData.password;
        
        const response = await fetch(`http://localhost:8000/api/users/${currentUser.id}/`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });

        if (response.ok) {
          fetchUsers();
          handleCloseDialog();
          setSuccess('User updated successfully');
        } else {
          const data = await response.json();
          setError(JSON.stringify(data));
        }
      } else {
        const response = await fetch('http://localhost:8000/api/users/register/', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.temporary_password) {
            setGeneratedPassword(data.temporary_password);
            setSuccess(`User created! Temp password: ${data.temporary_password}`);
          } else {
            setSuccess('User created successfully');
          }
          fetchUsers();
        } else {
          const data = await response.json();
          setError(JSON.stringify(data));
        }
      }
    } catch (err) {
      setError('Failed to save user');
    }
  };

  // --- Approval Handlers ---

  const handleOpenApproveDialog = (user) => {
    setCurrentUser(user);
    setApprovalData({
      house_id: '',
      move_in_date: new Date().toISOString().split('T')[0],
      contract_start: new Date().toISOString().split('T')[0],
      contract_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    });
    setOpenApproveDialog(true);
  };

  const handleCloseApproveDialog = () => {
    setOpenApproveDialog(false);
    setCurrentUser(null);
  };

  const handleApprovalInputChange = (e) => {
    const { name, value } = e.target;
    setApprovalData(prev => ({ ...prev, [name]: value }));
  };

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/users/${currentUser.id}/approve/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status: 'approved', ...approvalData })
      });

      if (response.ok) {
        setSuccess(`User ${currentUser.username} approved!`);
        fetchUsers();
        fetchVacantHouses();
        handleCloseApproveDialog();
      } else {
        const data = await response.json();
        setError(JSON.stringify(data));
      }
    } catch (err) { setError('Failed to approve user'); }
  };

  const handleReject = async (userId) => {
    const reason = prompt("Enter reason for rejection:");
    if (!reason) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/users/${userId}/reject/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: reason })
      });
      if (response.ok) { setSuccess('User rejected'); fetchUsers(); }
      else setError('Failed to reject');
    } catch (err) { setError('Failed to reject user'); }
  };

  const handleResetPassword = async (userId, username) => {
    if (!window.confirm(`Reset password for ${username}?`)) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/users/${userId}/reset_password/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setSuccess(`New password: ${data.temporary_password}`);
      }
    } catch (err) { setError('Failed to reset password'); }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/users/${userId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) { fetchUsers(); setSuccess('User deleted'); }
    } catch (err) { setError('Failed to delete user'); }
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

  const allUsers = users;
  const pendingUsers = users.filter(u => u.approval_status === 'pending');
  const displayedUsers = tabValue === 0 ? allUsers : pendingUsers;

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>User Management</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Add User</Button>
        </Box>
        <Paper sx={{ mt: 2, mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary">
            <Tab label="All Users" />
            <Tab label={<Box display="flex" alignItems="center">Pending Approvals {pendingUsers.length > 0 && (<Chip label={pendingUsers.length} color="error" size="small" sx={{ ml: 1, height: 20 }} />)}</Box>} />
          </Tabs>
        </Paper>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Role</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Email Verified</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedUsers.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No users found</TableCell></TableRow>
            ) : (
              displayedUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">{user.first_name} {user.last_name}</Typography>
                    <Typography variant="caption" color="textSecondary">{user.email}</Typography>
                  </TableCell>
                  <TableCell><Chip label={user.role.toUpperCase()} color={getRoleColor(user.role)} size="small" /></TableCell>
                  <TableCell>
                    {user.approval_status === 'approved' ? <Chip label="APPROVED" color="success" size="small" variant="outlined" /> : 
                     user.approval_status === 'rejected' ? <Chip label="REJECTED" color="error" size="small" variant="outlined" /> : 
                     <Chip label="PENDING" color="warning" size="small" />}
                  </TableCell>
                  <TableCell>{user.email_verified ? <CheckCircleIcon color="success" fontSize="small"/> : <CancelIcon color="disabled" fontSize="small"/>}</TableCell>
                  <TableCell>
                    {tabValue === 1 ? (
                      <>
                        <Button size="small" variant="contained" color="success" startIcon={<ThumbUpIcon />} onClick={() => handleOpenApproveDialog(user)} sx={{ mr: 1 }}>Approve</Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<ThumbDownIcon />} onClick={() => handleReject(user.id)}>Reject</Button>
                      </>
                    ) : (
                      <>
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(user)}><EditIcon /></IconButton>
                        <IconButton size="small" color="warning" onClick={() => handleResetPassword(user.id, user.username)}><LockResetIcon /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}><DeleteIcon /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          {generatedPassword && <Alert severity="success" sx={{ mb: 2 }}>Temporary Password: <strong>{generatedPassword}</strong></Alert>}
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="First Name" name="first_name" value={formData.first_name} onChange={handleInputChange} fullWidth /></Grid>
              <Grid item xs={6}><TextField label="Last Name" name="last_name" value={formData.last_name} onChange={handleInputChange} fullWidth /></Grid>
              <Grid item xs={6}><TextField label="Username" name="username" value={formData.username} onChange={handleInputChange} fullWidth disabled={editMode} /></Grid>
              <Grid item xs={6}>
                <TextField select label="Role" name="role" value={formData.role} onChange={handleInputChange} fullWidth>
                  <MenuItem value="estate_admin">Estate Admin</MenuItem>
                  <MenuItem value="technician">Technician</MenuItem>
                  <MenuItem value="tenant">Tenant</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                </TextField>
              </Grid>
              
              <Grid item xs={6}>
                  <TextField 
                      label="Phone" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      fullWidth 
                      error={!!validationErrors.phone}
                      helperText={validationErrors.phone}
                  />
              </Grid>
              <Grid item xs={6}><TextField label="ID Number" name="id_number" value={formData.id_number} onChange={handleInputChange} fullWidth /></Grid>
              <Grid item xs={6}><TextField label="Email" name="email" value={formData.email} onChange={handleInputChange} fullWidth /></Grid>

              {!editMode && (
                  <>
                    <Grid item xs={6}>
                        <TextField 
                            label="Password" 
                            name="password" 
                            type="password" 
                            value={formData.password} 
                            onChange={handleInputChange} 
                            fullWidth 
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField 
                            label="Confirm Password" 
                            name="confirmPassword" 
                            type="password" 
                            value={formData.confirmPassword} 
                            onChange={handleInputChange} 
                            fullWidth
                            error={!!validationErrors.confirmPassword}
                            helperText={validationErrors.confirmPassword}
                        />
                    </Grid>
                  </>
              )}

              {formData.role === 'technician' && (
                <Grid item xs={12}>
                  <TextField select label="Specialization" name="specialization" value={formData.specialization} onChange={handleInputChange} fullWidth>
                    <MenuItem value="plumbing">Plumbing</MenuItem>
                    <MenuItem value="electrical">Electrical</MenuItem>
                    <MenuItem value="structural">Structural</MenuItem>
                    <MenuItem value="pest_control">Pest Control</MenuItem>
                    <MenuItem value="general">General</MenuItem>
                  </TextField>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {!generatedPassword && (
              <Button 
                onClick={handleSubmit} 
                variant="contained" 
                disabled={Object.keys(validationErrors).length > 0}
              >
                {editMode ? 'Update' : 'Create'}
              </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Approval Dialog - KEPT INTACT */}
      <Dialog open={openApproveDialog} onClose={handleCloseApproveDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Tenant & Assign House</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">Approving <strong>{currentUser?.first_name} {currentUser?.last_name}</strong>. Please assign a vacant house.</Alert>
            <TextField select label="Assign House" name="house_id" value={approvalData.house_id} onChange={handleApprovalInputChange} fullWidth required>
              {vacantHouses.length === 0 ? <MenuItem disabled>No vacant houses available</MenuItem> : vacantHouses.map((h) => <MenuItem key={h.id} value={h.id}>{h.house_number} ({h.house_type}) - KES {h.rent_amount}</MenuItem>)}
            </TextField>
            <TextField label="Move-in Date" name="move_in_date" type="date" value={approvalData.move_in_date} onChange={handleApprovalInputChange} fullWidth InputLabelProps={{ shrink: true }} />
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="Contract Start" name="contract_start" type="date" value={approvalData.contract_start} onChange={handleApprovalInputChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={6}><TextField label="Contract End" name="contract_end" type="date" value={approvalData.contract_end} onChange={handleApprovalInputChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApproveDialog}>Cancel</Button>
          <Button onClick={handleApprove} variant="contained" color="success" disabled={!approvalData.house_id}>Approve & Assign</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default UserManagement;