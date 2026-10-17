import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Assessment as CounterIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { ridesAPI } from '../../services/api';

const RideCounters = () => {
  const [rides, setRides] = useState([]);
  const [counters, setCounters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadRideCounters = async () => {
    try {
      setLoading(true);
      setError('');
      
      const ridesData = await ridesAPI.getAll();
      const ridesList = ridesData || [];
      
      // Initialize counters for each ride (manual counting only)
      const rideCounters = {};
      ridesList.forEach(ride => {
        rideCounters[ride.name] = {
          total: 0, // Manual entries only
          today: 0,
          thisWeek: 0,
          status: ride.status || 'operational',
        };
      });
      
      setRides(ridesList);
      setCounters(rideCounters);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading ride counters:', err);
      setError('Failed to load ride counters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRideCounters();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadRideCounters, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'malfunction':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'maintenance':
        return 'Maintenance';
      case 'malfunction':
        return 'Malfunction';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <RefreshIcon onClick={loadRideCounters} style={{ cursor: 'pointer' }} />
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Ride Ticket Counters
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <RefreshIcon 
            onClick={loadRideCounters} 
            style={{ cursor: 'pointer' }}
            color="action"
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {rides.map((ride) => {
          const counter = counters[ride.name] || { total: 0, today: 0 };
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={ride.id}>
              <Card 
                elevation={3}
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {ride.name}
                    </Typography>
                    <Chip 
                      label={getStatusLabel(counter.status)}
                      color={getStatusColor(counter.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CounterIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Ticket Counter
                    </Typography>
                  </Box>

                  <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                    <Typography variant="h4" color="primary.main" fontWeight="bold" textAlign="center">
                      {counter.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Total Tickets
                    </Typography>
                  </Paper>

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body1" fontWeight="bold" color="success.main">
                        {counter.today}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Today
                      </Typography>
                    </Box>
                    <TrendingUpIcon color="success" fontSize="small" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {rides.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary">
            No rides found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add rides in the Ride Status module to see counters here.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default RideCounters;
