import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Chip,
  TextField,
  Grid,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, isAfter } from 'date-fns';
import axios from 'axios';

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [openModifyDialog, setOpenModifyDialog] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [modifiedStartTime, setModifiedStartTime] = useState(null);
  const [modifiedEndTime, setModifiedEndTime] = useState(null);
  const [modifiedNotes, setModifiedNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringEndDate, setRecurringEndDate] = useState(null);
  const [recurringDays, setRecurringDays] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get('/api/bookings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
    }
  };

  const handleModifyBooking = async () => {
    try {
      setLoading(true);
      await axios.put(
        `/api/bookings/${selectedBooking.id}`,
        {
          startTime: modifiedStartTime,
          endTime: modifiedEndTime,
          notes: modifiedNotes,
          isRecurring,
          recurringEndDate: isRecurring ? recurringEndDate : null,
          recurringDays: isRecurring ? recurringDays : null,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setSuccess('Booking modified successfully');
      setOpenModifyDialog(false);
      fetchBookings();
    } catch (error) {
      console.error('Error modifying booking:', error);
      setError(error.response?.data?.message || 'Failed to modify booking');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      setLoading(true);
      await axios.post(
        `/api/bookings/${selectedBooking.id}/cancel`,
        { reason: cancelReason },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setSuccess('Booking cancelled successfully');
      setOpenCancelDialog(false);
      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError(error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const openModify = (booking) => {
    setSelectedBooking(booking);
    setModifiedStartTime(new Date(booking.startTime));
    setModifiedEndTime(new Date(booking.endTime));
    setModifiedNotes(booking.notes || '');
    setIsRecurring(booking.isRecurring || false);
    setRecurringEndDate(booking.recurringEndDate ? new Date(booking.recurringEndDate) : null);
    setRecurringDays(booking.recurringDays || []);
    setOpenModifyDialog(true);
  };

  const openCancel = (booking) => {
    setSelectedBooking(booking);
    setOpenCancelDialog(true);
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const canModifyOrCancel = (booking) => {
    // Can only modify/cancel if booking is not cancelled and start time is in the future
    return (
      booking.status !== 'cancelled' &&
      isAfter(new Date(booking.startTime), new Date())
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Booking Management
        </Typography>

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
                <TableCell>ID</TableCell>
                <TableCell>Workspace</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>End Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.id}</TableCell>
                  <TableCell>{booking.workspace.name}</TableCell>
                  <TableCell>
                    {format(new Date(booking.startTime), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(booking.endTime), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.status}
                      size="small"
                      color={getStatusChipColor(booking.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.paymentStatus}
                      size="small"
                      color={booking.paymentStatus === 'paid' ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>
                    {canModifyOrCancel(booking) && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => openModify(booking)}
                          title="Modify Booking"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => openCancel(booking)}
                          title="Cancel Booking"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Modify Booking Dialog */}
        <Dialog
          open={openModifyDialog}
          onClose={() => setOpenModifyDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Modify Booking</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Start Time"
                  value={modifiedStartTime}
                  onChange={setModifiedStartTime}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  minDateTime={new Date()}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="End Time"
                  value={modifiedEndTime}
                  onChange={setModifiedEndTime}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  minDateTime={modifiedStartTime || new Date()}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={4}
                  value={modifiedNotes}
                  onChange={(e) => setModifiedNotes(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                    />
                  }
                  label="Make this a recurring booking"
                />
              </Grid>
              {isRecurring && (
                <>
                  <Grid item xs={12}>
                    <DateTimePicker
                      label="Recurring End Date"
                      value={recurringEndDate}
                      onChange={setRecurringEndDate}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                      minDateTime={addDays(new Date(), 1)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    {/* Add days of week selection for recurring bookings */}
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenModifyDialog(false)}>Cancel</Button>
            <Button
              onClick={handleModifyBooking}
              variant="contained"
              disabled={loading}
            >
              Modify Booking
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cancel Booking Dialog */}
        <Dialog
          open={openCancelDialog}
          onClose={() => setOpenCancelDialog(false)}
        >
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Cancellation Reason"
              fullWidth
              multiline
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCancelDialog(false)}>Keep Booking</Button>
            <Button
              onClick={handleCancelBooking}
              color="error"
              disabled={!cancelReason || loading}
            >
              Cancel Booking
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default BookingManagement;
