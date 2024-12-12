import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeBookings: 0,
    availableWorkspaces: 0,
    upcomingBookings: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Active Bookings',
      value: stats.activeBookings,
      color: '#1976d2',
    },
    {
      title: 'Available Workspaces',
      value: stats.availableWorkspaces,
      color: '#2e7d32',
    },
    {
      title: 'Upcoming Bookings',
      value: stats.upcomingBookings,
      color: '#ed6c02',
    },
    {
      title: 'Total Spent',
      value: `$${stats.totalSpent.toFixed(2)}`,
      color: '#9c27b0',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome, {user?.username}!
      </Typography>
      <Grid container spacing={3}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderTop: `4px solid ${stat.color}`,
              }}
            >
              <CardContent>
                <Typography
                  color="textSecondary"
                  gutterBottom
                  variant="h6"
                  component="h2"
                >
                  {stat.title}
                </Typography>
                <Typography variant="h4" component="div">
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
