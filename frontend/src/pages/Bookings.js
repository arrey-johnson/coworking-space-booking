import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tab,
  Tabs,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
} from '@mui/material';
import BookingForm from '../components/BookingForm';
import axios from 'axios';

const Bookings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/bookings/my-bookings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await axios.post(
        `http://localhost:5000/api/bookings/${bookingId}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      fetchBookings(); // Refresh bookings list
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError('Failed to cancel booking');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const filterBookings = () => {
    const now = new Date();
    switch (tabValue) {
      case 0: // Upcoming
        return bookings.filter(
          booking => new Date(booking.startTime) > now && booking.status !== 'cancelled'
        );
      case 1: // Past
        return bookings.filter(
          booking => new Date(booking.endTime) < now || booking.status === 'cancelled'
        );
      default:
        return bookings;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          My Bookings
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setShowBookingForm(true)}
        >
          New Booking
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Upcoming Bookings" />
        <Tab label="Past Bookings" />
      </Tabs>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Grid container spacing={3}>
        {filterBookings().map((booking) => (
          <Grid item xs={12} md={6} key={booking.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    {booking.workspace.name}
                  </Typography>
                  <Chip
                    label={booking.status}
                    color={getStatusColor(booking.status)}
                  />
                </Box>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Start: {formatDateTime(booking.startTime)}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  End: {formatDateTime(booking.endTime)}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Total Amount: ${booking.totalAmount}
                </Typography>
                {booking.notes && (
                  <Typography variant="body2" color="text.secondary">
                    Notes: {booking.notes}
                  </Typography>
                )}
                {booking.status === 'confirmed' && new Date(booking.startTime) > new Date() && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleCancelBooking(booking.id)}
                    sx={{ mt: 2 }}
                  >
                    Cancel Booking
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={showBookingForm}
        onClose={() => setShowBookingForm(false)}
        maxWidth="md"
        fullWidth
      >
        <BookingForm
          onSuccess={() => {
            setShowBookingForm(false);
            fetchBookings();
          }}
          onCancel={() => setShowBookingForm(false)}
        />
      </Dialog>
    </Container>
  );
};

export default Bookings;
