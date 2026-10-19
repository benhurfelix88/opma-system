import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DashboardLayout from '../layout/DashboardLayout';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { maintenanceAPI, ridesAPI } from '../../services/api';

const VISIBLE_RIDE_LIMIT = 8;
const RIDE_LIST_ITEM_HEIGHT = 52;

const getRideStatusColor = (status) => {
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

const getRideStatusLabel = (status) => {
  switch (status) {
    case 'operational':
      return 'Operational';
    case 'maintenance':
      return 'Under Maintenance';
    case 'malfunction':
      return 'Malfunction';
    default:
      return status || 'Unknown';
  }
};

const EncoderMaintenanceReports = () => {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rideFilter, setRideFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [formData, setFormData] = useState({
    ride: '',
    date: new Date(),
    status: '',
    description: '',
    technician: '',
    location: '',
    nextMaintenance: null,
  });

  const [errors, setErrors] = useState({});
  const [availableRides, setAvailableRides] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    message: '',
    onConfirm: null,
  });
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [rideSelectionModalOpen, setRideSelectionModalOpen] = useState(false);

  const loadRidesFromManager = async () => {
    try {
      const rides = await ridesAPI.getAll();
      const list = (rides || []).map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status || 'operational',
      }));
      setAvailableRides(list);
      setFormData((prev) => {
        if (!prev.ride) return prev;
        const stillExists = list.some((r) => r.name === prev.ride);
        return stillExists ? prev : { ...prev, ride: '' };
      });
      setRideFilter((prev) => {
        if (prev === 'all') return prev;
        return list.some((r) => r.name === prev) ? prev : 'all';
      });
    } catch (e) {
      console.error('Error loading rides:', e);
      setAvailableRides([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await maintenanceAPI.getAll();
        
        if (!Array.isArray(rows)) {
          console.error('Expected array from maintenance API, got:', typeof rows, rows);
          setMaintenanceRecords([]);
          return;
        }
        
        const mapped = (rows || []).map(r => ({
          ...r,
          id: r.id,
          ride: r.ride_name || r.ride || '',
          date: r.date_performed || r.date || new Date().toISOString(),
          status: r.status || '',
          description: r.description || '',
          technician: r.performed_by || r.technician || '',
          location: r.location || '',
          nextMaintenance: r.next_maintenance_date || r.nextMaintenance || null,
        }));
        setMaintenanceRecords(mapped);
        await loadRidesFromManager();
      } catch (e) {
        console.error('Error loading maintenance data:', e);
        setMaintenanceRecords([]);
        setAvailableRides([]);
      }
    };
    load();
    const syncInterval = setInterval(loadRidesFromManager, 300000);
    return () => clearInterval(syncInterval);
  }, []);

  const handleOpenDialog = (record = null) => {
    if (record) {
      setSelectedRecord(record);
      setFormData({
        ride: record.ride,
        date: new Date(record.date),
        status: record.status,
        description: record.description,
        technician: record.technician,
        location: record.location || '',
        nextMaintenance: record.nextMaintenance ? new Date(record.nextMaintenance) : null,
      });
    } else {
      setSelectedRecord(null);
      setFormData({
        ride: '',
        date: new Date(),
        status: '',
        description: '',
        technician: '',
        location: '',
        nextMaintenance: null,
      });
    }
    setOpenDialog(true);
  };

  const handleOpenViewDialog = (record) => {
    setViewRecord(record);
    setOpenViewDialog(true);
  };

  const truncateText = (text, wordLimit = 5) => {
    if (!text) return 'No description';
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRecord(null);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.ride) newErrors.ride = 'Ride is required';
    if (!formData.status) newErrors.status = 'Status is required';
    if (!formData.technician) newErrors.technician = 'Technician is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      // Build payload to match backend schema
      const payload = {
        ride_name: formData.ride,
        maintenance_type: inferMaintenanceType(formData.description),
        description: formData.description,
        date_performed: formData.date.toISOString().slice(0, 10),
        next_maintenance_date: formData.nextMaintenance ? formData.nextMaintenance.toISOString().slice(0, 10) : null,
        status: formData.status,
        performed_by: String(formData.technician || '').trim(),
        location: formData.location || '',
      };

      if (selectedRecord) {
        await maintenanceAPI.update(selectedRecord.id, payload);
        setSnackbar({ open: true, message: 'Maintenance record updated successfully', severity: 'success' });
      } else {
        await maintenanceAPI.create(payload);
        setSnackbar({ open: true, message: 'Maintenance record added successfully', severity: 'success' });
      }

      // Reload data to ensure we have the latest
      const rows = await maintenanceAPI.getAll();
      
      if (!Array.isArray(rows)) {
        console.error('Expected array from maintenance API, got:', typeof rows, rows);
        setSnackbar({ open: true, message: 'Error: Invalid data format from server', severity: 'error' });
        return;
      }
      
      const mapped = (rows || []).map(r => ({
        ...r,
        id: r.id,
        ride: r.ride_name || r.ride || '',
        date: r.date_performed || r.date || new Date().toISOString(),
        status: r.status || '',
        description: r.description || '',
        technician: r.performed_by || r.technician || '',
        location: r.location || '',
        nextMaintenance: r.next_maintenance_date || r.nextMaintenance || null,
      }));
      setMaintenanceRecords(mapped);
      handleCloseDialog();
    } catch (e) {
      console.error('Error saving maintenance record:', e);
      
      const errorMessage = e.response?.data?.error || e.response?.data?.message || e.message || 'Failed to save maintenance record';
      setSnackbar({ open: true, message: `Error: ${errorMessage}`, severity: 'error' });
    }
  };

  const closeDeleteDialog = () => {
    setDeleteDialog(prev => ({ ...prev, open: false, message: '', onConfirm: null }));
  };

  const handleDelete = (id) => {
    const recordToDelete = maintenanceRecords.find(r => r.id === id);
    const recordDate = recordToDelete?.date ? new Date(recordToDelete.date).toLocaleDateString() : 'N/A';
    setDeleteDialog({
      open: true,
      message: `Are you sure you want to delete this maintenance record?\n\nRide: ${recordToDelete?.ride || 'N/A'}\nDate: ${recordDate}\nStatus: ${recordToDelete?.status || 'N/A'}\nTechnician: ${recordToDelete?.technician || 'N/A'}`,
      onConfirm: async () => {
        try {
          await maintenanceAPI.delete(id);
          const rows = await maintenanceAPI.getAll();
          const mapped = (rows || []).map(r => ({
            ...r,
            id: r.id,
            ride: r.ride_name || r.ride || '',
            date: r.date_performed || r.date || new Date().toISOString(),
            status: r.status || '',
            description: r.description || '',
            technician: r.performed_by || r.technician || '',
            nextMaintenance: r.next_maintenance_date || r.nextMaintenance || null,
          }));
          setMaintenanceRecords(mapped);
          setSnackbar({ open: true, message: 'Maintenance record deleted', severity: 'success' });
        } catch (e) {
          console.error('Error deleting maintenance record:', e);
          setSnackbar({ open: true, message: 'Failed to delete maintenance record', severity: 'error' });
        } finally {
          closeDeleteDialog();
        }
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled':
        return 'info';
      case 'In Progress':
        return 'warning';
      case 'Completed':
        return 'success';
      case 'Overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const normalizedValue = (value) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') return value;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.getTime();
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
    return String(value).toLowerCase();
  };

  const filteredAndSortedRecords = maintenanceRecords
    .filter((record) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return [
        record.ride,
        record.status,
        record.technician,
        record.description,
      ]
        .map((v) => (v || '').toString().toLowerCase())
        .some((v) => v.includes(q));
    })
    .filter((record) => {
      // Status filter
      if (statusFilter === 'all') return true;
      return record.status === statusFilter;
    })
    .filter((record) => {
      // Ride filter
      if (rideFilter === 'all') return true;
      return record.ride === rideFilter;
    })
    .sort((a, b) => {
      // Always sort by date since we removed sortBy option
      const aVal = normalizedValue(a.date);
      const bVal = normalizedValue(b.date);
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  function inferMaintenanceType(description) {
    const d = (description || '').toLowerCase();
    if (d.includes('emergency')) return 'Emergency';
    if (d.includes('prevent')) return 'Preventive';
    if (d.includes('routine')) return 'Routine';
    return 'Routine';
  }

  return (
    <DashboardLayout title="Maintenance Reports">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search maintenance..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Order</InputLabel>
              <Select
                label="Order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="Scheduled">Scheduled</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setRideSelectionModalOpen(true)}
              sx={{
                minWidth: 140,
                height: 40,
                display: 'flex',
                justifyContent: 'space-between',
                px: 2,
                textTransform: 'none',
                borderColor: 'rgba(0, 0, 0, 0.23)',
                '&:hover': {
                  borderColor: 'rgba(0, 0, 0, 0.87)',
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <Typography variant="body2" sx={{ flexGrow: 1, textAlign: 'left' }}>
                {rideFilter === 'all' ? 'All Rides' : rideFilter}
              </Typography>
              <Typography variant="body2">▼</Typography>
            </Button>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add
          </Button>
        </Box>

        <Paper sx={{ p: 2 }}>
          <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f3f0f7' }}>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Date Recorded</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Ride</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Maintenance Schedule</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Description</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Technician</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Location</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body1" color="text.secondary">
                      No maintenance records found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell align="center">{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell align="center">{record.ride}</TableCell>
                  <TableCell align="center">
                    {record.nextMaintenance
                      ? new Date(record.nextMaintenance).toLocaleDateString()
                      : 'Not scheduled'}
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      sx={{
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}
                      title={record.description || 'No description'}
                    >
                      {truncateText(record.description)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{record.technician}</TableCell>
                  <TableCell align="center">{record.location || '-'}</TableCell>
                  <TableCell align="center">
                      <Chip
                        label={record.status}
                        variant="outlined"
                        size="small"
                        sx={{
                          color: getStatusColor(record.status) === 'success' ? 'green' :
                                getStatusColor(record.status) === 'warning' ? 'orange' :
                                getStatusColor(record.status) === 'error' ? 'red' :
                                getStatusColor(record.status) === 'info' ? 'blue' : 'gray',
                          borderColor: getStatusColor(record.status) === 'success' ? 'green' :
                                       getStatusColor(record.status) === 'warning' ? 'orange' :
                                       getStatusColor(record.status) === 'error' ? 'red' :
                                       getStatusColor(record.status) === 'info' ? 'blue' : 'gray',
                          backgroundColor: 'transparent'
                        }}
                      />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenViewDialog(record)}
                        sx={{
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: 'info.main',
                            color: 'white',
                            transform: 'scale(1.1)',
                          },
                        }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={record.status === 'Completed' ? 'Cannot edit completed maintenance records' : 'Edit'}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(record)}
                        disabled={record.status === 'Completed'}
                        sx={{
                          opacity: record.status === 'Completed' ? 0.5 : 1,
                          cursor: record.status === 'Completed' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(record.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onClose={closeDeleteDialog}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
              {deleteDialog.message}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog}>Cancel</Button>
            <Button
              onClick={async () => {
                if (deleteDialog.onConfirm) {
                  await deleteDialog.onConfirm();
                }
              }}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedRecord ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                {selectedRecord ? (
                  <TextField
                    fullWidth
                    label="Ride"
                    value={formData.ride}
                    InputProps={{ readOnly: true }}
                    sx={{ '& .MuiInputBase-root': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                  />
                ) : (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Select Ride *
                    </Typography>
                    {errors.ride && (
                      <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
                        {errors.ride}
                      </Typography>
                    )}
                    <Paper
                      variant="outlined"
                      sx={{
                        maxHeight: VISIBLE_RIDE_LIMIT * RIDE_LIST_ITEM_HEIGHT,
                        overflowY: 'auto',
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          borderRadius: 3,
                        },
                      }}
                    >
                      {availableRides.length > 0 ? (
                        <List dense disablePadding>
                          {availableRides.map((ride) => (
                            <ListItem
                              key={ride.id}
                              button
                              selected={formData.ride === ride.name}
                              onClick={() => {
                                setFormData({ ...formData, ride: ride.name });
                                if (errors.ride) {
                                  setErrors((prev) => ({ ...prev, ride: undefined }));
                                }
                              }}
                              sx={{
                                minHeight: RIDE_LIST_ITEM_HEIGHT,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&.Mui-selected': {
                                  bgcolor: 'primary.lighter',
                                },
                              }}
                            >
                              <ListItemText
                                primary={ride.name}
                                primaryTypographyProps={{ noWrap: true, fontWeight: formData.ride === ride.name ? 600 : 400 }}
                              />
                              <Chip
                                size="small"
                                label={getRideStatusLabel(ride.status)}
                                color={getRideStatusColor(ride.status)}
                                variant="outlined"
                                sx={{ flexShrink: 0, ml: 1 }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            No rides available. Ask a manager to add rides in Ride Status.
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                    {formData.ride && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Selected: {formData.ride}
                      </Typography>
                    )}
                  </Box>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date Recorded"
                    value={formData.date}
                    onChange={(newValue) => setFormData({ ...formData, date: newValue })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!errors.status}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="Scheduled">Scheduled</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    {selectedRecord && <MenuItem value="Overdue">Overdue</MenuItem>}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Technician"
                  value={formData.technician}
                  onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                  error={!!errors.technician}
                  helperText={errors.technician}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Maintenance Schedule"
                    value={formData.nextMaintenance}
                    onChange={(newValue) => setFormData({ ...formData, nextMaintenance: newValue })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {selectedRecord ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Record Dialog */}
        <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Maintenance Record Details</DialogTitle>
          <DialogContent>
            {viewRecord && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Typography><strong>Ride:</strong> {viewRecord.ride}</Typography>
                <Typography><strong>Date Recorded:</strong> {new Date(viewRecord.date).toLocaleString()}</Typography>
                <Typography><strong>Status:</strong>
                  <Chip
                    label={viewRecord.status}
                    variant="outlined"
                    size="small"
                    sx={{
                      ml: 1,
                      color: getStatusColor(viewRecord.status) === 'success' ? 'green' :
                            getStatusColor(viewRecord.status) === 'warning' ? 'orange' :
                            getStatusColor(viewRecord.status) === 'error' ? 'red' :
                            getStatusColor(viewRecord.status) === 'info' ? 'blue' : 'gray',
                      borderColor: getStatusColor(viewRecord.status) === 'success' ? 'green' :
                                   getStatusColor(viewRecord.status) === 'warning' ? 'orange' :
                                   getStatusColor(viewRecord.status) === 'error' ? 'red' :
                                   getStatusColor(viewRecord.status) === 'info' ? 'blue' : 'gray',
                      backgroundColor: 'transparent'
                    }}
                  />
                </Typography>
                <Typography><strong>Technician:</strong> {viewRecord.technician}</Typography>
                <Typography><strong>Location:</strong> {viewRecord.location || 'Not specified'}</Typography>
                <Typography><strong>Description:</strong></Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">
                    {viewRecord.description || 'No description provided'}
                  </Typography>
                </Paper>
                <Typography><strong>Maintenance Schedule:</strong>
                  {viewRecord.nextMaintenance
                    ? new Date(viewRecord.nextMaintenance).toLocaleDateString()
                    : ' Not scheduled'}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Ride Selection Modal */}
        <Dialog open={rideSelectionModalOpen} onClose={() => setRideSelectionModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Select Ride</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              <Box
                onClick={() => {
                  setRideFilter('all');
                  setRideSelectionModalOpen(false);
                }}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: rideFilter === 'all' ? '2px solid' : '1px solid',
                  borderColor: rideFilter === 'all' ? 'primary.main' : 'divider',
                  backgroundColor: rideFilter === 'all' ? 'primary.50' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: rideFilter === 'all' ? 'primary.100' : 'action.hover',
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
                {availableRides.map((ride) => (
                  <Box
                    key={ride.id}
                    onClick={() => {
                      setRideFilter(ride.name);
                      setRideSelectionModalOpen(false);
                    }}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: rideFilter === ride.name ? '2px solid' : '1px solid',
                      borderColor: rideFilter === ride.name ? 'primary.main' : 'divider',
                      backgroundColor: rideFilter === ride.name ? 'primary.50' : 'background.paper',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: rideFilter === ride.name ? 'primary.100' : 'action.hover',
                      },
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {ride.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRideSelectionModalOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default EncoderMaintenanceReports;
