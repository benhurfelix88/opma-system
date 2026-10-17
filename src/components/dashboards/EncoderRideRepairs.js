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
  MenuItem,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Alert,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

import DashboardLayout from '../layout/DashboardLayout';
import { rideRepairsAPI, ridesAPI } from '../../services/api';

const EncoderRideRepairs = () => {
  const [repairs, setRepairs] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [rides, setRides] = useState([]);
  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningAction, setWarningAction] = useState(() => () => {});
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [repairData, setRepairData] = useState({
    ride: '',
    date: '',
    issue: '',
    partsReplaced: '',
    cost: '',
    technician: '',
    status: 'In Progress',
    notes: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load rides from API
        const ridesList = await ridesAPI.getAll();
        setRides(ridesList.map(r => r.name));
        
        // Load repairs from API
        const repairsList = await rideRepairsAPI.getAll();
        // Map database fields to component fields
        const mappedRepairs = repairsList.map(repair => ({
          id: repair.id,
          ride: repair.ride,
          date: repair.date,
          issue: repair.issue,
          partsReplaced: repair.parts_replaced || '',
          cost: repair.cost || 0,
          technician: repair.technician,
          status: repair.status,
          notes: repair.notes || '',
          timestamp: repair.created_at || new Date().toISOString(),
        }));
        setRepairs(mappedRepairs);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const handleOpenDialog = (repair = null) => {
    if (repair) {
      setSelectedRepair(repair);
      setRepairData({
        ride: repair.ride,
        date: repair.date,
        issue: repair.issue,
        partsReplaced: repair.partsReplaced || '',
        cost: repair.cost || '',
        technician: repair.technician,
        status: repair.status,
        notes: repair.notes || '',
      });
    } else {
      setSelectedRepair(null);
      setRepairData({
        ride: '',
        date: '',
        issue: '',
        partsReplaced: '',
        cost: '',
        technician: '',
        status: 'In Progress',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRepair(null);
    setRepairData({
      ride: '',
      date: '',
      issue: '',
      partsReplaced: '',
      cost: '',
      technician: '',
      status: 'In Progress',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!repairData.ride || !repairData.date || !repairData.issue || !repairData.technician) {
      setWarningMessage('Please fill in all required fields.');
      setWarningAction(() => () => {
        setOpenWarningModal(false);
      });
      setOpenWarningModal(true);
      return;
    }

    try {
      const repairPayload = {
        ride: repairData.ride,
        date: repairData.date,
        issue: repairData.issue,
        parts_replaced: repairData.partsReplaced || null,
        cost: Number(repairData.cost) || 0,
        technician: repairData.technician,
        status: repairData.status,
        notes: repairData.notes || null,
      };

      if (selectedRepair) {
        // Update existing repair
        await rideRepairsAPI.update(selectedRepair.id, repairPayload);
      } else {
        // Create new repair
        await rideRepairsAPI.create(repairPayload);
      }

      // Reload repairs from API
      const repairsList = await rideRepairsAPI.getAll();
      const mappedRepairs = repairsList.map(repair => ({
        id: repair.id,
        ride: repair.ride,
        date: repair.date,
        issue: repair.issue,
        partsReplaced: repair.parts_replaced || '',
        cost: repair.cost || 0,
        technician: repair.technician,
        status: repair.status,
        notes: repair.notes || '',
        timestamp: repair.created_at || new Date().toISOString(),
      }));
      setRepairs(mappedRepairs);
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving repair:', error);
      setWarningMessage('Failed to save repair. Please try again.');
      setWarningAction(() => () => {
        setOpenWarningModal(false);
      });
      setOpenWarningModal(true);
    }
  };

  const handleDelete = (id) => {
    setWarningMessage('Are you sure you want to delete this repair record?');
    setWarningAction(async () => {
      try {
        await rideRepairsAPI.delete(id);

        // Reload repairs from API
        const repairsList = await rideRepairsAPI.getAll();
        const mappedRepairs = repairsList.map(repair => ({
          id: repair.id,
          ride: repair.ride,
          date: repair.date,
          issue: repair.issue,
          partsReplaced: repair.parts_replaced || '',
          cost: repair.cost || 0,
          technician: repair.technician,
          status: repair.status,
          notes: repair.notes || '',
          timestamp: repair.created_at || new Date().toISOString(),
        }));
        setRepairs(mappedRepairs);
        setOpenWarningModal(false);
      } catch (error) {
        console.error('Error deleting repair:', error);
        setWarningMessage('Failed to delete repair. Please try again.');
        setOpenWarningModal(true);
      }
    });
    setOpenWarningModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'warning';
      case 'Pending':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRepairStats = (ride) => {
    const rideRepairs = repairs.filter(repair => repair.ride === ride);
    return {
      totalRepairs: rideRepairs.length,
      totalCost: rideRepairs.reduce((sum, repair) => sum + (Number(repair.cost) || 0), 0),
      lastRepair: rideRepairs.length > 0 ? new Date(Math.max(...rideRepairs.map(r => new Date(r.date)))) : null,
    };
  };

  return (
    <DashboardLayout title="Ride Repairs">
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Repair Statistics */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Repair Statistics by Ride
            </Typography>
            <Grid container spacing={2}>
              {rides.map((ride) => {
                const stats = getRepairStats(ride);
                return (
                  <Grid item xs={12} sm={6} md={4} key={ride}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {ride}
                        </Typography>
                        <Typography color="textSecondary">
                          Total Repairs: {stats.totalRepairs}
                        </Typography>
                        <Typography color="textSecondary">
                          Total Cost: ₱{stats.totalCost.toFixed(2)}
                        </Typography>
                        <Typography color="textSecondary">
                          Last Repair: {stats.lastRepair ? stats.lastRepair.toLocaleDateString() : 'Never'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>

          {/* Repair Records */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Repair Records</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Add Repair Record
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ride</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Issue</TableCell>
                    <TableCell>Parts Replaced</TableCell>
                    <TableCell>Cost</TableCell>
                    <TableCell>Technician</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {repairs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography variant="body1" color="text.secondary">
                          No repair records found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    repairs.map((repair) => (
                      <TableRow key={repair.id}>
                        <TableCell>{repair.ride}</TableCell>
                        <TableCell>{repair.date ? new Date(repair.date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{repair.issue}</TableCell>
                        <TableCell>{repair.partsReplaced}</TableCell>
                        <TableCell>₱{Number(repair.cost).toFixed(2)}</TableCell>
                        <TableCell>{repair.technician}</TableCell>
                        <TableCell>
                          <Chip
                            label={repair.status}
                            color={getStatusColor(repair.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{repair.notes}</TableCell>
                        <TableCell>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(repair)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(repair.id)}
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
          </Grid>
        </Grid>

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedRepair ? 'Edit Repair Record' : 'Add Repair Record'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Ride</InputLabel>
                  <Select
                    value={repairData.ride}
                    onChange={(e) => setRepairData({ ...repairData, ride: e.target.value })}
                    label="Ride"
                  >
                    {rides.map((ride) => (
                      <MenuItem key={ride} value={ride}>
                        {ride}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={repairData.date}
                  onChange={(e) => setRepairData({ ...repairData, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Issue Description"
                  value={repairData.issue}
                  onChange={(e) => setRepairData({ ...repairData, issue: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Parts Replaced"
                  value={repairData.partsReplaced}
                  onChange={(e) => setRepairData({ ...repairData, partsReplaced: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cost"
                  type="number"
                  value={repairData.cost}
                  onChange={(e) => setRepairData({ ...repairData, cost: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Technician"
                  value={repairData.technician}
                  onChange={(e) => setRepairData({ ...repairData, technician: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={repairData.status}
                    onChange={(e) => setRepairData({ ...repairData, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Additional Notes"
                  value={repairData.notes}
                  onChange={(e) => setRepairData({ ...repairData, notes: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {selectedRepair ? 'Save Changes' : 'Add Record'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Warning Modal */}
        <Dialog open={openWarningModal} onClose={() => setOpenWarningModal(false)}>
          <DialogTitle>Warning</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mt: 2 }}>
              {warningMessage}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenWarningModal(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (warningAction) {
                  warningAction();
                }
                setOpenWarningModal(false);
              }}
              color="error"
              variant="contained"
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default EncoderRideRepairs; 