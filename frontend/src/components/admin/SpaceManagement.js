import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import api, { getBaseURL } from '../../services/api';

const SpaceManagement = () => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);

  const initialFormState = {
    name: '',
    type: 'desk',
    capacity: 1,
    pricePerHour: 0,
    description: '',
    amenities: '',
    isAvailable: false,
    image: null
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/spaces');
      console.log('Fetched spaces:', response.data);
      setSpaces(response.data);
    } catch (error) {
      console.error('Error fetching spaces:', error);
      setError(error.response?.data?.message || 'Failed to fetch spaces');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setSelectedSpace(null);
    setFormData({
      name: '',
      type: 'desk',
      capacity: 1,
      pricePerHour: 0,
      description: '',
      amenities: '',
      isAvailable: false,
      image: null
    });
    setDialogOpen(true);
  };

  const handleEditClick = (space) => {
    setSelectedSpace(space);
    setFormData({
      name: space.name || '',
      type: space.type || 'desk',
      capacity: space.capacity || 1,
      pricePerHour: space.pricePerHour || 0,
      description: space.description || '',
      amenities: space.amenities ? space.amenities.map(a => a.name).join(', ') : '',
      isAvailable: space.isAvailable || false,
      image: null
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = async (spaceId) => {
    if (window.confirm('Are you sure you want to delete this space?')) {
      try {
        await api.delete(`/api/admin/spaces/${spaceId}`);
        fetchSpaces();
      } catch (error) {
        console.error('Error deleting space:', error);
        setError(error.response?.data?.message || 'Failed to delete space');
      }
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async () => {
    try {
      const formDataToSend = new FormData();
      
      // Convert values to appropriate types
      const dataToSend = {
        ...formData,
        capacity: parseInt(formData.capacity),
        pricePerHour: parseFloat(formData.pricePerHour),
        isAvailable: Boolean(formData.isAvailable)
      };

      console.log('Submitting data:', dataToSend);

      // Append all form data
      Object.keys(dataToSend).forEach(key => {
        if (key === 'image' && dataToSend[key] instanceof File) {
          formDataToSend.append('image', dataToSend[key]);
        } else if (key === 'isAvailable') {
          formDataToSend.append('isAvailable', String(dataToSend[key]));
        } else {
          formDataToSend.append(key, dataToSend[key]);
        }
      });

      if (selectedSpace) {
        await api.put(`/api/admin/spaces/${selectedSpace.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await api.post('/api/admin/spaces', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setDialogOpen(false);
      fetchSpaces();
    } catch (error) {
      console.error('Error saving space:', error);
      setError(error.response?.data?.message || 'Failed to save space');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    // If the URL is already absolute, return it as is
    if (imageUrl.startsWith('http')) return imageUrl;
    // Otherwise, prepend the base URL
    return `${getBaseURL()}${imageUrl}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Space Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          Add Space
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {spaces.map((space) => (
          <Grid item xs={12} sm={6} md={4} key={space.id}>
            <Card>
              <CardContent>
                <Box 
                  sx={{ 
                    height: 200, 
                    mb: 2, 
                    backgroundColor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {space.imageUrl ? (
                    <img
                      src={getImageUrl(space.imageUrl)}
                      alt={space.name}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                      onError={(e) => {
                        console.error('Error loading image:', space.imageUrl);
                        e.target.src = ''; // Clear the src to show the fallback icon
                        e.target.style.display = 'none';
                        // Show the ImageIcon instead
                        const iconEl = e.target.parentElement.querySelector('svg');
                        if (iconEl) iconEl.style.display = 'block';
                      }}
                    />
                  ) : (
                    <ImageIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                  )}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {space.name}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  Type: {space.type.charAt(0).toUpperCase() + space.type.slice(1)}
                </Typography>
                <Typography gutterBottom>
                  Capacity: {space.capacity} {space.capacity > 1 ? 'people' : 'person'}
                </Typography>
                <Typography gutterBottom>
                  Price: {formatCurrency(space.pricePerHour)}/hour
                </Typography>
                <Typography 
                  color={Boolean(space.isAvailable) ? 'success.main' : 'error.main'}
                  sx={{ fontWeight: 'bold' }}
                >
                  {Boolean(space.isAvailable) ? 'Available' : 'Not Available'}
                </Typography>
              </CardContent>
              <CardActions>
                <IconButton onClick={() => handleEditClick(space)} color="primary">
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDeleteClick(space.id)} color="error">
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedSpace ? 'Edit Space' : 'Add New Space'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                name="type"
                value={formData.type}
                label="Type"
                onChange={handleChange}
              >
                <MenuItem value="desk">Desk</MenuItem>
                <MenuItem value="office">Private Office</MenuItem>
                <MenuItem value="meeting">Meeting Room</MenuItem>
                <MenuItem value="conference">Conference Room</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Capacity"
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
            />
            <TextField
              fullWidth
              label="Price per Hour"
              type="number"
              name="pricePerHour"
              value={formData.pricePerHour}
              onChange={handleChange}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
            <TextField
              fullWidth
              label="Amenities"
              multiline
              rows={2}
              name="amenities"
              value={formData.amenities}
              onChange={handleChange}
              helperText="Enter amenities separated by commas"
            />
            <FormControlLabel
              control={
                <Switch
                  name="isAvailable"
                  checked={Boolean(formData.isAvailable)}
                  onChange={handleChange}
                />
              }
              label="Available"
            />
            <Button
              variant="outlined"
              component="label"
              startIcon={<ImageIcon />}
            >
              Upload Image
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageChange}
              />
            </Button>
            {formData.image && (
              <Typography variant="body2" color="textSecondary">
                Image selected: {formData.image instanceof File ? formData.image.name : 'Current image'}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SpaceManagement;
