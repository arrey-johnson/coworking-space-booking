import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
  useTheme,
  Alert,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

const Settings = () => {
  const theme = useTheme();
  const [settings, setSettings] = useState({
    companyName: 'Coworking Space',
    email: 'admin@coworkingspace.com',
    phone: '+1 234 567 890',
    address: '123 Business Street',
    enableNotifications: true,
    enableBookingReminders: true,
    enableAutoApproval: false,
    maxBookingDuration: 8,
    currency: 'USD',
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    setSettings((prev) => ({
      ...prev,
      [name]: event.target.type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Add API call to save settings
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Settings
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  General Settings
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Company Name"
                    name="companyName"
                    value={settings.companyName}
                    onChange={handleChange}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={settings.email}
                    onChange={handleChange}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Phone"
                    name="phone"
                    value={settings.phone}
                    onChange={handleChange}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Address"
                    name="address"
                    value={settings.address}
                    onChange={handleChange}
                    margin="normal"
                    multiline
                    rows={2}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Booking Settings
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableNotifications}
                        onChange={handleChange}
                        name="enableNotifications"
                        color="primary"
                      />
                    }
                    label="Enable Email Notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableBookingReminders}
                        onChange={handleChange}
                        name="enableBookingReminders"
                        color="primary"
                      />
                    }
                    label="Enable Booking Reminders"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableAutoApproval}
                        onChange={handleChange}
                        name="enableAutoApproval"
                        color="primary"
                      />
                    }
                    label="Enable Auto-Approval"
                  />
                  <TextField
                    fullWidth
                    label="Maximum Booking Duration (hours)"
                    name="maxBookingDuration"
                    type="number"
                    value={settings.maxBookingDuration}
                    onChange={handleChange}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Currency"
                    name="currency"
                    value={settings.currency}
                    onChange={handleChange}
                    margin="normal"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              px: 4,
              py: 1.5,
            }}
          >
            Save Changes
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default Settings;
