import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { getSpaceTypes, getAvailableSpaces, createBooking } from '../../services/userServices';

const steps = ['Select Space', 'Choose Date & Time', 'Confirm Booking'];

const BookSpace = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [spaceTypes, setSpaceTypes] = useState([]);
  const [availableSpaces, setAvailableSpaces] = useState({});
  const [booking, setBooking] = useState({
    spaceType: '',
    space: '',
    date: null,
    startTime: null,
    endTime: null,
    numberOfPeople: 1,
    additionalNotes: '',
  });

  useEffect(() => {
    const fetchSpaceTypes = async () => {
      try {
        setLoading(true);
        const types = await getSpaceTypes();
        setSpaceTypes(types);
        setError(null);
      } catch (err) {
        setError('Failed to load space types. Please try again later.');
        console.error('Space types fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpaceTypes();
  }, []);

  useEffect(() => {
    const fetchAvailableSpaces = async () => {
      if (!booking.spaceType || !booking.date) return;

      try {
        setLoading(true);
        const spaces = await getAvailableSpaces({
          spaceType: booking.spaceType,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
        });
        setAvailableSpaces(spaces);
        setError(null);
      } catch (err) {
        setError('Failed to load available spaces. Please try again later.');
        console.error('Available spaces fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSpaces();
  }, [booking.spaceType, booking.date, booking.startTime, booking.endTime]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setBooking((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNext = async () => {
    if (activeStep === steps.length - 1) {
      try {
        setSubmitting(true);
        await createBooking(booking);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          navigate('/user/bookings');
        }, 2000);
      } catch (err) {
        setError('Failed to create booking. Please try again.');
        console.error('Booking creation error:', err);
      } finally {
        setSubmitting(false);
      }
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  if (loading && activeStep === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Space Type</InputLabel>
                <Select
                  name="spaceType"
                  value={booking.spaceType}
                  onChange={handleChange}
                  label="Space Type"
                >
                  {spaceTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name} - ${type.price}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {booking.spaceType && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Space</InputLabel>
                  <Select
                    name="space"
                    value={booking.space}
                    onChange={handleChange}
                    label="Select Space"
                  >
                    {availableSpaces[booking.spaceType]?.map((space) => (
                      <MenuItem key={space} value={space}>
                        {space}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        );
      case 1:
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={booking.date}
                  onChange={(newValue) =>
                    setBooking((prev) => ({ ...prev, date: newValue }))
                  }
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Number of People"
                  name="numberOfPeople"
                  type="number"
                  value={booking.numberOfPeople}
                  onChange={handleChange}
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Start Time"
                  value={booking.startTime}
                  onChange={(newValue) =>
                    setBooking((prev) => ({ ...prev, startTime: newValue }))
                  }
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="End Time"
                  value={booking.endTime}
                  onChange={(newValue) =>
                    setBooking((prev) => ({ ...prev, endTime: newValue }))
                  }
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Additional Notes"
                  name="additionalNotes"
                  multiline
                  rows={4}
                  value={booking.additionalNotes}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Booking Summary
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography>
                  <strong>Space Type:</strong>{' '}
                  {spaceTypes.find((type) => type.id === booking.spaceType)?.name}
                </Typography>
                <Typography>
                  <strong>Space:</strong> {booking.space}
                </Typography>
                <Typography>
                  <strong>Date:</strong>{' '}
                  {booking.date?.toLocaleDateString() || 'Not selected'}
                </Typography>
                <Typography>
                  <strong>Time:</strong>{' '}
                  {`${booking.startTime?.toLocaleTimeString() || 'Not selected'} - ${
                    booking.endTime?.toLocaleTimeString() || 'Not selected'
                  }`}
                </Typography>
                <Typography>
                  <strong>Number of People:</strong> {booking.numberOfPeople}
                </Typography>
                {booking.additionalNotes && (
                  <Typography>
                    <strong>Notes:</strong> {booking.additionalNotes}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Book a Space
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Booking submitted successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent(activeStep)}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            {activeStep !== 0 && (
              <Button onClick={handleBack} sx={{ mr: 1 }}>
                Back
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              }}
              disabled={submitting}
            >
              {activeStep === steps.length - 1 ? 'Submit Booking' : 'Next'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BookSpace;
