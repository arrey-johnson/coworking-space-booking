import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import QRCode from 'qrcode.react';
import axios from 'axios';

const SecuritySettings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [securityData, setSecurityData] = useState({
    twoFactorEnabled: false,
    twoFactorSecret: '',
    twoFactorQR: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showTwoFactorDialog, setShowTwoFactorDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/security', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSecurityData(response.data);
    } catch (error) {
      console.error('Error fetching security settings:', error);
      setError('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await axios.put('/api/users/security/password', passwordData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccess('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      setError(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorToggle = async () => {
    try {
      setLoading(true);
      if (!securityData.twoFactorEnabled) {
        const response = await axios.post('/api/users/security/2fa/setup', null, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSecurityData(prev => ({
          ...prev,
          twoFactorSecret: response.data.secret,
          twoFactorQR: response.data.qrCode
        }));
        setShowTwoFactorDialog(true);
      } else {
        await axios.delete('/api/users/security/2fa', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSecurityData(prev => ({
          ...prev,
          twoFactorEnabled: false,
          twoFactorSecret: ''
        }));
        setSuccess('Two-factor authentication disabled');
      }
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      setError('Failed to update two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    try {
      setLoading(true);
      await axios.post('/api/users/security/2fa/verify', {
        code: verificationCode
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSecurityData(prev => ({
        ...prev,
        twoFactorEnabled: true
      }));
      setShowTwoFactorDialog(false);
      setSuccess('Two-factor authentication enabled');
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      setError('Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Security Settings
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

        <Grid container spacing={3}>
          {/* Password Change Section */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <form onSubmit={handlePasswordChange}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Current Password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      currentPassword: e.target.value
                    }))}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="New Password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      newPassword: e.target.value
                    }))}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Confirm New Password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                  >
                    Change Password
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Grid>

          {/* Two-Factor Authentication Section */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Two-Factor Authentication
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={securityData.twoFactorEnabled}
                  onChange={handleTwoFactorToggle}
                  disabled={loading}
                />
              }
              label={securityData.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            />
          </Grid>
        </Grid>

        {/* 2FA Setup Dialog */}
        <Dialog open={showTwoFactorDialog} onClose={() => setShowTwoFactorDialog(false)}>
          <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
          <DialogContent>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography gutterBottom>
                Scan this QR code with your authenticator app:
              </Typography>
              {securityData.twoFactorQR && (
                <Box sx={{ my: 2 }}>
                  <QRCode value={securityData.twoFactorQR} size={200} />
                </Box>
              )}
              <Typography variant="caption" display="block" gutterBottom>
                Or enter this code manually: {securityData.twoFactorSecret}
              </Typography>
              <TextField
                fullWidth
                label="Verification Code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowTwoFactorDialog(false)}>Cancel</Button>
            <Button onClick={handleVerifyTwoFactor} disabled={loading}>
              Verify
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default SecuritySettings;
