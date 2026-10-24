import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with authentication (same as main api.js)
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // For FormData, remove Content-Type to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on the login page or if it's a login request
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isOnLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';

      if (!isLoginRequest && !isOnLoginPage) {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const rideEntriesAPI = {
  // Get all ride entries with optional filters
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.date) params.append('date', filters.date);
      if (filters.rideId) params.append('rideId', filters.rideId);
      if (filters.rideName) params.append('rideName', filters.rideName);
      if (filters.enteredBy) params.append('enteredBy', filters.enteredBy);
      if (filters.entryType) params.append('entryType', filters.entryType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await api.get(`/ride-entries?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ride entries:', error);
      throw error;
    }
  },

  // Get entries for a specific ride
  getByRideId: async (rideId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.date) params.append('date', filters.date);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.entryType) params.append('entryType', filters.entryType);
      
      const response = await api.get(`/ride-entries/ride/${rideId}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ride entries for ride:', error);
      throw error;
    }
  },

  // Get today's entries for a specific ride
  getTodayEntries: async (rideId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `${API_BASE_URL}/ride-entries/ride/${rideId}?date=${today}`;
      console.log('🌐 API Request:', url);
      
      const response = await api.get(`/ride-entries/ride/${rideId}?date=${today}`);
      console.log('📥 API Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching today\'s ride entries:', error);
      console.error('❌ API Error Details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: `${API_BASE_URL}/ride-entries/ride/${rideId}?date=${new Date().toISOString().split('T')[0]}`
      });
      throw error;
    }
  },

  // Get entries by user
  getByUserId: async (userId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.date) params.append('date', filters.date);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await api.get(`/ride-entries/user/${userId}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user ride entries:', error);
      throw error;
    }
  },

  // Create a new ride entry
  create: async (entryData) => {
    try {
      const response = await api.post('/ride-entries', entryData);
      return response.data;
    } catch (error) {
      console.error('Error creating ride entry:', error);
      throw error;
    }
  },

  // Update a ride entry
  update: async (id, entryData) => {
    try {
      const response = await api.put(`/ride-entries/${id}`, entryData);
      return response.data;
    } catch (error) {
      console.error('Error updating ride entry:', error);
      throw error;
    }
  },

  // Delete a ride entry
  delete: async (id) => {
    try {
      const response = await api.delete(`/ride-entries/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting ride entry:', error);
      throw error;
    }
  },

  // Get daily summary for rides
  getDailySummary: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.date) params.append('date', filters.date);
      if (filters.rideId) params.append('rideId', filters.rideId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await api.get(`/ride-entries/summary?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      throw error;
    }
  },

  // Get today's summary for all rides
  getTodaySummary: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/ride-entries/summary?date=${today}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching today\'s summary:', error);
      throw error;
    }
  },

  // Get ride statistics
  getRideStats: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.rideId) params.append('rideId', filters.rideId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.period) params.append('period', filters.period); // 'today', 'week', 'month', 'year'
      
      const response = await api.get(`/ride-entries/stats?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ride stats:', error);
      throw error;
    }
  },

  // Bulk create entries (for data import)
  bulkCreate: async (entries) => {
    try {
      const response = await api.post('/ride-entries/bulk', { entries });
      return response.data;
    } catch (error) {
      console.error('Error bulk creating ride entries:', error);
      throw error;
    }
  }
};

export default rideEntriesAPI;
