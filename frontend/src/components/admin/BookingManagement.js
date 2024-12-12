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
  TablePagination,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import api from '../../services/api';

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/bookings');
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError(error.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      setError('');
      await api.put(`/api/admin/bookings/${bookingId}/status`, { status: newStatus });
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      setError(error.response?.data?.message || 'Failed to update booking status');
    }
  };

  const handleEditClick = (booking) => {
    setSelectedBooking(booking);
    setEditDialogOpen(true);
  };

  const handleCancelClick = (booking) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      setError('');
      await api.put(`/api/admin/bookings/${selectedBooking.id}`, selectedBooking);
      setEditDialogOpen(false);
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      setError(error.response?.data?.message || 'Failed to update booking');
    }
  };

  const handleCancelConfirm = async () => {
    try {
      await handleStatusChange(selectedBooking.id, 'cancelled');
      setCancelDialogOpen(false);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError(error.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Booking Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Workspace</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>End Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.id}</TableCell>
                  <TableCell>{booking.user?.username}</TableCell>
                  <TableCell>{booking.workspace?.name}</TableCell>
                  <TableCell>
                    {new Date(booking.startTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {new Date(booking.endTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.status}
                      color={getStatusColor(booking.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEditClick(booking)}
                      color="primary"
                      disabled={booking.status === 'cancelled'}
                    >
                      <EditIcon />
                    </IconButton>
                    {booking.status === 'active' && (
                      <IconButton
                        onClick={() => handleCancelClick(booking)}
                        color="error"
                      >
                        <CancelIcon />
                      </IconButton>
                    )}
                    {booking.status === 'pending' && (
                      <IconButton
                        onClick={() => handleStatusChange(booking.id, 'active')}
                        color="success"
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={bookings.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Booking</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Start Time"
              type="datetime-local"
              value={selectedBooking?.startTime?.slice(0, 16) || ''}
              onChange={(e) =>
                setSelectedBooking((prev) => ({
                  ...prev,
                  startTime: e.target.value
                }))
              }
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="End Time"
              type="datetime-local"
              value={selectedBooking?.endTime?.slice(0, 16) || ''}
              onChange={(e) =>
                setSelectedBooking((prev) => ({
                  ...prev,
                  endTime: e.target.value
                }))
              }
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this booking? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>No</Button>
          <Button onClick={handleCancelConfirm} color="error">
            Yes, Cancel Booking
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingManagement;
