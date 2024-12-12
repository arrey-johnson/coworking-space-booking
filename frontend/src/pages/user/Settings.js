import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  useTheme,
  Alert,
} from '@mui/material';

const Settings = () => {
  const theme = useTheme();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    bookingReminders: true,
    promotionalEmails: false,
    darkMode: false,
  });

  const handleSettingChange = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Settings
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Customize your workspace experience by adjusting these settings
      </Alert>

      <Card sx={{ mb: 4, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Notifications
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Email Notifications"
                secondary="Receive updates about your bookings via email"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.emailNotifications}
                  onChange={() => handleSettingChange('emailNotifications')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Booking Reminders"
                secondary="Get reminded about upcoming bookings"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.bookingReminders}
                  onChange={() => handleSettingChange('bookingReminders')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Promotional Emails"
                secondary="Receive updates about special offers and new features"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.promotionalEmails}
                  onChange={() => handleSettingChange('promotionalEmails')}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Appearance
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Dark Mode"
                secondary="Switch between light and dark theme"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.darkMode}
                  onChange={() => handleSettingChange('darkMode')}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;
