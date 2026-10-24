import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { authAPI } from '../../services/api';

const PrivateRoute = ({ children, allowedRoles }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('authToken');
      const storedUser = sessionStorage.getItem('currentUser');

      if (!token && !storedUser) {
        setLoading(false);
        return;
      }

      // If token exists, verify it with the backend
      if (token) {
        try {
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
        } catch (error) {
          // Token invalid, clear storage
          sessionStorage.removeItem('authToken');
          sessionStorage.removeItem('currentUser');
        }
      } else if (storedUser) {
        // Fallback to stored user if no token (for migration period)
        setUser(JSON.parse(storedUser));
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

export default PrivateRoute; 