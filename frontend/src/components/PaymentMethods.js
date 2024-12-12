import React, { useState, useEffect } from 'react';
import {
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  CircularProgress,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/payments/payment-methods', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPaymentMethods(response.data.paymentMethods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToSetup({
        type: 'card',
        success_url: window.location.href,
        cancel_url: window.location.href,
      });

      if (error) {
        setError(error.message);
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      setError('Failed to add payment method');
    }
  };

  const handleDeletePaymentMethod = async () => {
    try {
      await axios.delete(
        `http://localhost:5000/api/payments/payment-methods/${selectedMethod.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setPaymentMethods(paymentMethods.filter(method => method.id !== selectedMethod.id));
      setOpenDialog(false);
    } catch (error) {
      console.error('Error deleting payment method:', error);
      setError('Failed to delete payment method');
    }
  };

  const formatCardDetails = (card) => {
    return `**** **** **** ${card.last4} | Expires ${card.exp_month}/${card.exp_year}`;
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

  return (
    <>
      <Paper elevation={3}>
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Payment Methods</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CreditCardIcon />}
            onClick={handleAddPaymentMethod}
          >
            Add Payment Method
          </Button>
        </Box>
        <List>
          {paymentMethods.map((method) => (
            <ListItem key={method.id}>
              <ListItemText
                primary={method.card.brand.toUpperCase()}
                secondary={formatCardDetails(method.card)}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => {
                    setSelectedMethod(method);
                    setOpenDialog(true);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
          {paymentMethods.length === 0 && (
            <ListItem>
              <ListItemText
                primary="No payment methods added"
                secondary="Click 'Add Payment Method' to add a new card"
              />
            </ListItem>
          )}
        </List>
      </Paper>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogTitle>Delete Payment Method</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this payment method?
            {selectedMethod && (
              <Box mt={1}>
                {selectedMethod.card.brand.toUpperCase()} ending in {selectedMethod.card.last4}
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeletePaymentMethod}
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaymentMethods;
