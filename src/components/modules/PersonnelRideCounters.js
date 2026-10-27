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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Snackbar,
  Fade,
  Zoom,
  Slide,
  List,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { ridesAPI } from '../../services/api';
import rideEntriesAPI from '../../services/rideEntriesAPI';

const PersonnelRideCounters = () => {
  const [rides, setRides] = useState([]);
  const [counters, setCounters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyFilterType, setHistoryFilterType] = useState('days');
  const [allEntries, setAllEntries] = useState([]);

  // Manual entry states
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [customerCount, setCustomerCount] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [todayEntries, setTodayEntries] = useState([]);
  const [viewEntriesDialogOpen, setViewEntriesDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const loadRideCounters = async () => {
    try {
      setRefreshing(true);
      setError('');
      console.log('🚀 Starting loadRideCounters...');
      
      // Get current user and check assigned ride
      const user = JSON.parse(sessionStorage.getItem('currentUser'));
      console.log('👤 Current user:', user);
      setCurrentUser(user);

      if (!user) {
        console.error('❌ No user found in sessionStorage');
        setError('User not authenticated');
        return;
      }
      
      if (!user.assignedRide) {
        console.error('❌ No assigned ride for user:', user);
        setError('No ride assigned to you. Please contact your administrator.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      console.log('🎢 Assigned ride:', user.assignedRide);
      
      // Get all rides
      console.log('📡 Fetching rides from API...');
      const ridesData = await ridesAPI.getAll();
      const ridesList = ridesData || [];
      console.log('🎠 All rides:', ridesList);
      
      // Filter to only show assigned ride
      const assignedRide = ridesList.find(ride => ride.id === user.assignedRide.id);
      console.log('✅ Found assigned ride:', assignedRide);
      
      if (!assignedRide) {
        console.error('❌ Assigned ride not found in system:', user.assignedRide);
        setError(`Assigned ride "${user.assignedRide.name}" not found in system.`);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Only use the assigned ride
      const filteredRides = [assignedRide];
      
      // Get today's entries from database only
      console.log('📊 Fetching today entries for ride:', assignedRide.id);
      const todayEntries = await rideEntriesAPI.getTodayEntries(assignedRide.id);
      console.log('📝 Today entries:', todayEntries);

      // Get all entries for history
      console.log('📊 Fetching all entries for ride:', assignedRide.id);
      const allEntriesData = await rideEntriesAPI.getEntriesByRide(assignedRide.id);
      console.log('📝 All entries:', allEntriesData);
      setAllEntries(allEntriesData || []);
      
      // Map database fields for display
      const mappedEntries = todayEntries.map(entry => {
        // Format entry date to ensure it's just YYYY-MM-DD
        let formattedDate = entry.entry_date || entry.entryDate || '';
        if (formattedDate && typeof formattedDate === 'string' && formattedDate.includes('T')) {
          formattedDate = formattedDate.split('T')[0];
        } else if (formattedDate instanceof Date) {
          formattedDate = formattedDate.toISOString().split('T')[0];
        }
        
        return {
          rideName: entry.ride_name || entry.rideName || '',
          customerCount: entry.customer_count || entry.customerCount || 0,
          entryTime: entry.entry_time || entry.entryTime || '',
          entryDate: formattedDate,
          entryType: entry.entry_type || entry.entryType || 'manual',
          entryTimestamp: entry.entry_timestamp || entry.entryTimestamp || new Date()
        };
      });
      console.log('🔄 Mapped entries for report:', mappedEntries);
      
      // Calculate counters for each ride using mapped entries
      const rideCounters = {};
      filteredRides.forEach(ride => {
        const todaysEntries = mappedEntries.filter(entry => entry.rideName === ride.name);
        const manualCount = todaysEntries.reduce((sum, entry) => sum + (entry.customerCount || 0), 0);
        
        rideCounters[ride.name] = {
          total: manualCount,
          today: manualCount,
          status: ride.status || 'operational',
          manualCount: manualCount,
        };
      });
      
      console.log('🔢 Calculated counters:', rideCounters);
      
      setRides(filteredRides);
      setCounters(rideCounters);
      setLastUpdated(new Date());
      setTodayEntries(mappedEntries);
      
      // Show success snackbar
      setSnackbar({
        open: true,
        message: `Loaded ${assignedRide.name} counter successfully!`,
        severity: 'success'
      });
      
      console.log('✅ loadRideCounters completed successfully!');
    } catch (err) {
      console.error('❌ Error loading ride counters:', err);
      console.error('❌ Full error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status
      });
      
      setError('Failed to load ride counters. Please ensure the backend API is running.');
      
      // Show error snackbar
      setSnackbar({
        open: true,
        message: 'Failed to load ride counters. Backend API may not be available.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRideCounters();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadRideCounters, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const formatSafeDate = (timestamp) => {
    if (!timestamp) return 'No entries';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatSafeTime = (timestamp) => {
    if (!timestamp) return '--:--';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      return '--:--';
    }
  };

  const handleOpenEntryDialog = (ride) => {
    setSelectedRide(ride);
    setCustomerCount('');
    setEntryTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    setEditingEntry(null);
    setEntryDialogOpen(true);
  };

  const handleCloseEntryDialog = () => {
    setEntryDialogOpen(false);
    setSelectedRide(null);
    setCustomerCount('');
    setEntryTime('');
    setEditingEntry(null);
  };

  const handleSaveEntry = async () => {
    if (!selectedRide || !customerCount || parseInt(customerCount) <= 0) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid customer count',
        severity: 'error'
      });
      return;
    }

    try {
      const entryData = {
        rideId: selectedRide.id,
        rideName: selectedRide.name,
        customerCount: parseInt(customerCount),
        entryTime: entryTime || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        entryDate: new Date().toISOString().split('T')[0],
        entryType: 'manual',
        notes: editingEntry ? editingEntry.notes : ''
      };

      if (editingEntry) {
        // Update existing entry
        await rideEntriesAPI.update(editingEntry.id, entryData);
        setSnackbar({
          open: true,
          message: 'Entry updated successfully!',
          severity: 'success'
        });
      } else {
        // Add new entry
        await rideEntriesAPI.create(entryData);
        setSnackbar({
          open: true,
          message: `${customerCount} customers added to ${selectedRide.name}!`,
          severity: 'success'
        });
      }

      handleCloseEntryDialog();
      loadRideCounters(); // Refresh counters
    } catch (error) {
      console.error('Error saving entry to database:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save entry. Please ensure backend is running.',
        severity: 'error'
      });
    }
  };

  const handleOpenViewEntriesDialog = () => {
    setViewEntriesDialogOpen(true);
  };

  const getHistoryEntries = () => {
    const now = new Date();
    let startDate = new Date();

    switch (historyFilterType) {
      case 'days':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'weeks':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    return allEntries.filter(entry => {
      const entryDate = new Date(entry.entry_timestamp || entry.entryTimestamp);
      return entryDate >= startDate && entryDate <= now;
    }).sort((a, b) => new Date(b.entry_timestamp || b.entryTimestamp) - new Date(a.entry_timestamp || a.entryTimestamp));
  };

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

  const isRideOperational = (ride) => {
    const status = ride?.status || 'operational';
    return status === 'operational';
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
          <Button onClick={loadRideCounters} startIcon={<RefreshIcon />}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {rides.length > 0 ? `${rides[0].name} Counter` : 'Ride Counter'}
          </Typography>
          {rides.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {rides[0].location || 'Not specified'}
            </Typography>
          )}
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Button 
            onClick={loadRideCounters} 
            startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
            variant="outlined"
            size="small"
            disabled={refreshing}
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: refreshing ? 'none' : 'scale(1.05)',
              },
              '&.Mui-disabled': {
                opacity: 0.7,
              }
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            onClick={handleOpenViewEntriesDialog}
            variant="contained"
            size="small"
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            Today's Entries
          </Button>
          <Button
            onClick={() => setHistoryDialogOpen(true)}
            variant="contained"
            startIcon={<ScheduleIcon />}
            size="small"
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            History
          </Button>
        </Box>
      </Box>

      {/* Summary Card */}
      <Zoom in={true} style={{ transitionDelay: '200ms' }}>
        <Paper elevation={3} sx={{ p: 3, mb:4 }}>
          {rides.length > 0 ? (
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box textAlign="center">
                  <Typography variant="h3" fontWeight="bold">
                    {counters[rides[0].name]?.total || 0}
                  </Typography>
                  <Typography variant="body1">
                    Total Customers Today
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box textAlign="center">
                  <Typography variant="h4" fontWeight="bold">
                    {todayEntries.length}
                  </Typography>
                  <Typography variant="body1">
                    Manual Entry Records
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Box textAlign="center">
              <Typography variant="h6">
                No ride data available
              </Typography>
            </Box>
          )}
        </Paper>
      </Zoom>

      {/* Single Ride Counter */}
      {rides.length > 0 && (
        <Fade in={true} style={{ transitionDelay: '400ms' }}>
          <Card
            elevation={6}
            sx={{
              mb: 4,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 8,
              },
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {rides[0].name}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={getStatusLabel(counters[rides[0].name]?.status || 'operational')}
                    color={getStatusColor(counters[rides[0].name]?.status || 'operational')}
                    size="medium"
                  />
                </Box>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
                    <Typography variant="h4" color="info.main" fontWeight="bold">
                      {formatSafeDate(todayEntries.length > 0 ? todayEntries[0].entryTimestamp : null)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Latest Entry Date
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
                    <Typography variant="h4" color="success.main" fontWeight="bold">
                      {formatSafeTime(todayEntries.length > 0 ? todayEntries[0].entryTimestamp : null)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Latest Entry Time
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box display="flex" justifyContent="center" mt={4}>
                <Button 
                  variant="contained" 
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenEntryDialog(rides[0])}
                  disabled={!isRideOperational(rides[0])}
                  sx={{
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: !isRideOperational(rides[0]) ? 'none' : 'scale(1.05)',
                      boxShadow: !isRideOperational(rides[0]) ? 'none' : 4,
                    },
                    '&.Mui-disabled': {
                      backgroundColor: 'grey.300',
                      color: 'grey.500',
                    }
                  }}
                >
                  Add Entry
                </Button>
              </Box>
              {!isRideOperational(rides[0]) && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Alert 
                    severity="warning" 
                    icon={<WarningIcon />}
                    sx={{ width: '100%', maxWidth: 500 }}
                  >
                    Cannot add entries while ride is in {getStatusLabel(rides[0].status)}. Please wait until the ride is operational.
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>
        </Fade>
      )}

      {rides.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary">
            No Assigned Ride
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error || 'Contact your administrator to get assigned to a ride.'}
          </Typography>
        </Box>
      )}

      {/* Manual Entry Dialog */}
      <Dialog 
        open={entryDialogOpen} 
        onClose={handleCloseEntryDialog}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Slide}
        transitionDuration={{ enter: 300, exit: 200 }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <PersonAddIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              {editingEntry ? 'Edit Entry' : 'Add Manual Entry'} - {selectedRide?.name}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton onClick={handleCloseEntryDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} pt={1}>
            <TextField
              label="Number of Customers"
              type="number"
              fullWidth
              value={customerCount}
              onChange={(e) => setCustomerCount(e.target.value)}
              inputProps={{ min: 1, max: 999 }}
              helperText="Enter the number of customers who used this ride"
            />
            <TextField
              label="Entry Time"
              type="time"
              fullWidth
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              helperText="When did these customers use the ride?"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEntryDialog}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEntry} 
            variant="contained"
            disabled={!customerCount || parseInt(customerCount) <= 0}
          >
            {editingEntry ? 'Update Entry' : 'Add Entry'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Entries Dialog */}
      <Dialog 
        open={viewEntriesDialogOpen} 
        onClose={() => setViewEntriesDialogOpen(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Slide}
        transitionDuration={{ enter: 300, exit: 200 }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <InfoIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Today's Manual Entries
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton onClick={() => setViewEntriesDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {todayEntries.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No manual entries for today
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click the + button on any ride to add entries.
              </Typography>
            </Box>
          ) : (
            <List>
              {todayEntries
                .sort((a, b) => new Date(b.entryTimestamp) - new Date(a.entryTimestamp))
                .map((entry) => (
                  <Paper key={entry.id} elevation={2} sx={{ mb: 2, p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                          <Typography variant="body1" fontWeight="bold">
                            {entry.rideName}
                          </Typography>
                          <Chip
                            label={`${entry.customerCount} customers`}
                            color="primary"
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Added at {formatSafeDate(entry.entryTimestamp)} {formatSafeTime(entry.entryTimestamp)}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label={getStatusLabel(counters[entry.rideName]?.status || 'operational')}
                          color={getStatusColor(counters[entry.rideName]?.status || 'operational')}
                          size="medium"
                        />
                      </Box>
                    </Box>
                  </Paper>
                ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewEntriesDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        TransitionComponent={Slide}
        transitionDuration={{ enter: 300, exit: 200 }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <ScheduleIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Entry History
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton onClick={() => setHistoryDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mb={3}>
            <Button
              variant={historyFilterType === 'days' ? 'contained' : 'outlined'}
              onClick={() => setHistoryFilterType('days')}
              size="small"
            >
              Last 7 Days
            </Button>
            <Button
              variant={historyFilterType === 'weeks' ? 'contained' : 'outlined'}
              onClick={() => setHistoryFilterType('weeks')}
              size="small"
            >
              Last 30 Days
            </Button>
            <Button
              variant={historyFilterType === 'months' ? 'contained' : 'outlined'}
              onClick={() => setHistoryFilterType('months')}
              size="small"
            >
              Last 6 Months
            </Button>
          </Box>
          {getHistoryEntries().length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No entries found for the selected period
              </Typography>
            </Box>
          ) : (
            <List>
              {getHistoryEntries().map((entry) => (
                <Paper key={entry.id} elevation={2} sx={{ mb: 2, p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={2} mb={1}>
                        <Typography variant="body1" fontWeight="bold">
                          {entry.ride_name || entry.rideName}
                        </Typography>
                        <Chip
                          label={`${entry.customer_count || entry.customerCount} customers`}
                          color="primary"
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Added at {formatSafeDate(entry.entry_timestamp || entry.entryTimestamp)} {formatSafeTime(entry.entry_timestamp || entry.entryTimestamp)}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={getStatusLabel(counters[entry.ride_name || entry.rideName]?.status || 'operational')}
                        color={getStatusColor(counters[entry.ride_name || entry.rideName]?.status || 'operational')}
                        size="medium"
                      />
                    </Box>
                  </Box>
                </Paper>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        TransitionComponent={Slide}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PersonnelRideCounters;
