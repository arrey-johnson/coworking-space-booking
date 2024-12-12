import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Login as LoginIcon,
  Payment as PaymentIcon,
  Book as BookIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  DeleteForever as DeleteIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

const ActivityAndData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activities, setActivities] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/activities', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'login':
        return <LoginIcon />;
      case 'payment':
        return <PaymentIcon />;
      case 'booking':
        return <BookIcon />;
      case 'profile_update':
        return <EditIcon />;
      default:
        return <EditIcon />;
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/users/data/export', null, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setExportStatus('processing');
      setSuccess('Data export request submitted. You will receive an email when it\'s ready.');
      
      // Poll for export status
      const checkExportStatus = setInterval(async () => {
        try {
          const statusResponse = await axios.get('/api/users/data/export/status', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (statusResponse.data.status === 'completed') {
            clearInterval(checkExportStatus);
            setExportStatus('completed');
            window.location.href = statusResponse.data.downloadUrl;
          }
        } catch (error) {
          console.error('Error checking export status:', error);
        }
      }, 5000);

      // Clear interval after 5 minutes
      setTimeout(() => clearInterval(checkExportStatus), 300000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await axios.post('/api/users/account/delete', null, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowDeleteDialog(false);
      setSuccess('Account deletion request submitted. Your account will be permanently deleted in 30 days.');
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      setError('Failed to submit account deletion request');
    } finally {
      setLoading(false);
    }
  };

  const cancelDeletion = async () => {
    try {
      setLoading(true);
      await axios.delete('/api/users/account/delete', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccess('Account deletion request cancelled.');
    } catch (error) {
      console.error('Error cancelling account deletion:', error);
      setError('Failed to cancel account deletion request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Activity Log & Data Management
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

        {/* Activity Log Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          {loading ? (
            <CircularProgress />
          ) : (
            <List>
              {activities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getActivityIcon(activity.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.description}
                      secondary={format(new Date(activity.timestamp), 'PPpp')}
                    />
                  </ListItem>
                  {index < activities.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Data Management Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Data Management
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportData}
                disabled={loading || exportStatus === 'processing'}
              >
                {exportStatus === 'processing' ? 'Processing...' : 'Export My Data'}
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
              >
                Delete Account
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Delete Account Dialog */}
        <Dialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
        >
          <DialogTitle>Delete Account</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete your account? This action cannot be undone.
              Your account will be scheduled for deletion and permanently removed after 30 days.
              During this period, you can log in to cancel the deletion request.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onClick={handleDeleteAccount} color="error" disabled={loading}>
              Delete Account
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default ActivityAndData;
