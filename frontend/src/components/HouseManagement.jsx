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
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function HouseManagement() {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      console.error('Error:', err);
    }
  };

  const handleOpenDialog = (house = null) => {
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
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
        setError('');
      } else {
        const data = await response.json();
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Failed to save house');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (houseId) => {
    if (!window.confirm('Are you sure you want to delete this house?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/houses/${houseId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchHouses();
        setError('');
      } else {
        setError('Failed to delete house');
      }
    } catch (err) {
      setError('Failed to delete house');
      console.error('Error:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied': return 'success';
      case 'vacant': return 'primary';
      case 'under_repair': return 'warning';
      case 'reserved': return 'info';
      default: return 'default';
    }
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
            House Management
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add House
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Total Houses: {houses.length}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>House Number</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Location</strong></TableCell>
              <TableCell><strong>Bedrooms</strong></TableCell>
              <TableCell><strong>Bathrooms</strong></TableCell>
              <TableCell><strong>Rent (KSH)</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {houses.map((house) => (
              <TableRow key={house.id} hover>
                <TableCell>{house.house_number}</TableCell>
                <TableCell>{house.house_type.replace('_', ' ').toUpperCase()}</TableCell>
                <TableCell>{house.location}</TableCell>
                <TableCell>{house.bedrooms}</TableCell>
                <TableCell>{house.bathrooms}</TableCell>
                <TableCell>{house.rent_amount.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    label={house.status.replace('_', ' ').toUpperCase()} 
                    color={getStatusColor(house.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleOpenDialog(house)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDelete(house.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit House' : 'Add New House'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="House Number"
              name="house_number"
              value={formData.house_number}
              onChange={handleInputChange}
              required
              fullWidth
            />
            
            <TextField
              select
              label="House Type"
              name="house_type"
              value={formData.house_type}
              onChange={handleInputChange}
              required
              fullWidth
            >
              <MenuItem value="bedsitter">Bedsitter</MenuItem>
              <MenuItem value="1_bedroom">1 Bedroom</MenuItem>
              <MenuItem value="2_bedroom">2 Bedroom</MenuItem>
              <MenuItem value="3_bedroom">3 Bedroom</MenuItem>
              <MenuItem value="4_bedroom">4 Bedroom</MenuItem>
            </TextField>

            <TextField
              select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              fullWidth
            >
              <MenuItem value="vacant">Vacant</MenuItem>
              <MenuItem value="occupied">Occupied</MenuItem>
              <MenuItem value="under_repair">Under Repair</MenuItem>
              <MenuItem value="reserved">Reserved</MenuItem>
            </TextField>

            <TextField
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
              fullWidth
            />

            <TextField
              label="Rent Amount (KSH)"
              name="rent_amount"
              type="number"
              value={formData.rent_amount}
              onChange={handleInputChange}
              required
              fullWidth
            />

            <TextField
              label="Bedrooms"
              name="bedrooms"
              type="number"
              value={formData.bedrooms}
              onChange={handleInputChange}
              required
              fullWidth
            />

            <TextField
              label="Bathrooms"
              name="bathrooms"
              type="number"
              value={formData.bathrooms}
              onChange={handleInputChange}
              required
              fullWidth
            />

            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default HouseManagement;