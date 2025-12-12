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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PhotoCamera from '@mui/icons-material/PhotoCamera';

function MaintenanceRequests() {
  const [requests, setRequests] = useState([]);
  const [houses, setHouses] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [userRole, setUserRole] = useState('');
  const [tenantHouse, setTenantHouse] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [formData, setFormData] = useState({
    house: '',
    issue_description: '',
    category: 'general',
    priority: 'medium',
    status: 'pending',
    estimated_cost: ''
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setUserRole(user.role);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      const requestsResponse = await fetch('http://localhost:8000/api/maintenance/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const requestsData = await requestsResponse.json();
      
      let filteredRequests = requestsData;
      
      if (user.role === 'tenant') {
        filteredRequests = requestsData.filter(m => m.reported_by == user.id);
        
        const tenantsResponse = await fetch('http://localhost:8000/api/tenants/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const tenantsData = await tenantsResponse.json();
        const myTenant = tenantsData.find(t => t.user.id === user.id);
        if (myTenant) {
          setTenantHouse(myTenant.house);
        }
      } else if (user.role === 'technician') {
        filteredRequests = requestsData.filter(m => m.assigned_to == user.id);
      }
      
      setRequests(filteredRequests);

      if (user.role === 'estate_admin') {
        const housesResponse = await fetch('http://localhost:8000/api/houses/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const housesData = await housesResponse.json();
        setHouses(housesData);
      }

      if (user.role === 'estate_admin') {
        const usersResponse = await fetch('http://localhost:8000/api/users/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const usersData = await usersResponse.json();
        const techUsers = usersData.filter(user => user.role === 'technician');
        setTechnicians(techUsers);
      }

      setLoading(false);
    } catch (err) {
      setError('Connection error');
      setLoading(false);
      console.error('Error:', err);
    }
  };

  const handleOpenDialog = (request = null) => {
    if (request) {
      setEditMode(true);
      setCurrentRequest(request);
      setFormData({
        house: request.house,
        issue_description: request.issue_description,
        category: request.category,
        priority: request.priority,
        status: request.status,
        estimated_cost: request.estimated_cost || ''
      });
    } else {
      setEditMode(false);
      setCurrentRequest(null);
      
      if (userRole === 'tenant') {
        setFormData({
          house: tenantHouse,
          issue_description: '',
          category: 'general',
          priority: 'medium',
          status: 'pending',
          estimated_cost: ''
        });
      } else {
        setFormData({
          house: '',
          issue_description: '',
          category: 'general',
          priority: 'medium',
          status: 'pending',
          estimated_cost: ''
        });
      }
    }
    setSelectedImages([]);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentRequest(null);
    setSelectedImages([]);
  };

  const handleOpenAssignDialog = (request) => {
    setCurrentRequest(request);
    
    // Filter technicians based on the request category
    const compatibleTechs = technicians.filter(tech => 
      tech.specialization === request.category
    );
    setFilteredTechnicians(compatibleTechs);
    
    setSelectedTechnician(request.assigned_to || '');
    setOpenAssignDialog(true);
  };

  const handleCloseAssignDialog = () => {
    setOpenAssignDialog(false);
    setCurrentRequest(null);
    setSelectedTechnician('');
    setFilteredTechnicians([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedImages(files);
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      const submitData = {
        ...formData,
        reported_by: user.id
      };

      if (userRole === 'tenant') {
        submitData.priority = 'medium';
      }

      const url = editMode 
        ? `http://localhost:8000/api/maintenance/${currentRequest.id}/`
        : 'http://localhost:8000/api/maintenance/';
      
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        fetchData();
        handleCloseDialog();
        setSuccess(editMode ? 'Request updated successfully' : 'Request created successfully');
        setError('');
      } else {
        const data = await response.json();
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Failed to save request');
      console.error('Error:', err);
    }
  };

  const handleAssign = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/maintenance/${currentRequest.id}/assign/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ technician_id: selectedTechnician })
      });

      if (response.ok) {
        fetchData();
        handleCloseAssignDialog();
        setSuccess('Technician assigned successfully');
        setError('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to assign technician');
      }
    } catch (err) {
      setError('Failed to assign technician');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this request?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/maintenance/${requestId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchData();
        setSuccess('Request deleted successfully');
        setError('');
      } else {
        setError('Failed to delete request');
      }
    } catch (err) {
      setError('Failed to delete request');
      console.error('Error:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'assigned': return 'info';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
            {userRole === 'tenant' ? 'My Maintenance Requests' : 'Maintenance Requests'}
          </Typography>
          {userRole !== 'technician' && (
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              New Request
            </Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Total Requests: {requests.length}
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
              <TableCell><strong>Request ID</strong></TableCell>
              <TableCell><strong>House</strong></TableCell>
              <TableCell><strong>Category</strong></TableCell>
              <TableCell><strong>Issue</strong></TableCell>
              <TableCell><strong>Priority</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Created</strong></TableCell>
              {userRole !== 'tenant' && <TableCell><strong>Assigned To</strong></TableCell>}
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No maintenance requests found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id} hover>
                  <TableCell>{request.request_id}</TableCell>
                  <TableCell>{request.house_number}</TableCell>
                  <TableCell>
                    {request.category.replace('_', ' ').toUpperCase()}
                  </TableCell>
                  <TableCell>{request.issue_description}</TableCell>
                  <TableCell>
                    <Chip 
                      label={request.priority.toUpperCase()} 
                      color={getPriorityColor(request.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={request.status.replace('_', ' ').toUpperCase()} 
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(request.created_at)}</TableCell>
                  {userRole !== 'tenant' && (
                    <TableCell>
                      {request.assigned_to_name || 'Unassigned'}
                    </TableCell>
                  )}
                  <TableCell>
                    {userRole === 'estate_admin' && (
                      <>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleOpenAssignDialog(request)}
                          title="Assign Technician"
                        >
                          <AssignmentIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDelete(request.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                    
                    {userRole === 'technician' && (
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleOpenDialog(request)}
                        title="Update Priority & Status"
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode 
            ? (userRole === 'technician' ? 'Update Request Details' : 'Edit Maintenance Request')
            : 'New Maintenance Request'
          }
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {userRole === 'estate_admin' && (
              <TextField
                select
                label="House"
                name="house"
                value={formData.house}
                onChange={handleInputChange}
                required
                fullWidth
              >
                {houses.map((house) => (
                  <MenuItem key={house.id} value={house.id}>
                    {house.house_number} - {house.house_type}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {userRole === 'tenant' && (
              <Alert severity="info">
                Request for your house
              </Alert>
            )}

            <TextField
              select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              fullWidth
              disabled={userRole === 'technician' && editMode}
            >
              <MenuItem value="plumbing">Plumbing</MenuItem>
              <MenuItem value="electrical">Electrical</MenuItem>
              <MenuItem value="structural">Structural</MenuItem>
              <MenuItem value="pest_control">Pest Control</MenuItem>
              <MenuItem value="general">General</MenuItem>
            </TextField>

            <TextField
              label="Issue Description"
              name="issue_description"
              value={formData.issue_description}
              onChange={handleInputChange}
              required
              multiline
              rows={3}
              fullWidth
              disabled={userRole === 'technician' && editMode}
            />

            {userRole !== 'tenant' && (
              <TextField
                select
                label="Priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                required
                fullWidth
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </TextField>
            )}

            {userRole !== 'tenant' && (
              <TextField
                select
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                fullWidth
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="assigned">Assigned</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </TextField>
            )}

            {(userRole === 'estate_admin' || userRole === 'technician') && (
              <TextField
                label="Estimated Cost (KSH)"
                name="estimated_cost"
                type="number"
                value={formData.estimated_cost}
                onChange={handleInputChange}
                fullWidth
              />
            )}

            {userRole === 'tenant' && !editMode && (
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<PhotoCamera />}
                  fullWidth
                >
                  Upload Photos (Optional)
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                </Button>
                {selectedImages.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {selectedImages.length} image(s) selected
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Attach photos to help technicians assess the issue
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Update' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Technician Dialog */}
      {userRole === 'estate_admin' && (
        <Dialog open={openAssignDialog} onClose={handleCloseAssignDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Assign Technician</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {filteredTechnicians.length === 0 ? (
                <Alert severity="warning">
                  No technicians available with <strong>{currentRequest?.category}</strong> specialization.
                </Alert>
              ) : (
                <TextField
                  select
                  label="Select Technician"
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  fullWidth
                >
                  {filteredTechnicians.map((tech) => (
                    <MenuItem key={tech.id} value={tech.id}>
                      {tech.first_name} {tech.last_name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAssignDialog}>Cancel</Button>
            <Button 
              onClick={handleAssign} 
              variant="contained" 
              disabled={!selectedTechnician || filteredTechnicians.length === 0}
            >
              Assign
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}

export default MaintenanceRequests;