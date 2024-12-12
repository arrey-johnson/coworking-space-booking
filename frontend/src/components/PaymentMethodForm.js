import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const PaymentMethodForm = ({ onPaymentMethodSelect }) => {
  const [savedMethods, setSavedMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    fetchSavedPaymentMethods();
  }, []);

  const fetchSavedPaymentMethods = async () => {
    try {
      const response = await axios.get('/api/payments/methods');
      setSavedMethods(response.data);
      if (response.data.length > 0) {
        setSelectedMethod(response.data[0].id);
        onPaymentMethodSelect(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setError('Failed to load saved payment methods');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!stripe || !elements) {
      return;
    }

    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Attach the payment method to the customer
      await axios.post('/api/payments/attach-payment-method', {
        paymentMethodId: paymentMethod.id,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setSuccess('Payment method added successfully');
      fetchSavedPaymentMethods();
      elements.getElement(CardElement).clear();
      
      // Select the newly added payment method
      if (onPaymentMethodSelect) {
        onPaymentMethodSelect(paymentMethod.id);
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
      setError(error.response?.data?.message || error.message || 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = (event) => {
    const methodId = event.target.value;
    setSelectedMethod(methodId);
    onPaymentMethodSelect(methodId);
  };

  const handleDelete = async (methodId) => {
    try {
      await axios.delete(`/api/payments/methods/${methodId}`);
      setSuccess('Payment method removed successfully');
      fetchSavedPaymentMethods();
    } catch (error) {
      console.error('Error removing payment method:', error);
      setError('Failed to remove payment method');
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Payment Method Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select Payment Method
          </Typography>
          <RadioGroup value={selectedMethod} onChange={handleMethodSelect}>
            {/* Cash Payment Option */}
            <FormControlLabel
              value="cash"
              control={<Radio />}
              label="Cash Payment (Pay at Location)"
            />
            
            {/* Divider between cash and card options */}
            {savedMethods.length > 0 && (
              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Or pay with saved card
                </Typography>
              </Box>
            )}

            {/* Saved Cards */}
            {savedMethods.map((method) => (
              <Box
                key={method.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <FormControlLabel
                  value={method.id}
                  control={<Radio />}
                  label={`${method.card.brand.toUpperCase()} •••• ${method.card.last4}`}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleDelete(method.id)}
                >
                  Remove
                </Button>
              </Box>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Add New Card Form */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Add New Card
          </Typography>
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 2 }}>
              <CardElement options={cardElementOptions} />
            </Box>
            <Button
              type="submit"
              variant="contained"
              disabled={!stripe || loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {loading ? 'Adding...' : 'Add Card'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

const PaymentMethodFormWrapper = (props) => (
  <Elements stripe={stripePromise}>
    <PaymentMethodForm {...props} />
  </Elements>
);

export default PaymentMethodFormWrapper;
