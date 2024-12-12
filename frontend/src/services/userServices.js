import api from './api';

// User Profile Services
export const getUserProfile = async () => {
  try {
    const response = await api.get('/api/user/profile');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put('/api/user/profile', profileData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Booking Services
export const createBooking = async (bookingData) => {
  try {
    const response = await api.post('/api/user/bookings', bookingData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUserBookings = async () => {
  try {
    const response = await api.get('/api/user/bookings');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const cancelBooking = async (bookingId) => {
  try {
    const response = await api.delete(`/api/user/bookings/${bookingId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Space Services
export const getAvailableSpaces = async (params) => {
  try {
    const response = await api.get('/api/spaces/available', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getSpaceTypes = async () => {
  try {
    const response = await api.get('/api/spaces/types');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Dashboard Services
export const getUserDashboardStats = async () => {
  try {
    const response = await api.get('/api/user/dashboard/stats');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getRecentBookings = async () => {
  try {
    const response = await api.get('/api/user/dashboard/recent-bookings');
    return response.data;
  } catch (error) {
    throw error;
  }
};
