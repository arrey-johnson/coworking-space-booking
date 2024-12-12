import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Grid,
  Alert,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

export default function BookingForm() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState({
    startTime: new Date(),
    endTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
    notes: '',
  });

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:5000/api/workspaces/${workspaceId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setWorkspace(response.data);
      } catch (error) {
        console.error('Error fetching workspace:', error);
        setError('Failed to load workspace details');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [workspaceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/bookings',
        {
          workspaceId,
          ...booking,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      navigate('/');
    } catch (error) {
      console.error('Error creating booking:', error);
      setError('Failed to create booking. Please try again.');
    }
  };

  const handleDateChange = (field) => (newValue) => {
    setBooking({
      ...booking,
      [field]: newValue,
    });
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!workspace) {
    return (
      <Alert severity="error">
        Workspace not found. Please try again or contact support.
      </Alert>
    );
  }

  const duration = Math.abs(booking.endTime - booking.startTime) / 36e5; // Convert to hours
  const totalCost = duration * workspace.hourlyRate;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Book {workspace.name}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="body1" gutterBottom>
              Type: {workspace.type}
            </Typography>
            <Typography variant="body1" gutterBottom>
              Capacity: {workspace.capacity} people
            </Typography>
            <Typography variant="body1" gutterBottom>
              Rate: ${workspace.hourlyRate}/hour
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <DateTimePicker
              label="Start Time"
              value={booking.startTime}
              onChange={handleDateChange('startTime')}
              renderInput={(params) => <TextField {...params} fullWidth />}
              minDateTime={new Date()}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <DateTimePicker
              label="End Time"
              value={booking.endTime}
              onChange={handleDateChange('endTime')}
              renderInput={(params) => <TextField {...params} fullWidth />}
              minDateTime={booking.startTime}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={4}
              value={booking.notes}
              onChange={(e) =>
                setBooking({ ...booking, notes: e.target.value })
              }
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Booking Summary
            </Typography>
            <Typography variant="body1" gutterBottom>
              Duration: {duration.toFixed(1)} hours
            </Typography>
            <Typography variant="body1" gutterBottom>
              Total Cost: ${totalCost.toFixed(2)}
            </Typography>
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              onClick={handleSubmit}
            >
              Confirm Booking
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </LocalizationProvider>
  );
}
