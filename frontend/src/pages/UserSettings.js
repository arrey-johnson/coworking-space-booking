import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import PaymentMethods from '../components/PaymentMethods';
import PaymentHistory from '../components/PaymentHistory';

function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UserSettings = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="user settings tabs"
            variant="fullWidth"
          >
            <Tab label="Payment Methods" />
            <Tab label="Payment History" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Payment Methods
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <PaymentMethods />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Payment History
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <PaymentHistory />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default UserSettings;
