import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
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
  Slide,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  DateRange as DateIcon,
  Schedule as ScheduleIcon,
  Attractions as AttractionsIcon,
  Assessment as AssessmentIcon,
  AccessTime as AccessTimeIcon,
  PictureAsPdf as ReportIcon
} from '@mui/icons-material';
import { ridesAPI } from '../../services/api';
import rideEntriesAPI from '../../services/rideEntriesAPI';
import ReportGenerator from '../common/ReportGenerator';

const AdminCustomersCount = () => {
  const [rides, setRides] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [refreshing, setRefreshing] = useState(false);
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [selectedRide, setSelectedRide] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [rideSelectionModalOpen, setRideSelectionModalOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyFilterType, setHistoryFilterType] = useState('days');

  const loadCustomersCount = useCallback(async () => {
    try {
      setRefreshing(true);
      setError('');
      console.log('🚀 Starting loadCustomersCount...');
      
      // Get all rides
      console.log('📡 Fetching rides from API...');
      const ridesData = await ridesAPI.getAll();
      const ridesList = ridesData || [];
      console.log('🎠 All rides:', ridesList);
      setRides(ridesList);
      
      // Get all entries from database
      console.log('📊 Fetching all entries...');
      const entries = await rideEntriesAPI.getAll();
      console.log('📝 All entries:', entries);
      setAllEntries(entries);
      
      // Apply filters
      applyFilters(entries, ridesList, selectedRide, selectedDate);
      
      setLastUpdated(new Date());
      
      // Show success snackbar
      setSnackbar({
        open: true,
        message: 'Customers count loaded successfully!',
        severity: 'success'
      });
      
      console.log('✅ loadCustomersCount completed successfully!');
    } catch (err) {
      console.error('❌ Error loading customers count:', err);
      console.error('❌ Full error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status
      });
      
      setError('Failed to load customers count. Please ensure the backend API is running.');
      
      // Show error snackbar
      setSnackbar({
        open: true,
        message: 'Failed to load customers count. Backend API may not be available.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRide, selectedDate]);

  const applyFilters = (entries, ridesList, rideFilter, dateFilter) => {
    let filtered = [...entries];
    
    // Filter by ride
    if (rideFilter) {
      filtered = filtered.filter(entry => entry.ride_id === rideFilter);
    }
    
    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.entry_timestamp).toISOString().split('T')[0];
        return entryDate === dateFilter;
      });
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.entry_timestamp) - new Date(a.entry_timestamp));
    
    setFilteredEntries(filtered);
  };

  useEffect(() => {
    loadCustomersCount();
  }, [loadCustomersCount]);

  useEffect(() => {
    applyFilters(allEntries, rides, selectedRide, selectedDate);
  }, [selectedRide, selectedDate, allEntries, rides]);

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCloseDetailsDialog = () => {
    setViewDetailsDialogOpen(false);
    setSelectedEntry(null);
    setSnackbar({ ...snackbar, open: false });
  };

  const getRideName = (rideId) => {
    const ride = rides.find(r => r.id === rideId);
    return ride ? ride.name : 'Unknown Ride';
  };

  const getRideLocation = (rideId) => {
    const ride = rides.find(r => r.id === rideId);
    return ride ? (ride.location || '-') : '-';
  };

  const getTotalCustomers = () => {
    return filteredEntries.reduce((sum, entry) => sum + (entry.customer_count || 0), 0);
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
      const entryDate = new Date(entry.entry_timestamp);
      return entryDate >= startDate && entryDate <= now;
    }).sort((a, b) => new Date(b.entry_timestamp) - new Date(a.entry_timestamp));
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
          <Button onClick={loadCustomersCount} startIcon={<RefreshIcon />}>
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
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Button 
            onClick={loadCustomersCount} 
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
            variant="contained"
            startIcon={<ReportIcon />}
            onClick={() => setOpenReportDialog(true)}
            sx={{ ml: 2 }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<ScheduleIcon />}
            onClick={() => setHistoryDialogOpen(true)}
            sx={{ ml: 2 }}
          >
            History
          </Button>
        </Box>
      </Box>

      {/* Filters with Total Customers */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Total Customers
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {getTotalCustomers()}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setRideSelectionModalOpen(true)}
              sx={{ height: 56 }}
            >
              {selectedRide ? `${rides.find(r => r.id === selectedRide)?.name || 'Selected Ride'} (${rides.find(r => r.id === selectedRide)?.location || 'No location'})` : 'All Rides'}
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <DateIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Entries Table */}
      <Fade in={true} style={{ transitionDelay: '500ms' }}>
        <Paper elevation={6} sx={{ mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight="bold" mb={3}>
              Ride Entries ({filteredEntries.length})
            </Typography>
            {filteredEntries.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Typography variant="h6" color="text.secondary">
                  No entries found
                </Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
                  <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          py: 2,
                          borderBottom: '2px solid #e0e0e0'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <ScheduleIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                          Date
                        </Box>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          py: 2,
                          borderBottom: '2px solid #e0e0e0'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <AttractionsIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                          Ride
                        </Box>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          py: 2,
                          borderBottom: '2px solid #e0e0e0'
                        }}
                      >
                        Location
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          py: 2,
                          borderBottom: '2px solid #e0e0e0'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <PersonIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                          Personnel
                        </Box>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          py: 2,
                          borderBottom: '2px solid #e0e0e0'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <AssessmentIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                          Customers
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          py: 2,
                          borderBottom: '2px solid #e0e0e0'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <AccessTimeIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                          Entry Time
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id} hover>
                        <TableCell align="center">
                          {new Date(entry.entry_timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="bold">
                              {getRideName(entry.ride_id)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {getRideLocation(entry.ride_id)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={<PersonIcon />}
                            label={entry.personnel_name || 'Unknown'}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${entry.customer_count || 0} customers`}
                            color="primary"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {entry.entry_time ? new Date(`1970-01-01T${entry.entry_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--:--'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              </Box>
            )}
          </CardContent>
        </Paper>
      </Fade>

      {/* Entry Details Dialog */}
      <Dialog 
        open={viewDetailsDialogOpen} 
        onClose={handleCloseDetailsDialog}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Slide}
        transitionDuration={{ enter: 300, exit: 200 }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <InfoIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Entry Details
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton onClick={handleCloseDetailsDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Ride</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {getRideName(selectedEntry.ride_id)}
                </Typography>
              </Paper>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Personnel</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedEntry.personnel_name || 'Unknown'}
                </Typography>
              </Paper>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Customer Count</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedEntry.customer_count || 0} customers
                </Typography>
              </Paper>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Entry Time</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedEntry.entry_time || '--:--'}
                </Typography>
              </Paper>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Recorded At</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {new Date(selectedEntry.entry_timestamp).toLocaleString()}
                </Typography>
              </Paper>
              {selectedEntry.notes && (
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Notes</Typography>
                  <Typography variant="body1">
                    {selectedEntry.notes}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog} variant="contained">
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

        {/* Ride Selection Modal */}
        <Dialog 
          open={rideSelectionModalOpen} 
          onClose={() => setRideSelectionModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Select Ride</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              <Box
                onClick={() => {
                  setSelectedRide('');
                  setRideSelectionModalOpen(false);
                }}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: selectedRide === '' ? '2px solid' : '1px solid',
                  borderColor: selectedRide === '' ? 'primary.main' : 'divider',
                  backgroundColor: selectedRide === '' ? 'primary.50' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: selectedRide === '' ? 'primary.100' : 'action.hover',
                  },
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  All Rides
                </Typography>
              </Box>
              <Box 
                sx={{ 
                  maxHeight: 300, 
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  },
                }}
              >
                {rides.slice(0, 10).map((ride) => (
                  <Box
                    key={ride.id}
                    onClick={() => {
                      setSelectedRide(ride.id);
                      setRideSelectionModalOpen(false);
                    }}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: selectedRide === ride.id ? '2px solid' : '1px solid',
                      borderColor: selectedRide === ride.id ? 'primary.main' : 'divider',
                      backgroundColor: selectedRide === ride.id ? 'primary.50' : 'background.paper',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: selectedRide === ride.id ? 'primary.100' : 'action.hover',
                      },
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {ride.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ride.location || 'No location'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRideSelectionModalOpen(false)}>Close</Button>
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
              <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                <TableContainer component={Paper}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center">Date</TableCell>
                        <TableCell align="center">Ride</TableCell>
                        <TableCell align="center">Location</TableCell>
                        <TableCell align="center">Personnel</TableCell>
                        <TableCell align="center">Customers</TableCell>
                        <TableCell align="center">Entry Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getHistoryEntries().map((entry) => (
                        <TableRow key={entry.id} hover>
                          <TableCell align="center">
                            {new Date(entry.entry_timestamp).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="bold">
                              {getRideName(entry.ride_id)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {getRideLocation(entry.ride_id)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={<PersonIcon />}
                              label={entry.personnel_name || 'Unknown'}
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`${entry.customer_count || 0} customers`}
                              color="primary"
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {entry.entry_time ? new Date(`1970-01-01T${entry.entry_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--:--'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHistoryDialogOpen(false)} variant="contained">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <ReportGenerator
          open={openReportDialog}
          onClose={() => setOpenReportDialog(false)}
          data={allEntries}
          title="Customer Count Report"
          reportType="customers"
          columns={[
            { header: 'Date', field: 'entry_timestamp', render: (item) => new Date(item.entry_timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) },
            { header: 'Ride Name', field: 'ride_id', render: (item) => getRideName(item.ride_id) },
            { header: 'Location', field: 'ride_id', render: (item) => getRideLocation(item.ride_id) },
            { header: 'Personnel', field: 'personnel_name' },
            { header: 'Customer Count', field: 'customer_count' },
            { header: 'Entry Time', field: 'entry_time', render: (item) => item.entry_time ? new Date(`1970-01-01T${item.entry_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--:--' }
          ]}
        />
    </Box>
  );
};

export default AdminCustomersCount;
