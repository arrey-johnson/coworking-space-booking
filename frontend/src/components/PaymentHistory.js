import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Box,
  Chip
} from '@mui/material';
import axios from 'axios';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/payments/history', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPayments(response.data.payments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'succeeded':
        return 'success';
      case 'processing':
        return 'warning';
      case 'requires_payment_method':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (payments.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>No payment history available</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Workspace</TableCell>
              <TableCell>Booking Period</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  {new Date(payment.created * 1000).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {payment.booking?.workspace || 'N/A'}
                </TableCell>
                <TableCell>
                  {payment.booking ? (
                    <>
                      {new Date(payment.booking.startTime).toLocaleDateString()}{' - '}
                      {new Date(payment.booking.endTime).toLocaleDateString()}
                    </>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell align="right">
                  ${payment.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={payment.status}
                    color={getStatusColor(payment.status)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default PaymentHistory;
