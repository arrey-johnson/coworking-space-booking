import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import api from '../../services/api';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    revenue: [],
    bookings: [],
    occupancy: [],
    paymentMethods: [],
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const getDateRange = () => {
    const end = new Date();
    let start;

    switch (timeRange) {
      case 'week':
        start = subDays(end, 7);
        break;
      case 'month':
        start = startOfMonth(end);
        break;
      case 'year':
        start = new Date(end.getFullYear(), 0, 1);
        break;
      default:
        start = subDays(end, 7);
    }

    return { start, end };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const { start, end } = getDateRange();
      
      const response = await api.get('/api/admin/analytics', {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }
      });

      if (!response.data) {
        throw new Error('No data received from server');
      }

      // Initialize empty arrays for missing data
      const transformedData = {
        revenue: [],
        bookings: [],
        occupancy: [],
        paymentMethods: [],
      };

      // Safely transform the data
      if (Array.isArray(response.data.revenue)) {
        transformedData.revenue = response.data.revenue.map(item => ({
          date: item.date,
          amount: parseFloat(item.amount || 0)
        }));
      }

      if (Array.isArray(response.data.bookings)) {
        transformedData.bookings = response.data.bookings.map(item => ({
          date: item.date,
          count: parseInt(item.count || 0)
        }));
      }

      if (Array.isArray(response.data.occupancy)) {
        transformedData.occupancy = response.data.occupancy.map(item => ({
          date: item.date,
          rate: parseFloat(item.rate || 0)
        }));
      }

      if (Array.isArray(response.data.paymentMethods)) {
        transformedData.paymentMethods = response.data.paymentMethods.map(item => ({
          method: item.method || 'unknown',
          count: parseInt(item.count || 0)
        }));
      }

      setStats(transformedData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(
        error.response?.data?.message || 
        error.message || 
        'Failed to load analytics data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return format(new Date(date), 'MMM dd');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Analytics Dashboard</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Revenue Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Revenue Trend</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={formatDate}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Revenue"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Bookings Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Booking Trend</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.bookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip
                  labelFormatter={formatDate}
                />
                <Legend />
                <Bar
                  dataKey="count"
                  name="Bookings"
                  fill="#82ca9d"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Occupancy Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Space Utilization</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.occupancy}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value) => `${value.toFixed(1)}%`}
                  labelFormatter={formatDate}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="Utilization"
                  stroke="#ffc658"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Payment Methods Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Payment Methods</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.paymentMethods}
                  dataKey="count"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;
