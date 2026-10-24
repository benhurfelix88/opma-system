import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
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

// ==================== AUTH API ====================

export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data && response.data.token) {
      sessionStorage.setItem('authToken', response.data.token);
      if (response.data.user) {
        const u = response.data.user;
        const mappedUser = {
          ...u,
          fullName: u.fullName || u.full_name || '',
          mobileNumber: u.mobileNumber || u.mobile_number || '',
          assignedRide: u.assignedRide || (u.assigned_ride ? { id: u.assigned_ride, name: u.assigned_ride } : null),
        };
        sessionStorage.setItem('currentUser', JSON.stringify(mappedUser));
      }
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentUser');
    }
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    const u = response.data.user || {};
    const mappedUser = {
      ...u,
      fullName: u.fullName || u.full_name || '',
      mobileNumber: u.mobileNumber || u.mobile_number || '',
      assignedRide: u.assignedRide || (u.assigned_ride ? { id: u.assigned_ride, name: u.assigned_ride } : null),
    };
    sessionStorage.setItem('currentUser', JSON.stringify(mappedUser));
    return mappedUser;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    const response = await api.post('/auth/profile/picture', formData);
    return response.data;
  },

  deleteProfilePicture: async () => {
    const response = await api.delete('/auth/profile/picture');
    return response.data;
  },

  heartbeat: async () => {
    const response = await api.post('/auth/heartbeat');
    return response.data;
  },

  checkUserSessionStatus: async (userId) => {
    const response = await api.get(`/users/${userId}/session-status`);
    return response.data;
  },
};

// ==================== USERS API ====================

export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  update: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/users/${id}/status`, { status });
    return response.data;
  },
};

// ==================== RIDES API ====================

export const ridesAPI = {
  getAll: async () => {
    const response = await api.get('/rides');
    return response.data;
  },
  create: async (name, status = 'operational', location = '') => {
    try {
      const response = await api.post('/rides', { name, status, location });
      return response.data;
    } catch (e) {
      // Fallback to alias if server path differs
      if (e?.response?.status === 404) {
        const resp2 = await api.post('/ride', { name, status, location });
        return resp2.data;
      }
      throw e;
    }
  },
  update: async (id, name, status = 'operational', location = '') => {
    const response = await api.put(`/rides/${id}`, { name, status, location });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/rides/${id}`);
    return response.data;
  },
};

// ==================== RIDE STATUS API ====================

export const rideStatusAPI = {
  get: async () => {
    const response = await api.get('/ride-status');
    return response.data;
  },
  updateBulk: async (statuses) => {
    const response = await api.put('/ride-status', { statuses });
    return response.data;
  },
};


// ==================== MAINTENANCE API ====================

