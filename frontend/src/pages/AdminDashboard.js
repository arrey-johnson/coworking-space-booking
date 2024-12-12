import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  AttachMoney as MoneyIcon,
  AccountBalance as AccountIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import PaymentStats from '../components/PaymentStats';

const AdminDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [refundError, setRefundError] = useState('');
  const [refundSuccess, setRefundSuccess] = useState('');

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/payments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/payment-stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching payment stats:', error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuClick = (event, payment) => {
    setAnchorEl(event.currentTarget);
    setSelectedPayment(payment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPayment(null);
  };

  const handleRefund = async () => {
    try {
      setRefundError('');
      setRefundSuccess('');
      
      await axios.post(
        `http://localhost:5000/api/admin/payments/${selectedPayment.id}/refund`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      setRefundSuccess('Refund processed successfully');
      fetchPayments();
      fetchStats();
      handleMenuClose();
    } catch (error) {
      console.error('Error processing refund:', error);
      setRefundError(error.response?.data?.message || 'Error processing refund');
    }
  };

  const handleViewDetails = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/admin/payments/${selectedPayment.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setPaymentDetails(response.data);
      setDetailsOpen(true);
      handleMenuClose();
    } catch (error) {
      console.error('Error fetching payment details:', error);
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setPaymentDetails(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'succeeded':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredPayments = payments.filter(payment =>
    payment.booking?.workspace?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {refundError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRefundError('')}>
          {refundError}
        </Alert>
      )}
      {refundSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setRefundSuccess('')}>
          {refundSuccess}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Analytics" />
        </Tabs>
      </Box>

      {currentTab === 0 ? (
        <Grid container spacing={3}>
          {/* Stats Cards */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <MoneyIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total Revenue</Typography>
                </Box>
                <Typography variant="h4">{formatCurrency(stats.totalRevenue)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccountIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">Successful</Typography>
                </Box>
                <Typography variant="h4">{stats.successfulPayments}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUpIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">Pending</Typography>
                </Box>
                <Typography variant="h4">{stats.pendingPayments}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <WarningIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6">Failed</Typography>
                </Box>
                <Typography variant="h4">{stats.failedPayments}</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Payments Table */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Payment Transactions</Typography>
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Transaction ID</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Workspace</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPayments
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.created), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{payment.id}</TableCell>
                          <TableCell>{payment.user?.email}</TableCell>
                          <TableCell>{payment.booking?.workspace?.name}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <Chip
                              label={payment.status}
                              color={getStatusColor(payment.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuClick(e, payment)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredPayments.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <PaymentStats />
      )}

      {/* Payment Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={handleRefund}
          disabled={!selectedPayment || selectedPayment.status !== 'succeeded'}
        >
          Process Refund
        </MenuItem>
        <MenuItem onClick={handleViewDetails}>View Details</MenuItem>
      </Menu>

      {/* Payment Details Dialog */}
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          {paymentDetails && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Transaction Details</Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography>ID: {paymentDetails.id}</Typography>
                  <Typography>Amount: {formatCurrency(paymentDetails.amount)}</Typography>
                  <Typography>Status: {paymentDetails.status}</Typography>
                  <Typography>Date: {format(new Date(paymentDetails.created), 'PPpp')}</Typography>
                  <Typography>Payment Method: {paymentDetails.paymentMethod}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Booking Details</Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography>Workspace: {paymentDetails.booking?.workspace?.name}</Typography>
                  <Typography>Start: {format(new Date(paymentDetails.booking?.startTime), 'PPp')}</Typography>
                  <Typography>End: {format(new Date(paymentDetails.booking?.endTime), 'PPp')}</Typography>
                </Box>
              </Grid>
              {paymentDetails.refundId && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Refund Details</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography>Refund ID: {paymentDetails.refundId}</Typography>
                    <Typography>Refunded At: {format(new Date(paymentDetails.refundedAt), 'PPpp')}</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;
