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
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/api';

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [openRefundDialog, setOpenRefundDialog] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/payments');
      setPayments(response.data.payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError(error.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (paymentId) => {
    try {
      setError('');
      await api.post(`/api/admin/payments/${paymentId}/mark-paid`);
      setSuccess('Payment marked as paid successfully');
      fetchPayments();
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      setError(error.response?.data?.message || 'Failed to mark payment as paid');
    }
  };

  const handleRefund = async (paymentId) => {
    try {
      setLoading(true);
      setError('');
      await api.post(`/api/admin/payments/${paymentId}/refund`, {
        reason: refundReason
      });
      setSuccess('Refund processed successfully');
      setOpenRefundDialog(false);
      fetchPayments();
    } catch (error) {
      console.error('Error processing refund:', error);
      setError(error.response?.data?.message || 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setOpenDialog(true);
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'succeeded':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Payment Management
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
              <TableCell>Date</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Loading payments...
                </TableCell>
              </TableRow>
            ) : payments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              payments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.id}</TableCell>
                  <TableCell>
                    {format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{payment.user?.email}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <Chip
                      label={payment.paymentMethod}
                      size="small"
                      color={payment.paymentMethod === 'cash' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.status}
                      size="small"
                      color={getStatusChipColor(payment.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(payment)}
                      title="View Details"
                    >
                      <ReceiptIcon />
                    </IconButton>
                    {payment.status === 'pending' && payment.paymentMethod === 'cash' && (
                      <IconButton
                        size="small"
                        onClick={() => handleMarkAsPaid(payment.id)}
                        title="Mark as Paid"
                        color="success"
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    )}
                    {payment.status === 'succeeded' && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setOpenRefundDialog(true);
                        }}
                        title="Refund"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Payment Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Payment ID</Typography>
                <Typography>{selectedPayment.id}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Date</Typography>
                <Typography>
                  {format(new Date(selectedPayment.createdAt), 'MMM dd, yyyy HH:mm')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Customer</Typography>
                <Typography>{selectedPayment.user?.email}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Amount</Typography>
                <Typography>{formatCurrency(selectedPayment.amount)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Payment Method</Typography>
                <Typography>{selectedPayment.paymentMethod}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Status</Typography>
                <Chip
                  label={selectedPayment.status}
                  size="small"
                  color={getStatusChipColor(selectedPayment.status)}
                />
              </Grid>
              {selectedPayment.refundReason && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Refund Reason</Typography>
                  <Typography>{selectedPayment.refundReason}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={openRefundDialog} onClose={() => setOpenRefundDialog(false)}>
        <DialogTitle>Process Refund</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Refund Reason"
            fullWidth
            multiline
            rows={4}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRefundDialog(false)}>Cancel</Button>
          <Button
            onClick={() => handleRefund(selectedPayment?.id)}
            color="error"
            disabled={!refundReason || loading}
          >
            Process Refund
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentManagement;
