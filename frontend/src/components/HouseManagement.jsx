import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, Alert, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, IconButton, Tabs, Tab,
  Divider, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HomeWorkIcon from '@mui/icons-material/HomeWork'; // Banner Icon
import BuildIcon from '@mui/icons-material/Build';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded'; // Reserved Icon
import { parseBackendErrors } from '../utils/errorHandler';
import logoImage from '../assets/seamslogo.png';

function HouseManagement() {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0); // 0: All, 1: Vacant, 2: Reserved, 3: Occupied, 4: Under Repair

  // Prevents duplicate API calls by tracking the active submission state
  const [submitLoading, setSubmitLoading] = useState(false);

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentHouse, setCurrentHouse] = useState(null);
  
  const [formData, setFormData] = useState({
    house_number: '',
    house_type: 'bedsitter',
    status: 'vacant',
    location: '',
    rent_amount: '',
    bedrooms: 1,
    bathrooms: 1,
    description: ''
  });

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/houses/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setHouses(data);
      } else {
        setError('Failed to fetch houses');
      }
      setLoading(false);
    } catch (err) {
      setError('Connection error');
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (house = null) => {
    setFieldErrors({}); 
    setError('');
    setSuccess('');

    if (house) {
      setEditMode(true);
      setCurrentHouse(house);
      setFormData({
        house_number: house.house_number,
        house_type: house.house_type,
        status: house.status,
        location: house.location,
        rent_amount: house.rent_amount,
        bedrooms: house.bedrooms,
        bathrooms: house.bathrooms,
        description: house.description || ''
      });
    } else {
      setEditMode(false);
      setCurrentHouse(null);
      setFormData({
        house_number: '',
        house_type: 'bedsitter',
        status: 'vacant',
        location: '',
        rent_amount: '',
        bedrooms: 1,
        bathrooms: 1,
        description: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentHouse(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    setError('');
    setSubmitLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const url = editMode
        ? `http://localhost:8000/api/houses/${currentHouse.id}/`
        : 'http://localhost:8000/api/houses/';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchHouses();
        handleCloseDialog();
        setSuccess(editMode ? 'House updated successfully' : 'House created successfully');
      } else {
        const data = await response.json();
        const { global, fields } = parseBackendErrors(data);
        setError(global || 'Failed to save house. Please check the form.');
        setFieldErrors(fields);
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (houseId) => {
    if (!window.confirm('Are you sure you want to delete this house?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/houses/${houseId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchHouses();
        setSuccess('House deleted successfully');
      } else {
        const data = await response.json();
        const { global } = parseBackendErrors(data);
        setError(global || 'Failed to delete house');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied': return 'error'; // Usually red/error for occupied in admin view
      case 'vacant': return 'success';
      case 'under_repair': return 'warning';
      case 'reserved': return 'info'; // Blue for reserved
      default: return 'default';
    }
  };

  // --- FILTERING LOGIC ---
  const vacantHouses = houses.filter(h => h.status === 'vacant');
  const reservedHouses = houses.filter(h => h.status === 'reserved');
  const occupiedHouses = houses.filter(h => h.status === 'occupied');
  const repairHouses = houses.filter(h => h.status === 'under_repair');

  let displayedHouses = [];
  switch (tabValue) {
      case 0: displayedHouses = houses; break;
      case 1: displayedHouses = vacantHouses; break;
      case 2: displayedHouses = reservedHouses; break;
      case 3: displayedHouses = occupiedHouses; break;
      case 4: displayedHouses = repairHouses; break;
      default: displayedHouses = houses;
  }

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
          <Typography variant="h4" gutterBottom>House Management</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Add House</Button>
        </Box>
        <Paper sx={{ mt: 2, mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="scrollable" scrollButtons="auto">
            <Tab label={`All (${houses.length})`} />
            <Tab icon={<MeetingRoomIcon />} iconPosition="start" label={`Vacant (${vacantHouses.length})`} />
            <Tab icon={<BookmarkAddedIcon />} iconPosition="start" label={`Reserved (${reservedHouses.length})`} />
            <Tab icon={<VpnKeyIcon />} iconPosition="start" label={`Occupied (${occupiedHouses.length})`} />
            <Tab icon={<BuildIcon />} iconPosition="start" label={`Repair (${repairHouses.length})`} />
          </Tabs>
        </Paper>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>House</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Location</strong></TableCell>
              <TableCell><strong>Rent</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Config</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedHouses.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>No houses found in this category</Typography></TableCell></TableRow>
            ) : (
                displayedHouses.map((house) => (
                <TableRow key={house.id} hover>
                    <TableCell fontWeight="bold">{house.house_number}</TableCell>
                    <TableCell>{house.house_type.replace('_', ' ').toUpperCase()}</TableCell>
                    <TableCell>{house.location}</TableCell>
                    <TableCell>{Number(house.rent_amount).toLocaleString()}</TableCell>
                    <TableCell>
                    <Chip 
                        label={house.status.replace('_', ' ').toUpperCase()} 
                        color={getStatusColor(house.status)} 
                        size="small" 
                    />
                    </TableCell>
                    <TableCell>
                        <Typography variant="caption">{house.bedrooms} Bed, {house.bathrooms} Bath</Typography>
                    </TableCell>
                    <TableCell>
                    <IconButton size="small" color="primary" onClick={() => handleOpenDialog(house)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(house.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- MINIMALIST HOUSE FORM --- */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit House' : 'Add New House'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            <Alert severity="info" icon={<HomeWorkIcon />}>
                {editMode ? 'Update property details below' : 'Register a new property unit'}
            </Alert>

            {/* Basic Info */}
            <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mt: 1 }}>PROPERTY DETAILS</Typography>
            
            <TextField 
                label="House Number" 
                name="house_number" 
                value={formData.house_number} 
                onChange={handleInputChange} 
                fullWidth 
                required 
                error={!!fieldErrors.house_number}
                helperText={fieldErrors.house_number}
            />

            <TextField 
                select 
                label="House Type" 
                name="house_type" 
                value={formData.house_type} 
                onChange={handleInputChange} 
                fullWidth 
                required
                error={!!fieldErrors.house_type}
                helperText={fieldErrors.house_type}
            >
                <MenuItem value="bedsitter">Bedsitter</MenuItem>
                <MenuItem value="1_bedroom">1 Bedroom</MenuItem>
                <MenuItem value="2_bedroom">2 Bedroom</MenuItem>
                <MenuItem value="3_bedroom">3 Bedroom</MenuItem>
                <MenuItem value="4_bedroom">4 Bedroom</MenuItem>
            </TextField>

            <TextField 
                label="Location" 
                name="location" 
                value={formData.location} 
                onChange={handleInputChange} 
                fullWidth 
                required 
                error={!!fieldErrors.location}
                helperText={fieldErrors.location}
            />

            {/* Config Row */}
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <TextField label="Bedrooms" name="bedrooms" type="number" value={formData.bedrooms} onChange={handleInputChange} fullWidth required error={!!fieldErrors.bedrooms} helperText={fieldErrors.bedrooms} />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="Bathrooms" name="bathrooms" type="number" value={formData.bathrooms} onChange={handleInputChange} fullWidth required error={!!fieldErrors.bathrooms} helperText={fieldErrors.bathrooms} />
                </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" fontWeight="bold" color="text.secondary">FINANCIAL & STATUS</Typography>

            <TextField 
                label="Rent Amount (KSH)" 
                name="rent_amount" 
                type="number" 
                value={formData.rent_amount} 
                onChange={handleInputChange} 
                fullWidth 
                required 
                error={!!fieldErrors.rent_amount}
                helperText={fieldErrors.rent_amount}
            />

            <TextField 
                select 
                label="Status" 
                name="status" 
                value={formData.status} 
                onChange={handleInputChange} 
                fullWidth
                required
                error={!!fieldErrors.status}
                helperText={fieldErrors.status}
            >
                <MenuItem value="vacant">Vacant</MenuItem>
                <MenuItem value="occupied">Occupied</MenuItem>
                <MenuItem value="reserved">Reserved</MenuItem>
                <MenuItem value="under_repair">Under Repair</MenuItem>
            </TextField>

            <TextField 
                label="Description" 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                multiline 
                rows={3} 
                fullWidth 
                placeholder="Additional notes..."
                error={!!fieldErrors.description}
                helperText={fieldErrors.description}
            />

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitLoading}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitLoading}>
            {submitLoading ? <CircularProgress size={24} color="inherit" /> : (editMode ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default HouseManagement;