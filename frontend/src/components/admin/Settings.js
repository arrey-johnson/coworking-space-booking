import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import api from '../../services/api';

const Settings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentSetting, setCurrentSetting] = useState(null);
  const [formData, setFormData] = useState({ key: '', value: '', description: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/settings');
      console.log('Settings response:', response.data);
      // Ensure settings is always an array
      setSettings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError(error.response?.data?.message || 'Failed to load settings');
      // Initialize with empty array on error
      setSettings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (setting) => {
    let value = setting.value;
    // If value is a JSON string, parse it for display
    try {
      value = JSON.parse(setting.value);
      value = JSON.stringify(value, null, 2); // Pretty print JSON
    } catch (e) {
      // If parsing fails, use the value as is
      console.log('Value is not JSON:', value);
    }

    setCurrentSetting(setting);
    setFormData({
      key: setting.key,
      value: value,
      description: setting.description || ''
    });
    setEditDialogOpen(true);
  };

  const handleAddNew = () => {
    setCurrentSetting(null);
    setFormData({ key: '', value: '', description: '' });
    setEditDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setError('');
      let valueToSave = formData.value;
      
      // Try to parse the value as JSON if it looks like JSON
      try {
        const parsedValue = JSON.parse(formData.value);
        if (typeof parsedValue === 'object') {
          valueToSave = JSON.stringify(parsedValue);
        }
      } catch (e) {
        // If parsing fails, use the value as is
        console.log('Value is not JSON, using as is');
      }

      const settingData = {
        key: formData.key,
        value: valueToSave,
        description: formData.description
      };

      await api.put('/api/admin/settings', { settings: [settingData] });
      setEditDialogOpen(false);
      fetchSettings(); // Refresh the list
    } catch (error) {
      console.error('Error saving setting:', error);
      setError(error.response?.data?.message || 'Failed to save setting');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">System Settings</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Add Setting
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {settings.map((setting) => (
          <Grid item xs={12} md={6} key={setting.key}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {setting.key}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    {setting.description}
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    Value: {
                      (() => {
                        try {
                          const parsed = JSON.parse(setting.value);
                          return JSON.stringify(parsed, null, 2);
                        } catch (e) {
                          return setting.value;
                        }
                      })()
                    }
                  </Typography>
                </Box>
                <IconButton onClick={() => handleEditClick(setting)} color="primary">
                  <EditIcon />
                </IconButton>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentSetting ? 'Edit Setting' : 'Add New Setting'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Key"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              disabled={!!currentSetting}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Value"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              margin="normal"
              multiline
              rows={4}
              helperText="For JSON values, ensure proper formatting"
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