export const maintenanceAPI = {
  getAll: async () => {
    const response = await api.get('/maintenance');
    return response.data;
  },

  create: async (maintenanceData) => {
    const response = await api.post('/maintenance', maintenanceData);
    return response.data;
  },

  update: async (id, maintenanceData) => {
    const response = await api.put(`/maintenance/${id}`, maintenanceData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/maintenance/${id}`);
    return response.data;
  },
};

// ==================== INCIDENTS API ====================

export const incidentsAPI = {
  getAll: async () => {
    const response = await api.get('/incidents');
    return response.data;
  },

  create: async (incidentData, photoFiles = []) => {
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add all incident data fields
      Object.keys(incidentData).forEach(key => {
        if (key !== 'photos' && incidentData[key] !== null && incidentData[key] !== undefined) {
          if (typeof incidentData[key] === 'object' && !Array.isArray(incidentData[key])) {
            // If it's an object (like involved_parties), stringify it
            formData.append(key, JSON.stringify(incidentData[key]));
          } else if (Array.isArray(incidentData[key])) {
            // If it's an array, stringify it
            formData.append(key, JSON.stringify(incidentData[key]));
          } else {
            formData.append(key, String(incidentData[key]));
          }
        }
      });
      
      // Add photo files
      if (photoFiles && photoFiles.length > 0) {
        photoFiles.forEach((file) => {
          // If file is a File object, append it directly
          if (file instanceof File) {
            formData.append('photos', file);
          } else if (file.file) {
            // If it's an object with a file property
            formData.append('photos', file.file);
          }
        });
      }
      
      // Send FormData - don't set Content-Type, let browser set it automatically
      const response = await api.post('/incidents', formData);
      return response.data;
    } catch (error) {
      console.error('Error creating incident:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  },

  update: async (id, incidentData, photoFiles = [], existingPhotos = []) => {
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add all incident data fields
      Object.keys(incidentData).forEach(key => {
        if (key !== 'photos' && incidentData[key] !== null && incidentData[key] !== undefined) {
          if (typeof incidentData[key] === 'object' && !Array.isArray(incidentData[key])) {
            formData.append(key, JSON.stringify(incidentData[key]));
          } else if (Array.isArray(incidentData[key])) {
            formData.append(key, JSON.stringify(incidentData[key]));
          } else {
            formData.append(key, String(incidentData[key]));
          }
        }
      });
      
      // Add existing photos (photos that should be kept)
      if (existingPhotos && existingPhotos.length > 0) {
        formData.append('existing_photos', JSON.stringify(existingPhotos));
      }
      
      // Add new photo files
      if (photoFiles && photoFiles.length > 0) {
        photoFiles.forEach((file) => {
          if (file instanceof File) {
            formData.append('photos', file);
          } else if (file.file) {
            formData.append('photos', file.file);
          }
        });
      }
      
      // Send FormData - don't set Content-Type, let browser set it automatically
      const response = await api.put(`/incidents/${id}`, formData);
      return response.data;
    } catch (error) {
      console.error('Error updating incident:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  },

  updateReviewStatus: async (id, reviewStatus) => {
    try {
      const response = await api.patch(`/incidents/${id}/review-status`, { review_status: reviewStatus });
      return response.data;
    } catch (patchError) {
      const response = await api.put(`/incidents/${id}/review-status`, { review_status: reviewStatus });
      return response.data;
    }
  },

  delete: async (id) => {
    const response = await api.delete(`/incidents/${id}`);
    return response.data;
  },

  deletePhoto: async (incidentId, photoId) => {
    const response = await api.delete(`/incidents/${incidentId}/photos/${photoId}`);
    return response.data;
  },
};

// ==================== SPARE PARTS API ====================

export const sparePartsAPI = {
  getAll: async () => {
    const response = await api.get('/spare-parts');
    return response.data;
  },

  create: async (partData) => {
    const response = await api.post('/spare-parts', partData);
    return response.data;
  },

  update: async (id, partData) => {
    const response = await api.put(`/spare-parts/${id}`, partData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/spare-parts/${id}`);
    return response.data;
  },
};


// ==================== RIDE SCANS API ====================

export const rideScansAPI = {
  getAll: async () => {
    const response = await api.get('/ride-scans');
    return response.data;
  },

  create: async (scanData) => {
    const response = await api.post('/ride-scans', scanData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/ride-scans/${id}`);
    return response.data;
  },
};

// ==================== RIDE REPAIRS API ====================

export const rideRepairsAPI = {
  getAll: async () => {
    const response = await api.get('/ride-repairs');
    return response.data;
  },

  create: async (repairData) => {
    const response = await api.post('/ride-repairs', repairData);
    return response.data;
  },

  update: async (id, repairData) => {
    const response = await api.put(`/ride-repairs/${id}`, repairData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/ride-repairs/${id}`);
    return response.data;
  },
};

// ==================== PART DEPLOYMENTS API ====================

export const partDeploymentsAPI = {
  getAll: async () => {
    const response = await api.get('/part-deployments');
    return response.data;
  },

  create: async (deploymentData) => {
    const response = await api.post('/part-deployments', deploymentData);
    return response.data;
  },

  update: async (id, deploymentData) => {
    const response = await api.put(`/part-deployments/${id}`, deploymentData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/part-deployments/${id}`);
    return response.data;
  },
};

// ==================== PART REMOVALS API ====================

export const partRemovalsAPI = {
  getAll: async () => {
    const response = await api.get('/part-removals');
    return response.data;
  },

  create: async (removalData) => {
    const response = await api.post('/part-removals', removalData);
    return response.data;
  },

  update: async (id, removalData) => {
    const response = await api.put(`/part-removals/${id}`, removalData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/part-removals/${id}`);
    return response.data;
  },
};

export default api;


