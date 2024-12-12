import api from './api';

export const getDashboardStats = async () => {
  try {
    const response = await api.get('/api/admin/dashboard/stats');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getRevenueStats = async (period = 'monthly') => {
  try {
    const response = await api.get(`/api/admin/dashboard/revenue?period=${period}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getSpaceUtilization = async () => {
  try {
    const response = await api.get('/api/admin/dashboard/space-utilization');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getRecentBookings = async () => {
  try {
    const response = await api.get('/api/admin/dashboard/recent-bookings');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// User Management Services
export const getAllUsers = async () => {
  try {
    const response = await api.get('/api/admin/users');
    // Ensure we always return an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return []; // Return empty array on error
  }
};

export const getUserById = async (userId) => {
  try {
    const response = await api.get(`/api/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/api/admin/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export const updateUserStatus = async (userId, status) => {
  try {
    const response = await api.put(`/api/admin/users/${userId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

// Analytics Services
export const getAnalyticsData = async (startDate, endDate) => {
  try {
    const response = await api.get('/api/admin/analytics', {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};
