import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Import admin components
import PaymentManagement from './PaymentManagement';
import BookingManagement from './BookingManagement';
import UserManagement from './UserManagement';
import Analytics from './Analytics';
import Settings from './Settings';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeBookings: 0,
    monthlyRevenue: 0,
    spaceUtilization: 0
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching dashboard stats...');
      const response = await api.get('/api/admin/dashboard/stats');
      console.log('Dashboard stats response:', response.data);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(
        error.response?.data?.message || 
        'Failed to load dashboard statistics. Please make sure you have admin privileges.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardStats();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const dashboardCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers || 0,
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#4CAF50',
      onClick: () => navigate('/admin/users')
    },
    {
      title: 'Active Bookings',
      value: stats.activeBookings || 0,
      icon: <EventIcon sx={{ fontSize: 40 }} />,
      color: '#2196F3',
      onClick: () => navigate('/admin/bookings')
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      icon: <PaymentIcon sx={{ fontSize: 40 }} />,
      color: '#FF9800',
      onClick: () => navigate('/admin/payments')
    },
    {
      title: 'Space Utilization',
      value: `${stats.spaceUtilization || 0}%`,
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      color: '#9C27B0',
      onClick: () => navigate('/admin/analytics')
    }
  ];

  if (loading && !stats.totalUsers) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Dashboard Overview
        </Typography>
        <IconButton onClick={handleRefresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {dashboardCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)'
                }
              }}
              onClick={card.onClick}
            >
              <CardContent>
                <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
                  <Box
                    sx={{
                      bgcolor: `${card.color}15`,
                      borderRadius: '50%',
                      p: 2,
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Box sx={{ color: card.color }}>
                      {card.icon}
                    </Box>
                  </Box>
                  <Typography color="textSecondary" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="h4">
                    {loading ? <CircularProgress size={20} /> : card.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity Section */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          Recent Activity
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography color="textSecondary">
            Coming soon: Activity feed showing recent bookings, user registrations, and payments
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
