import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  MenuItem,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentMethodForm from './PaymentMethodForm';
import axios from 'axios';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const steps = ['Select Workspace', 'Choose Date & Time', 'Payment'];

const BookingForm = ({ onSuccess, onCancel }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [showAddCard, setShowAddCard] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    calculateTotalAmount();
  }, [selectedWorkspace, startTime, endTime]);

  const fetchWorkspaces = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/workspaces', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setWorkspaces(response.data);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setError('Error loading workspaces');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/payments/payment-methods', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPaymentMethods(response.data.paymentMethods);
      if (response.data.paymentMethods.length > 0) {
        setSelectedPaymentMethod(response.data.paymentMethods[0].id);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setError('Error loading payment methods');
    }
  };

  const calculateTotalAmount = () => {
    if (selectedWorkspace && startTime && endTime) {
      const workspace = workspaces.find(w => w.id === selectedWorkspace);
      if (workspace) {
        const duration = (endTime - startTime) / (1000 * 60 * 60); // in hours
        const amount = duration * workspace.pricePerHour;
        setTotalAmount(amount > 0 ? amount : 0);
      }
    }
  };

  const handleNext = async () => {
    if (activeStep === 0 && !selectedWorkspace) {
      setError('Please select a workspace');
      return;
    }
    if (activeStep === 1 && (!startTime || !endTime)) {
      setError('Please select start and end times');
      return;
    }
    if (activeStep === 1) {
      // Create booking without processing payment
      try {
        const response = await axios.post(
          'http://localhost:5000/api/bookings/create',
          {
            workspaceId: selectedWorkspace,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            notes,
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        setBookingDetails(response.data.booking);
      } catch (error) {
        console.error('Error creating booking:', error);
        setError(error.response?.data?.message || 'Error creating booking');
        return;
      }
    }
    setError('');
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handlePayment = async () => {
    setProcessingPayment(true);
    setError('');

    try {
      if (selectedPaymentMethod === 'cash') {
        // For cash payments, just create the booking with pending payment status
        const response = await axios.post(
          'http://localhost:5000/api/bookings/create',
          {
            workspaceId: selectedWorkspace,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            notes,
            paymentMethod: 'cash',
            paymentStatus: 'pending'
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        
        onSuccess && onSuccess(response.data.booking);
      } else {
        // Handle card payments
        const paymentIntentResponse = await axios.post(
          'http://localhost:5000/api/payments/create-payment-intent',
          {
            bookingId: bookingDetails.id
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );

        const { clientSecret, customerId } = paymentIntentResponse.data;

        // Update payment intent with selected payment method
        await axios.post(
          'http://localhost:5000/api/payments/update-payment-intent',
          {
            paymentIntentId: clientSecret.split('_secret_')[0],
            paymentMethodId: selectedPaymentMethod
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );

        // Confirm the payment
        const stripe = await stripePromise;
        const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: selectedPaymentMethod
        });

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        onSuccess && onSuccess(bookingDetails);
      }
    } catch (error) {
      console.error('Error processing booking:', error);
      setError(error.response?.data?.message || error.message || 'Error processing booking');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentMethodSelect = (methodId) => {
    setSelectedPaymentMethod(methodId);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Select Workspace"
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
                required
              >
                {workspaces.map((workspace) => (
                  <MenuItem key={workspace.id} value={workspace.id}>
                    {workspace.name} - {formatCurrency(workspace.pricePerHour)}/hour
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {selectedWorkspace && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Selected Workspace Details
                    </Typography>
                    {(() => {
                      const workspace = workspaces.find(w => w.id === selectedWorkspace);
                      return workspace ? (
                        <>
                          <Typography>Type: {workspace.type}</Typography>
                          <Typography>Capacity: {workspace.capacity} people</Typography>
                          <Typography>Rate: {formatCurrency(workspace.pricePerHour)}/hour</Typography>
                          <Typography>Amenities: {workspace.amenities.join(', ')}</Typography>
                        </>
                      ) : null;
                    })()}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Start Time"
                value={startTime}
                onChange={setStartTime}
                renderInput={(params) => <TextField {...params} fullWidth required />}
                minDateTime={new Date()}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="End Time"
                value={endTime}
                onChange={setEndTime}
                renderInput={(params) => <TextField {...params} fullWidth required />}
                minDateTime={startTime || new Date()}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>
            {totalAmount > 0 && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Booking Summary
                    </Typography>
                    <Typography>
                      Duration: {((endTime - startTime) / (1000 * 60 * 60)).toFixed(1)} hours
                    </Typography>
                    <Typography variant="h6" align="right" color="primary">
                      Total: {formatCurrency(totalAmount)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        );

      case 2:
        return (
          <Elements stripe={stripePromise}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Booking Summary
                    </Typography>
                    <Typography>Workspace: {workspaces.find(w => w.id === selectedWorkspace)?.name}</Typography>
                    <Typography>Start: {startTime?.toLocaleString()}</Typography>
                    <Typography>End: {endTime?.toLocaleString()}</Typography>
                    <Typography variant="h6" align="right" color="primary">
                      Total: {formatCurrency(totalAmount)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <PaymentMethodForm
                  onPaymentMethodSelect={handlePaymentMethodSelect}
                  selectedPaymentMethod={selectedPaymentMethod}
                />
              </Grid>
            </Grid>
          </Elements>
        );

      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 4 }}>
        <Typography variant="h5" gutterBottom align="center">
          Book a Workspace
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
          {activeStep !== 0 && (
            <Button onClick={handleBack} disabled={loading}>
              Back
            </Button>
          )}
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handlePayment}
              disabled={processingPayment || !selectedPaymentMethod}
            >
              {processingPayment ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Processing...
                </>
              ) : (
                'Pay & Book'
              )}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </LocalizationProvider>
  );
};

export default BookingForm;
