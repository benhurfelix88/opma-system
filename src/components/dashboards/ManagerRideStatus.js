import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  FormControl,
  Select,
  MenuItem,
  Button,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Snackbar,
  Fade,
  Zoom,
  Slide,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Attractions as AttractionsIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import { ridesAPI, rideStatusAPI, sparePartsAPI } from '../../services/api';

const ManagerRideStatus = () => {
  const [rides, setRides] = useState([]);
  const [rideStatusMap, setRideStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [newRideName, setNewRideName] = useState('');
  const [newRideLocation, setNewRideLocation] = useState('');
  const [editingRide, setEditingRide] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rideToDelete, setRideToDelete] = useState(null);
  const [ridePartsCount, setRidePartsCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      setError('');
      
      const ridesData = await ridesAPI.getAll();
      const statuses = await rideStatusAPI.get();
      
      setRides(ridesData || []);
      setRideStatusMap(statuses || {});
      
      // Show success snackbar
      setSnackbar({
        open: true,
        message: 'Ride data refreshed successfully!',
        severity: 'success'
      });
    } catch (e) {
      console.error('Error loading ride data:', e);
      setError('Failed to load ride data');
      
      // Show error snackbar
      setSnackbar({
        open: true,
        message: 'Failed to load ride data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
        return 'Under Maintenance';
      case 'malfunction':
        return 'Malfunction';
      default:
        return status;
    }
  };

  const handleAddRide = async () => {
    if (!newRideName.trim()) {
      setError('Please enter a ride name');
      return;
    }

    try {
      await ridesAPI.create(newRideName.trim(), 'operational', newRideLocation.trim());
      setSuccess('Ride added successfully');
      setNewRideName('');
      setNewRideLocation('');
      setOpenAddDialog(false);
      await loadData();
    } catch (e) {
      console.error('Error adding ride:', e);
      setError('Failed to add ride');
    }
  };

  const handleUpdateRideStatus = async (rideId, newStatus) => {
    try {
      const ride = rides.find(r => r.id === rideId);
      if (ride) {
        await ridesAPI.update(rideId, ride.name, newStatus);
        setSuccess('Ride status updated successfully');
        await loadData();
      }
    } catch (e) {
      console.error('Error updating ride status:', e);
      setError('Failed to update ride status');
    }
  };

  const handleEditRide = async () => {
    if (!editingRide || !editingRide.name.trim()) {
      setError('Please enter a ride name');
      return;
    }

    try {
      const currentStatus = rideStatusMap[editingRide.id] || 'operational';
      await ridesAPI.update(editingRide.id, editingRide.name.trim(), currentStatus, editingRide.location || '');
      setSuccess('Ride updated successfully');
      setEditingRide(null);
      setOpenEditDialog(false);
      await loadData();
    } catch (e) {
      console.error('Error updating ride:', e);
      setError('Failed to update ride');
    }
  };

  const handleDeleteRide = async (rideId) => {
    const ride = rides.find(r => r.id === rideId);
    if (!ride) return;

    try {
      // Get ride parts count
      const allParts = await sparePartsAPI.getAll();
      const rideParts = allParts.filter(part => part.ride === ride.name);
      setRidePartsCount(rideParts.length);
      setRideToDelete(ride);
      setDeleteDialogOpen(true);
    } catch (e) {
      console.error('Error getting ride parts:', e);
      setError('Failed to get ride parts information');
    }
  };

  const confirmDeleteRide = async () => {
    if (!rideToDelete) return;

    try {
      await ridesAPI.delete(rideToDelete.id);
      setSuccess('Ride deleted successfully');
      setSnackbar({
        open: true,
        message: 'Ride deleted successfully',
        severity: 'success'
      });
      setDeleteDialogOpen(false);
      setRideToDelete(null);
      setRidePartsCount(0);
      await loadData();
    } catch (e) {
      console.error('Error deleting ride:', e);
      setError('Failed to delete ride');
      setSnackbar({
        open: true,
        message: 'Failed to delete ride',
        severity: 'error'
      });
    }
  };

  const cancelDeleteRide = () => {
    setDeleteDialogOpen(false);
    setRideToDelete(null);
    setRidePartsCount(0);
  };

  const handleViewRide = (ride) => {
    setSelectedRide(ride);
    setViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedRide(null);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const getStatusStats = () => {
    const operational = rides.filter(ride => rideStatusMap[ride.name] === 'operational').length;
    const maintenance = rides.filter(ride => rideStatusMap[ride.name] === 'maintenance').length;
    const malfunction = rides.filter(ride => rideStatusMap[ride.name] === 'malfunction').length;
    
    return { operational, maintenance, malfunction, total: rides.length };
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <DashboardLayout title="Ride Status Management">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Ride Status Management">
      <Box p={3}>
      <Box display="flex" justifyContent="flex-end" alignItems="center" mb={3}>
        <Box display="flex" gap={2}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setOpenAddDialog(true)}
          >
            Add
          </Button>
          <Button 
            variant="outlined" 
            startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
            onClick={loadData}
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
        </Box>
      </Box>

      {/* Status Summary */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Zoom in={true} style={{ transitionDelay: '100ms' }}>
            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {stats.operational}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Operational
              </Typography>
            </Paper>
          </Zoom>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Zoom in={true} style={{ transitionDelay: '200ms' }}>
            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {stats.maintenance}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Under Maintenance
              </Typography>
            </Paper>
          </Zoom>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Zoom in={true} style={{ transitionDelay: '300ms' }}>
            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                {stats.malfunction}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Malfunction
              </Typography>
            </Paper>
          </Zoom>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Zoom in={true} style={{ transitionDelay: '400ms' }}>
            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Rides
              </Typography>
            </Paper>
          </Zoom>
        </Grid>
      </Grid>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Rides Table */}
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center"><Typography fontWeight="bold">Ride Name</Typography></TableCell>
                <TableCell align="center"><Typography fontWeight="bold">Location</Typography></TableCell>
                <TableCell align="center"><Typography fontWeight="bold">Status</Typography></TableCell>
                <TableCell align="center"><Typography fontWeight="bold">Created</Typography></TableCell>
                <TableCell align="center"><Typography fontWeight="bold">Actions</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rides.map((ride, index) => (
                <Fade in={true} style={{ transitionDelay: `${index * 50 + 500}ms` }} key={ride.id}>
                  <TableRow 
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" gap={2} justifyContent="center">
                        <AttractionsIcon color="primary" />
                        <Typography variant="body1" fontWeight="medium">
                          {ride.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{ride.location || '-'}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                          value={rideStatusMap[ride.name] || 'operational'}
                          onChange={(e) => handleUpdateRideStatus(ride.id, e.target.value)}
                        >
                          <MenuItem value="operational">
                            <Chip label="Operational" variant="outlined" size="small" sx={{ color: 'green', borderColor: 'green', backgroundColor: 'transparent' }} />
                          </MenuItem>
                          <MenuItem value="maintenance">
                            <Chip label="Maintenance" variant="outlined" size="small" sx={{ color: 'orange', borderColor: 'orange', backgroundColor: 'transparent' }} />
                          </MenuItem>
                          <MenuItem value="malfunction">
                            <Chip label="Malfunction" variant="outlined" size="small" sx={{ color: 'red', borderColor: 'red', backgroundColor: 'transparent' }} />
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {new Date(ride.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewRide(ride)}
                            sx={{
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: 'info.main',
                                color: 'white',
                                transform: 'scale(1.1)',
                              }
                            }}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingRide(ride);
                              setOpenEditDialog(true);
                            }}
                            sx={{
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: 'warning.main',
                                color: 'white',
                                transform: 'scale(1.1)',
                              }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRide(ride.id)}
                            sx={{
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'scale(1.1)',
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                </Fade>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {rides.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary">
            No rides found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add your first ride to get started.
          </Typography>
        </Box>
      )}

      {/* Add Ride Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Ride</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Ride Name"
            fullWidth
            variant="outlined"
            value={newRideName}
            onChange={(e) => setNewRideName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Location"
            fullWidth
            variant="outlined"
            value={newRideLocation}
            onChange={(e) => setNewRideLocation(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddRide} variant="contained">Add Ride</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Ride Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Ride</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Ride Name"
            fullWidth
            variant="outlined"
            value={editingRide?.name || ''}
            onChange={(e) => setEditingRide({ ...editingRide, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Location"
            fullWidth
            variant="outlined"
            value={editingRide?.location || ''}
            onChange={(e) => setEditingRide({ ...editingRide, location: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditRide} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Ride Details Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
        TransitionComponent={Slide}
        transitionDuration={{ enter: 300, exit: 200 }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <InfoIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Ride Details: {selectedRide?.name}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton onClick={handleCloseViewDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRide && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                    Basic Information
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Ride Name
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedRide.name}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Current Status
                      </Typography>
                      <Chip 
                        label={getStatusLabel(rideStatusMap[selectedRide.name] || 'operational')}
                        variant="outlined"
                        size="small"
                        sx={{ 
                          color: getStatusColor(rideStatusMap[selectedRide.name] || 'operational') === 'success' ? 'green' : 
                                getStatusColor(rideStatusMap[selectedRide.name] || 'operational') === 'warning' ? 'orange' : 
                                getStatusColor(rideStatusMap[selectedRide.name] || 'operational') === 'error' ? 'red' : 'blue',
                          borderColor: getStatusColor(rideStatusMap[selectedRide.name] || 'operational') === 'success' ? 'green' : 
                                       getStatusColor(rideStatusMap[selectedRide.name] || 'operational') === 'warning' ? 'orange' : 
                                       getStatusColor(rideStatusMap[selectedRide.name] || 'operational') === 'error' ? 'red' : 'blue',
                          backgroundColor: 'transparent'
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Ride ID
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedRide.id}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                    Date & Time Information
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Date Created
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedRide.created_at ? new Date(selectedRide.created_at).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Time Created
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedRide.created_at ? new Date(selectedRide.created_at).toLocaleTimeString() : 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDeleteRide} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Delete Ride</DialogTitle>
        <DialogContent>
          {rideToDelete && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Are you sure you want to delete this ride? This action cannot be undone.
              </Alert>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Ride Name:</Typography>
                <Typography variant="body1" fontWeight="bold">{rideToDelete.name}</Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Current Status:</Typography>
                <Chip 
                  label={getStatusLabel(rideStatusMap[rideToDelete.name] || 'operational')}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    color: getStatusColor(rideStatusMap[rideToDelete.name] || 'operational') === 'success' ? 'green' : 
                          getStatusColor(rideStatusMap[rideToDelete.name] || 'operational') === 'warning' ? 'orange' : 
                          getStatusColor(rideStatusMap[rideToDelete.name] || 'operational') === 'error' ? 'red' : 'blue',
                    borderColor: getStatusColor(rideStatusMap[rideToDelete.name] || 'operational') === 'success' ? 'green' : 
                                 getStatusColor(rideStatusMap[rideToDelete.name] || 'operational') === 'warning' ? 'orange' : 
                                 getStatusColor(rideStatusMap[rideToDelete.name] || 'operational') === 'error' ? 'red' : 'blue',
                    backgroundColor: 'transparent'
                  }}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Associated Parts:</Typography>
                <Typography variant="body1" fontWeight="bold">{ridePartsCount} part(s)</Typography>
                {ridePartsCount > 0 && (
                  <Typography variant="caption" color="error">
                    Warning: Deleting this ride will affect {ridePartsCount} associated part(s).
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteRide}>Cancel</Button>
          <Button onClick={confirmDeleteRide} color="error" variant="contained">
            Delete Ride
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
    </DashboardLayout>
  );
};

export default ManagerRideStatus;
