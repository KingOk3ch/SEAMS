import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, Alert, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, IconButton, Tabs, Tab,
  ImageList, ImageListItem, Badge, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloseIcon from '@mui/icons-material/Close';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import { parseBackendErrors } from '../utils/errorHandler';
import logoImage from '../assets/seamslogo.png';

function MaintenanceRequests() {
  // --- 1. USER ROLE & ID EXTRACTION ---
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (user.role || '').toLowerCase().trim();
  const userId = String(user.id || '');

  const isTenant = userRole === 'tenant';
  const isTechnician = userRole === 'technician';
  const isAdmin = userRole === 'estate_admin' || userRole === 'manager';

  // --- STATE ---
  const [requests, setRequests] = useState([]);
  const [houses, setHouses] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  // Controls the loading spinner during maintenance request submission to prevent duplicates
  const [submitLoading, setSubmitLoading] = useState(false);
  // Controls the loading spinner during technician assignment to ensure data consistency
  const [assignLoading, setAssignLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  const [fieldErrors, setFieldErrors] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openImageDialog, setOpenImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);

  // Form Data
  const [formData, setFormData] = useState({
    house: '', issue_description: '', category: 'plumbing', priority: 'medium',
    status: 'new', estimated_cost: '', technician: '',
  });

  const [assignData, setAssignData] = useState({
    technician: '', status: '', priority: '', estimated_cost: '', category: ''
  });

  // --- HELPER: Safe ID Extraction ---
  const getId = (field) => {
    if (!field) return '';
    return typeof field === 'object' ? String(field.id) : String(field);
  };

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [requestsRes, housesRes, tenantsRes, usersRes] = await Promise.all([
        fetch('http://localhost:8000/api/maintenance/', { headers }),
        fetch('http://localhost:8000/api/houses/', { headers }),
        fetch('http://localhost:8000/api/tenants/', { headers }),
        fetch('http://localhost:8000/api/users/', { headers })
      ]);

      let requestsData = await requestsRes.json();
      const housesData = await housesRes.json();
      const tenantsData = await tenantsRes.json();
      const usersData = await usersRes.json();

      if (requestsData.results) requestsData = requestsData.results;

      // --- FILTERING LOGIC ---
      if (isTenant) {
        requestsData = requestsData.filter(r => getId(r.reported_by) === userId);
      }
      
      if (isTechnician) {
        // Strict filter: Only show requests assigned to this user
        requestsData = requestsData.filter(r => getId(r.assigned_to) === userId);
      }

      const technicianUsers = usersData.filter(u => (u.role || '').toLowerCase() === 'technician');

      // Sorting: New/Assigned first
      const statusOrder = { 'new': 1, 'assigned': 2, 'pending': 3, 'in_progress': 4, 'completed': 5, 'cancelled': 6 };
      requestsData.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

      setRequests(requestsData);
      setHouses(housesData);
      setTenants(tenantsData);
      setTechnicians(technicianUsers);
      setLoading(false);
    } catch (err) {
      setError('Connection error');
      setLoading(false);
    }
  }, [isTenant, isTechnician, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- HANDLERS ---
  const handleOpenDialog = (request = null) => {
    if (isTechnician) return; // Techs blocked
    setFieldErrors({}); setError(''); setSuccess(''); setSelectedImages([]);
    
    if (request) {
      setEditMode(true);
      setCurrentRequest(request);
      setFormData({
        house: getId(request.house),
        issue_description: request.issue_description,
        category: request.category,
        priority: request.priority,
        status: request.status,
        estimated_cost: request.estimated_cost || '',
        technician: getId(request.assigned_to), 
      });
    } else {
      setEditMode(false);
      setCurrentRequest(null);
      let defaultHouse = '';
      if (isTenant) {
        const myTenant = tenants.find(t => getId(t.user) === userId);
        if (myTenant) defaultHouse = myTenant.house;
      }
      setFormData({
        house: defaultHouse, issue_description: '', category: 'plumbing', 
        priority: 'medium', status: 'new', estimated_cost: '', technician: '',
      });
    }
    setOpenDialog(true);
  };

  const handleOpenAssignDialog = (request) => {
    setCurrentRequest(request);
    setAssignData({
      technician: getId(request.assigned_to),
      status: request.status,
      priority: request.priority,      
      estimated_cost: request.estimated_cost || '', 
      category: request.category
    });
    setOpenAssignDialog(true);
  };

  const handleCloseDialog = () => { setOpenDialog(false); setEditMode(false); setCurrentRequest(null); setSelectedImages([]); setSubmitLoading(false); };
  const handleCloseAssignDialog = () => { setOpenAssignDialog(false); setCurrentRequest(null); };

  const handleAssignSubmit = async () => {
    setAssignLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const url = `http://localhost:8000/api/maintenance/${currentRequest.id}/`;
      
      const payload = {
        status: assignData.status,
        priority: assignData.priority,
        estimated_cost: assignData.estimated_cost
      };
      if (isAdmin) payload.assigned_to = assignData.technician;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchData(); handleCloseAssignDialog(); setSuccess('Updated successfully');
      } else {
        const data = await response.json(); setError(data.detail || 'Update failed');
      }
    } catch (err) { setError('Network error'); } finally { setAssignLoading(false); }
  };

  const handleSubmit = async () => {
    setFieldErrors({}); setError('');
    setSubmitLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const submitData = { ...formData, assigned_to: formData.technician, reported_by: isTenant ? userId : undefined };
      if (isTenant && !submitData.house) delete submitData.house;

      const formDataToSend = new FormData();
      Object.keys(submitData).forEach(key => {
        if (submitData[key] !== '' && submitData[key] !== null && key !== 'image') formDataToSend.append(key, submitData[key]);
      });
      selectedImages.forEach(image => formDataToSend.append('uploaded_images', image));

      const url = editMode ? `http://localhost:8000/api/maintenance/${currentRequest.id}/` : 'http://localhost:8000/api/maintenance/';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method, headers: { 'Authorization': `Bearer ${token}` }, body: formDataToSend
      });

      if (response.ok) {
        fetchData(); handleCloseDialog(); setSuccess(editMode ? 'Updated' : 'Created');
      } else {
        const data = await response.json();
        const { global, fields } = parseBackendErrors(data);
        setError(global || 'Failed'); setFieldErrors(fields);
      }
    } catch (err) { setError('Network error'); } finally { setSubmitLoading(false); }
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm('Delete?')) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/maintenance/${requestId}/`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) { fetchData(); setSuccess('Deleted'); } else { setError('Failed to delete'); }
    } catch (err) { setError('Network error'); }
  };

  const handleImageSelect = (e) => setSelectedImages(prev => [...prev, ...Array.from(e.target.files)]);
  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' })); };
  const handleViewImage = (url) => { setSelectedImage(url.startsWith('http') ? url : `http://localhost:8000${url}`); setOpenImageDialog(true); };
  const getCompatibleTechnicians = (cat) => technicians.filter(t => (t.specialization || 'general') === (cat || 'general') || t.specialization === 'general');

  // UI Helpers
  const getStatusColor = (s) => ({ new: 'error', pending: 'warning', assigned: 'info', in_progress: 'primary', completed: 'success' }[s] || 'default');
  const getPriorityColor = (p) => ({ low: 'success', medium: 'warning', high: 'error' }[p] || 'default');

  // --- TAB FILTERING LOGIC ---
  const newRequests = requests.filter(r => r.status === 'new'); 
  const assignedRequests = requests.filter(r => r.status === 'assigned'); 
  const activeRequests = requests.filter(r => ['pending', 'assigned', 'in_progress'].includes(r.status));
  const completedRequests = requests.filter(r => r.status === 'completed');

  // Decide what to show in the "Inbox" tab (Tab Index 1)
  let inboxList = [];
  if (isTechnician) {
      inboxList = assignedRequests; // Fix: Technicians see 'assigned' items here
  } else {
      inboxList = newRequests; // Admins see 'new' items here
  }

  // Badge Logic
  const badgeCount = inboxList.length;

  const displayedRequests = 
      tabValue === 0 ? requests : 
      tabValue === 1 ? inboxList : 
      tabValue === 2 ? activeRequests : 
      completedRequests;

  // Displays a custom animated logo to reinforce branding during initial data fetch
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Box
          component="img"
          src={logoImage}
          alt="Loading SEAMS..."
          sx={{
            width: 150,
            animation: 'pulse 1.5s infinite ease-in-out',
            '@keyframes pulse': {
              '0%': { transform: 'scale(0.95)', opacity: 0.7 },
              '50%': { transform: 'scale(1.05)', opacity: 1 },
              '100%': { transform: 'scale(0.95)', opacity: 0.7 },
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" fontWeight="bold" gutterBottom>{isTenant ? 'My Maintenance' : 'Maintenance Requests'}</Typography>
          {(isTenant || isAdmin) && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>New Request</Button>}
        </Box>
        <Paper sx={{ mt: 2, mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} indicatorColor="primary" textColor="primary">
            <Tab label="All" />
            <Tab label={<Box sx={{ display: 'flex', gap: 1 }}>{isTechnician ? 'Assignments' : 'New'} {badgeCount > 0 && <Badge badgeContent={badgeCount} color="error" />}</Box>} />
            <Tab label="Active" />
            <Tab label="Completed" />
          </Tabs>
        </Paper>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f9fafb' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>House</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Issue</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tech</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Img</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedRequests.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>No requests found</TableCell></TableRow>
            ) : (
              displayedRequests.map((req) => (
                <TableRow key={req.id} hover>
                  <TableCell>{req.house?.house_number || req.house_number || 'N/A'}</TableCell>
                  <TableCell>{req.issue_description.substring(0, 30)}...</TableCell>
                  <TableCell><Chip label={req.category.toUpperCase()} size="small" variant="outlined" /></TableCell>
                  <TableCell><Chip label={req.priority.toUpperCase()} color={getPriorityColor(req.priority)} size="small" /></TableCell>
                  <TableCell><Chip label={req.status.replace('_',' ').toUpperCase()} color={getStatusColor(req.status)} size="small" /></TableCell>
                  <TableCell>{req.assigned_to_name || 'Unassigned'}</TableCell>
                  <TableCell>{req.images?.length > 0 ? <IconButton size="small" color="primary" onClick={() => handleViewImage(req.images[0].image)}><ImageIcon /></IconButton> : '-'}</TableCell>
                  <TableCell>
                    <Box display="flex">
                      {(isAdmin || isTechnician) && (
                        <IconButton size="small" color="secondary" onClick={() => handleOpenAssignDialog(req)} title="Update Job">
                          <AssignmentIcon />
                        </IconButton>
                      )}
                      {!isTechnician && (
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(req)}><EditIcon /></IconButton>
                      )}
                      {isAdmin && <IconButton size="small" color="error" onClick={() => handleDelete(req.id)}><DeleteIcon /></IconButton>}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- PRETTIER MAIN FORM (VERTICAL RECTANGLE) --- */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Request' : 'New Request'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" icon={<BuildCircleIcon />}>
                {editMode ? 'Update request details below' : 'Report a new maintenance issue'}
            </Alert>

            <TextField select label="House" name="house" value={formData.house} onChange={handleInputChange} fullWidth required disabled={isTenant} error={!!fieldErrors.house} helperText={fieldErrors.house}>
                {houses.map(h => <MenuItem key={h.id} value={h.id}>{h.house_number}</MenuItem>)}
            </TextField>
            
            <TextField select label="Category" name="category" value={formData.category} onChange={handleInputChange} fullWidth required>
                {['plumbing','electrical','structural','pest_control','general'].map(c => <MenuItem key={c} value={c}>{c.toUpperCase()}</MenuItem>)}
            </TextField>
            
            <TextField label="Description" name="issue_description" value={formData.issue_description} onChange={handleInputChange} multiline rows={4} fullWidth placeholder="Describe the problem..." />

            {!isTenant && (
                <>
                    <Divider>Admin Options</Divider>
                    <TextField select label="Priority" name="priority" value={formData.priority} onChange={handleInputChange} fullWidth>
                        <MenuItem value="low">Low</MenuItem><MenuItem value="medium">Medium</MenuItem><MenuItem value="high">High</MenuItem>
                    </TextField>
                    <TextField select label="Status" name="status" value={formData.status} onChange={handleInputChange} fullWidth>
                        {['new','pending','assigned','in_progress','completed'].map(s => <MenuItem key={s} value={s}>{s.replace('_',' ').toUpperCase()}</MenuItem>)}
                    </TextField>
                </>
            )}

            {isAdmin && (
                <>
                    <TextField select label="Assign Technician" name="technician" value={formData.technician} onChange={handleInputChange} fullWidth>
                        <MenuItem value="">Unassigned</MenuItem>
                        {getCompatibleTechnicians(formData.category).map(t => <MenuItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</MenuItem>)}
                    </TextField>
                    <TextField label="Estimated Cost (KES)" name="estimated_cost" type="number" value={formData.estimated_cost} onChange={handleInputChange} fullWidth />
                </>
            )}

            <Button variant="outlined" component="label" fullWidth startIcon={<PhotoCamera />}>
                {selectedImages.length > 0 ? `Add More (${selectedImages.length})` : 'Upload Images'}
                <input type="file" hidden multiple accept="image/*" onChange={handleImageSelect} />
            </Button>

            {((editMode && currentRequest?.images?.length > 0) || selectedImages.length > 0) && (
                <Box>
                    <Typography variant="caption" color="text.secondary">Attached Images:</Typography>
                    <ImageList sx={{ width: '100%', maxHeight: 120 }} cols={4} rowHeight={80}>
                        {currentRequest?.images?.map((img) => (
                            <ImageListItem key={img.id} sx={{ cursor: 'pointer' }} onClick={() => handleViewImage(img.image)}>
                                <img src={`http://localhost:8000${img.image}`} alt="Evidence" style={{ height: '80px', objectFit: 'cover', borderRadius: 4 }} />
                            </ImageListItem>
                        ))}
                        {selectedImages.map((file, index) => (
                            <ImageListItem key={index}>
                                <img src={URL.createObjectURL(file)} alt="New" style={{ height: '80px', objectFit: 'cover', borderRadius: 4, opacity: 0.7 }} />
                            </ImageListItem>
                        ))}
                    </ImageList>
                </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseDialog} disabled={submitLoading}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={submitLoading}>{submitLoading ? <CircularProgress size={24} color="inherit" /> : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* --- CLIPBOARD DIALOG (Technician / Admin Update) --- */}
      <Dialog open={openAssignDialog} onClose={handleCloseAssignDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Update Job Status</DialogTitle>
        <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" icon={<AssignmentIcon />}>
                    Update Status, Cost & Priority
                </Alert>
                
                {isAdmin && (
                    <TextField select label="Technician" value={assignData.technician} onChange={(e) => setAssignData({...assignData, technician: e.target.value})} fullWidth>
                        <MenuItem value="">Unassigned</MenuItem>
                        {getCompatibleTechnicians(assignData.category).length === 0 ? <MenuItem disabled>No Techs</MenuItem> : 
                         getCompatibleTechnicians(assignData.category).map(t => <MenuItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</MenuItem>)}
                    </TextField>
                )}

                <TextField label="Estimated Cost (KES)" type="number" value={assignData.estimated_cost} onChange={(e) => setAssignData({...assignData, estimated_cost: e.target.value})} fullWidth />
                <TextField select label="Priority" value={assignData.priority} onChange={(e) => setAssignData({...assignData, priority: e.target.value})} fullWidth>
                    <MenuItem value="low">Low</MenuItem><MenuItem value="medium">Medium</MenuItem><MenuItem value="high">High</MenuItem>
                </TextField>
                <TextField select label="Status" value={assignData.status} onChange={(e) => setAssignData({...assignData, status: e.target.value})} fullWidth>
                    {['new','pending','assigned','in_progress','completed'].map(s => <MenuItem key={s} value={s}>{s.replace('_',' ').toUpperCase()}</MenuItem>)}
                </TextField>
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseAssignDialog} disabled={assignLoading}>Cancel</Button>
            <Button onClick={handleAssignSubmit} variant="contained" color="primary" disabled={assignLoading}>{assignLoading ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}</Button>
        </DialogActions>
      </Dialog>

      {/* --- SIMPLE IMAGE VIEWER --- */}
      <Dialog open={openImageDialog} onClose={() => setOpenImageDialog(false)} maxWidth="md">
        <Box position="relative">
            <IconButton onClick={() => setOpenImageDialog(false)} sx={{ position: 'absolute', right: 5, top: 5, bgcolor: 'rgba(255,255,255,0.7)' }}>
                <CloseIcon />
            </IconButton>
            <img src={selectedImage} alt="Full View" style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block' }} />
        </Box>
      </Dialog>

    </Container>
  );
}

export default MaintenanceRequests;