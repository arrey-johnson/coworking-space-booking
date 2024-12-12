import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  Button,
  Avatar,
  Stack,
  useMediaQuery,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  EventAvailable as EventIcon,
  Timer as TimerIcon,
  AttachMoney as MoneyIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getUserDashboardStats, getRecentBookings } from '../../services/userServices';
import { formatXAF } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

const DashboardCard = ({ title, value, subtitle, icon: Icon, color, onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card 
      onClick={onClick}
      sx={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        background: `linear-gradient(135deg, ${color}15, ${color}05)`,
        borderRadius: 4,
        border: `1px solid ${color}20`,
        transition: 'all 0.3s ease',
        '&:hover': onClick && {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${color}20`,
        },
      }}
    >
      <CardContent sx={{ p: isMobile ? 2 : 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              bgcolor: `${color}20`,
              color: color,
              width: isMobile ? 40 : 56,
              height: isMobile ? 40 : 56,
            }}
          >
            <Icon sx={{ fontSize: isMobile ? 24 : 32 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              component="div" 
              sx={{ 
                fontWeight: 700,
                color: theme.palette.text.primary,
                mb: 0.5
              }}
            >
              {value}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.text.secondary,
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: color,
                  display: 'block',
                  mt: 0.5
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const BookingItem = ({ booking, isMobile }) => {
  const theme = useTheme();
  const statusColors = {
    active: theme.palette.success.main,
    pending: theme.palette.warning.main,
    completed: theme.palette.info.main,
    cancelled: theme.palette.error.main,
  };

  const StatusIcon = {
    active: CheckCircleIcon,
    pending: ScheduleIcon,
    cancelled: CancelIcon,
  }[booking.status.toLowerCase()] || CheckCircleIcon;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start, end) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    return Math.round((endTime - startTime) / (1000 * 60 * 60));
  };

  return (
    <Card 
      sx={{ 
        mb: 2,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        background: theme.palette.background.paper,
        transition: 'transform 0.2s ease',
        '&:hover': {
          transform: 'translateX(8px)',
        },
      }}
    >
      <CardContent sx={{ p: isMobile ? 2 : 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              bgcolor: `${statusColors[booking.status.toLowerCase()]}15`,
              color: statusColors[booking.status.toLowerCase()],
            }}
          >
            <StatusIcon />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              {booking.workspace?.name || 'Workspace'}
            </Typography>
            <Stack 
              direction={isMobile ? "column" : "row"} 
              spacing={isMobile ? 0.5 : 2}
              alignItems={isMobile ? "flex-start" : "center"}
            >
              <Typography variant="caption" color="text.secondary">
                {formatDate(booking.startTime)}
              </Typography>
              <Box 
                sx={{ 
                  width: 4, 
                  height: 4, 
                  borderRadius: '50%', 
                  bgcolor: 'text.disabled',
                  display: isMobile ? 'none' : 'block'
                }} 
              />
              <Typography variant="caption" color="text.secondary">
                {calculateDuration(booking.startTime, booking.endTime)} hours
              </Typography>
              <Box 
                sx={{ 
                  width: 4, 
                  height: 4, 
                  borderRadius: '50%', 
                  bgcolor: 'text.disabled',
                  display: isMobile ? 'none' : 'block'
                }} 
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: statusColors[booking.status.toLowerCase()],
                  fontWeight: 500
                }}
              >
                {booking.status}
              </Typography>
            </Stack>
          </Box>
          <Typography 
            variant={isMobile ? "body2" : "body1"} 
            sx={{ 
              fontWeight: 600,
              color: theme.palette.primary.main
            }}
          >
            {formatXAF(booking.amount)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, bookingsData] = await Promise.all([
          getUserDashboardStats(),
          getRecentBookings()
        ]);
        setStats(statsData);
        setRecentBookings(bookingsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Grid container spacing={3}>
        {/* Welcome Section */}
        <Grid item xs={12}>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            Welcome back, {user?.name || 'User'}!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Here's what's happening with your workspace
          </Typography>
        </Grid>

        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Total Bookings"
            value={stats.totalBookings || '0'}
            icon={EventIcon}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Hours Used"
            value={`${stats.hoursUsed || '0'}h`}
            icon={TimerIcon}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Amount Spent"
            value={formatXAF(stats.amountSpent || 0)}
            icon={MoneyIcon}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Book Space"
            value="Quick Book"
            icon={AddIcon}
            color={theme.palette.info.main}
            onClick={() => navigate('/book')}
          />
        </Grid>

        {/* Recent Bookings */}
        <Grid item xs={12}>
          <Card sx={{ 
            mt: 2, 
            borderRadius: 2,
            boxShadow: theme.shadows[2],
            height: '100%'
          }}>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2 
              }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent Bookings
                </Typography>
                <Button
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/bookings')}
                >
                  View All
                </Button>
              </Box>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : recentBookings.length === 0 ? (
                <Box sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  backgroundColor: theme.palette.background.default,
                  borderRadius: 1
                }}>
                  <Typography color="text.secondary">
                    No recent bookings found
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/book')}
                    sx={{ mt: 2 }}
                  >
                    Book a Space
                  </Button>
                </Box>
              ) : (
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  {recentBookings.map((booking) => (
                    <BookingItem 
                      key={booking.id} 
                      booking={booking}
                      isMobile={isMobile}
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
