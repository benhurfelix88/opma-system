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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  PictureAsPdf as ReportIcon,
  ArrowRight as ArrowRightIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import ReportGenerator from '../common/ReportGenerator';
import { maintenanceAPI } from '../../services/api';
import { getSocket } from '../../utils/socket';

const ManagerMaintenanceReports = () => {
  // Helper function to check if record is newly added/edited (within 1 minute)
  const isRecent = (timestamp) => {
    if (!timestamp) return false;
    const recordTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now - recordTime;
    const diffMinutes = diffMs / 60000; // Convert to minutes
    return diffMinutes <= 1; // Within 1 minute
  };

  // Force re-render every second to update highlights
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000); // Check every second
    return () => clearInterval(interval);
  }, []);

  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rideFilter, setRideFilter] = useState('all');
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [openRideModal, setOpenRideModal] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState('');
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [openApprovalDialog, setOpenApprovalDialog] = useState(false);
  const [approvalRecord, setApprovalRecord] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const truncateText = (text, wordLimit = 5) => {
    if (!text) return 'No description';
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await maintenanceAPI.getAll();
        const mapped = (rows || []).map(r => ({
          ...r,
          id: r.id,
          ride: r.ride_name || r.ride || '',
          location: r.location || '',
          date: r.date_performed || r.date || new Date().toISOString(),
          status: r.status || '',
          description: r.description || '',
          technician: r.performed_by || r.technician || '',
          nextMaintenance: r.next_maintenance_date || r.nextMaintenance || null,
          approval_status: r.approval_status || 'Pending',
          approval_date: r.approval_date || null,
        }));
        setMaintenanceRecords(mapped);
      } catch (e) {
        console.error('Error loading maintenance data:', e);
      }
    };
    load();

    // Setup WebSocket connection
    const socket = getSocket();

    // Listen for maintenance updates
    socket.on('maintenance-updated', (data) => {
      console.log('Maintenance updated via WebSocket:', data);
      load();
    });

    // Cleanup on unmount
    return () => {
      socket.off('maintenance-updated');
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'warning';
      case 'Scheduled':
        return 'info';
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
        record.location,
        record.status,
        record.technician,
        record.description,
        new Date(record.date).toLocaleDateString(),
      ]
        .map((v) => (v || '').toString().toLowerCase())
        .some((v) => v.includes(q));
    })
    .filter((record) => {
      // Status filter
      if (statusFilter !== 'all') {
        return record.status === statusFilter;
      }
      return true;
    })
    .filter((record) => {
      // Ride filter
      if (rideFilter !== 'all') {
        return record.ride === rideFilter;
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = normalizedValue(
        sortBy === 'date'
          ? a.date
          : sortBy === 'nextMaintenance'
          ? a.nextMaintenance
          : a[sortBy]
      );
      const bVal = normalizedValue(
        sortBy === 'date'
          ? b.date
          : sortBy === 'nextMaintenance'
          ? b.nextMaintenance
          : b[sortBy]
      );
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

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
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Scheduled">Scheduled</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setOpenRideModal(true)}
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
            startIcon={<ReportIcon />}
            onClick={() => setOpenReportDialog(true)}
          >
            Export
          </Button>
        </Box>

        <Card>
          <CardContent>
            <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ width: '30px' }}></TableCell>
                <TableCell align="center">Ride</TableCell>
                <TableCell align="center">Location</TableCell>
                <TableCell align="center">Date</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Description</TableCell>
                <TableCell align="center">Technician</TableCell>
                <TableCell align="center">Next Maintenance</TableCell>
                <TableCell align="center">Approval Status</TableCell>
                <TableCell align="center">Approval Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Typography variant="body1" color="text.secondary">
                      No maintenance records found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedRecords.map((record) => (
                  <TableRow
                    key={record.id}
                    sx={{
                      backgroundColor: isRecent(record.updated_at) || isRecent(record.created_at) || isRecent(record.approval_date) ? 'rgba(255, 0, 0, 0.05)' : 'inherit',
                    }}
                  >
                    <TableCell align="center" sx={{ width: '30px' }}>
                      {(isRecent(record.updated_at) || isRecent(record.created_at) || isRecent(record.approval_date)) && (
                        <CircleIcon sx={{ fontSize: 8, color: 'red' }} />
                      )}
                    </TableCell>
                    <TableCell align="center">{record.ride}</TableCell>
                    <TableCell align="center">{record.location || '-'}</TableCell>
                    <TableCell align="center">
                      {new Date(record.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={record.status}
                        variant="outlined"
                        size="small"
                        sx={{ 
                          color: getStatusColor(record.status) === 'success' ? 'green' : 
                                getStatusColor(record.status) === 'warning' ? 'orange' : 
                                getStatusColor(record.status) === 'error' ? 'red' : 'blue',
                          borderColor: getStatusColor(record.status) === 'success' ? 'green' : 
                                       getStatusColor(record.status) === 'warning' ? 'orange' : 
                                       getStatusColor(record.status) === 'error' ? 'red' : 'blue',
                          backgroundColor: 'transparent'
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {truncateText(record.description)}
                        </Typography>
                        {record.description && record.description.split(' ').length > 5 && (
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedDescription(record.description || 'No description available');
                              setDescriptionDialogOpen(true);
                            }}
                            sx={{ 
                              p: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover'
                              }
                            }}
                          >
                            <ArrowRightIcon fontSize="small" color="primary" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 100,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={record.technician || 'N/A'}
                      >
                        {truncateText(record.technician, 3)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {record.nextMaintenance
                        ? new Date(record.nextMaintenance).toLocaleDateString()
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={record.approval_status || 'Pending'}
                        variant="outlined"
                        size="small"
                        sx={{
                          color: record.approval_status === 'Approved' ? 'green' :
                                record.approval_status === 'Rejected' ? 'red' : 'orange',
                          borderColor: record.approval_status === 'Approved' ? 'green' :
                                       record.approval_status === 'Rejected' ? 'red' : 'orange',
                          backgroundColor: 'transparent'
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {record.approval_date
                        ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography variant="body2">
                              {new Date(record.approval_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </Typography>
                            <Typography variant="body2">
                              {new Date(record.approval_date).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </Typography>
                          </Box>
                        )
                        : 'N/A'}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setViewRecord(record);
                            setOpenViewDialog(true);
                          }}
                          sx={{
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          <InfoIcon fontSize="small" color="primary" />
                        </IconButton>
                        {record.approval_status !== 'Approved' && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setApprovalRecord(record);
                              setOpenApprovalDialog(true);
                            }}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                            }}
                          >
                            <EditIcon fontSize="small" color="primary" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </CardContent>
      </Card>

        {/* Ride Selection Modal */}
        <Dialog 
          open={openRideModal} 
          onClose={() => setOpenRideModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Select Ride</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              <Box
                onClick={() => {
                  setRideFilter('all');
                  setOpenRideModal(false);
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
              {[...new Set(maintenanceRecords.map(record => record.ride).filter(Boolean))].sort().map(ride => (
                <Box
                  key={ride}
                  onClick={() => {
                    setRideFilter(ride);
                    setOpenRideModal(false);
                  }}
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    border: rideFilter === ride ? '2px solid' : '1px solid',
                    borderColor: rideFilter === ride ? 'primary.main' : 'divider',
                    backgroundColor: rideFilter === ride ? 'primary.50' : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: rideFilter === ride ? 'primary.100' : 'action.hover',
                    },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    {ride}
                  </Typography>
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenRideModal(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <ReportGenerator
          open={openReportDialog}
          onClose={() => setOpenReportDialog(false)}
          data={filteredAndSortedRecords}
          title="Maintenance Reports"
          reportType="maintenance"
          columns={[
            { header: 'Ride Name', field: 'ride' },
            { header: 'Location', field: 'location' },
            { header: 'Date', field: 'date', render: (item) => new Date(item.date).toLocaleDateString() },
            { header: 'Status', field: 'status' },
            { header: 'Technician', field: 'technician' },
            { header: 'Description', field: 'description' },
            { header: 'Next Maintenance', field: 'nextMaintenance', render: (item) => item.nextMaintenance ? new Date(item.nextMaintenance).toLocaleDateString() : 'Not scheduled' },
            { header: 'Approval Status', field: 'approval_status' },
            { header: 'Approval Date', field: 'approval_date' }
          ]}
        />

        {/* View Details Dialog */}
        <Dialog
          open={openViewDialog}
          onClose={() => {
            setOpenViewDialog(false);
            setViewRecord(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon sx={{ color: 'primary.main' }} />
            Maintenance Record Details
          </DialogTitle>
          <DialogContent>
            {viewRecord && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Typography><strong>Date:</strong> {new Date(viewRecord.date).toLocaleString()}</Typography>
                <Typography><strong>Technician:</strong> {viewRecord.technician || 'N/A'}</Typography>
                <Typography><strong>Description:</strong></Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {viewRecord.description || 'No description provided'}
                  </Typography>
                </Paper>
                <Typography><strong>Next Maintenance:</strong>
                  {viewRecord.nextMaintenance
                    ? ` ${new Date(viewRecord.nextMaintenance).toLocaleString()}`
                    : ' Not scheduled'}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenViewDialog(false);
              setViewRecord(null);
            }}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog
          open={openApprovalDialog}
          onClose={() => setOpenApprovalDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Approve/Reject Maintenance Record</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Approval Status</InputLabel>
              <Select
                label="Approval Status"
                value={approvalRecord?.approval_status || 'Pending'}
                onChange={(e) => {
                  setApprovalRecord(prev => ({ ...prev, approval_status: e.target.value }));
                }}
              >
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenApprovalDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  const updatedRecord = {
                    ...approvalRecord,
                    approval_date: approvalRecord.approval_status === 'Approved' ? new Date().toISOString() : null
                  };
                  await maintenanceAPI.update(approvalRecord.id, updatedRecord);
                  setSnackbar({ open: true, message: 'Approval status updated successfully', severity: 'success' });
                  setOpenApprovalDialog(false);
                  // Reload data
                  const rows = await maintenanceAPI.getAll();
                  const mapped = (rows || []).map(r => ({
                    ...r,
                    id: r.id,
                    ride: r.ride_name || r.ride || '',
                    location: r.location || '',
                    date: r.date_performed || r.date || new Date().toISOString(),
                    status: r.status || '',
                    description: r.description || '',
                    technician: r.performed_by || r.technician || '',
                    nextMaintenance: r.next_maintenance_date || r.nextMaintenance || null,
                    approval_status: r.approval_status || 'Pending',
                    approval_date: r.approval_date || null,
                  }));
                  setMaintenanceRecords(mapped);
                } catch (error) {
                  console.error('Error updating approval status:', error);
                  setSnackbar({ open: true, message: 'Failed to update approval status', severity: 'error' });
                }
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>

      {/* Description Dialog */}
      <Dialog 
        open={descriptionDialogOpen} 
        onClose={() => setDescriptionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Full Description</Typography>
            <IconButton onClick={() => setDescriptionDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {selectedDescription}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDescriptionDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default ManagerMaintenanceReports;
