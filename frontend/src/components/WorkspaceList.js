import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const WorkspaceList = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/workspaces');
      setWorkspaces(response.data);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setError(error.response?.data?.message || 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (workspace) => {
    setSelectedWorkspace(workspace);
    setBookingDialogOpen(true);
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData(event.currentTarget);
      const bookingData = {
        workspaceId: selectedWorkspace.id,
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime')
      };

      await api.post('/api/bookings', bookingData);
      setBookingDialogOpen(false);
      navigate('/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      setError(error.response?.data?.message || 'Failed to create booking');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Available Workspaces
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {workspaces.map((workspace) => (
          <Grid item xs={12} sm={6} md={4} key={workspace.id}>
            <Card>
              <CardMedia
                component="img"
                height="200"
                image={workspace.imageUrl || '/workspace-placeholder.jpg'}
                alt={workspace.name}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {workspace.name}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  Type: {workspace.type.charAt(0).toUpperCase() + workspace.type.slice(1)}
                </Typography>
                <Typography gutterBottom>
                  Capacity: {workspace.capacity} {workspace.capacity > 1 ? 'people' : 'person'}
                </Typography>
                <Typography gutterBottom>
                  Price: {formatCurrency(workspace.pricePerHour)}/hour
                </Typography>
                <Box mt={1} mb={2}>
                  {workspace.amenities?.split(',').map((amenity, index) => (
                    <Chip
                      key={index}
                      label={amenity.trim()}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => handleBookClick(workspace)}
                  disabled={!workspace.isAvailable}
                >
                  {workspace.isAvailable ? 'Book Now' : 'Not Available'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={bookingDialogOpen} onClose={() => setBookingDialogOpen(false)}>
        <form onSubmit={handleBookingSubmit}>
          <DialogTitle>Book Workspace</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography gutterBottom>
                {selectedWorkspace?.name}
              </Typography>
              <TextField
                name="startTime"
                label="Start Time"
                type="datetime-local"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              <TextField
                name="endTime"
                label="End Time"
                type="datetime-local"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBookingDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Book
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default WorkspaceList;
