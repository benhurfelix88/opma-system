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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import {
  Build as BuildIcon,
  Search as SearchIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  PictureAsPdf as ReportIcon
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import ReportGenerator from '../common/ReportGenerator';
import { maintenanceAPI } from '../../services/api';

const AdminMaintenanceReports = () => {
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [rideFilter, setRideFilter] = useState('all');
  const [error, setError] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openRideModal, setOpenRideModal] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState('');

  const truncateText = (text, wordLimit = 5) => {
    if (!text) return 'No description';
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        // Load maintenance records from API (same as EncoderMaintenanceReports)
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
        }));

        const sortedReports = mapped.sort((a, b) => new Date(b.date) - new Date(a.date));

        setMaintenanceData(sortedReports);
        setFilteredData(sortedReports);
        setError(null);
      } catch (err) {
        console.error('Error loading maintenance data:', err);
        setError('Failed to load maintenance reports. Please try again later.');
      }
    };

    loadData();
    const interval = setInterval(loadData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = maintenanceData;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(report =>
        report.ride?.toLowerCase().includes(searchLower) ||
        report.description?.toLowerCase().includes(searchLower) ||
        report.technician?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Apply ride filter
    if (rideFilter !== 'all') {
      filtered = filtered.filter(report => 
        report.ride === rideFilter
      );
    }

    // Apply sorting
    filtered = filtered.sort((a, b) => {
      let aVal, bVal;
      
      aVal = new Date(a.date);
      bVal = new Date(b.date);

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredData(filtered);
  }, [searchTerm, statusFilter, rideFilter, sortOrder, maintenanceData]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'scheduled':
        return 'warning';
      case 'in progress':
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'success';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'scheduled':
        return <ScheduleIcon />;
      case 'in progress':
      case 'in_progress':
        return <BuildIcon />;
      case 'completed':
        return <CheckCircleIcon />;
      case 'overdue':
        return <WarningIcon />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (err) {
      return 'Invalid Date';
    }
  };

  const handleOpenViewDialog = (record) => {
    setViewRecord(record);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setViewRecord(null);
  };

  const handleCloseDescriptionDialog = () => {
    setDescriptionDialogOpen(false);
    setSelectedDescription('');
  };

  const ViewDetailsDialog = () => {
    if (!viewRecord) return null;

    return (
      <Dialog 
        open={openViewDialog} 
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon sx={{ color: 'primary.main' }} />
          Maintenance Record Details
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography><strong>Ride:</strong> {viewRecord.ride || 'N/A'}</Typography>
            <Typography><strong>Date Recorded:</strong> {viewRecord.date ? new Date(viewRecord.date).toLocaleString('en-US', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit',
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }) : 'N/A'}</Typography>
            <Typography><strong>Status:</strong>
              <Chip
                icon={getStatusIcon(viewRecord.status)}
                label={viewRecord.status || 'Unknown'}
                variant="outlined"
                size="small"
                sx={{
                  ml: 1,
                  color: getStatusColor(viewRecord.status) === 'success' ? 'green' :
                        getStatusColor(viewRecord.status) === 'warning' ? 'orange' :
                        getStatusColor(viewRecord.status) === 'error' ? 'red' : 'blue',
                  borderColor: getStatusColor(viewRecord.status) === 'success' ? 'green' :
                               getStatusColor(viewRecord.status) === 'warning' ? 'orange' :
                               getStatusColor(viewRecord.status) === 'error' ? 'red' : 'blue',
                  backgroundColor: 'transparent',
                }}
              />
            </Typography>
            <Typography><strong>Technician:</strong> {viewRecord.technician || 'N/A'}</Typography>
            <Typography><strong>Description:</strong></Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {viewRecord.description || 'No description provided'}
              </Typography>
            </Paper>
            <Typography><strong>Maintenance Schedule:</strong>
              {viewRecord.nextMaintenance
                ? ` ${new Date(viewRecord.nextMaintenance).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}`
                : ' Not scheduled'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  const DescriptionDialog = () => {
    return (
      <Dialog 
        open={descriptionDialogOpen} 
        onClose={handleCloseDescriptionDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon sx={{ color: 'primary.main' }} />
          Full Description
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            p: 2, 
            backgroundColor: 'grey.50', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            <Typography 
              variant="body1" 
              sx={{ 
                whiteSpace: 'pre-wrap', 
                lineHeight: 1.6,
                color: 'text.primary'
              }}
            >
              {selectedDescription}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDescriptionDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <DashboardLayout title="Maintenance Reports">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search maintenance reports..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Order</InputLabel>
              <Select
                label="Order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                MenuProps={{
                  PaperProps: {
                    sx: {
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
                    },
                  },
                }}
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
                MenuProps={{
                  PaperProps: {
                    sx: {
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
                    },
                  },
                }}
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
            sx={{ ml: 2 }}
          >
            Export
          </Button>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Maintenance Reports Table */}
        <Card>
          <CardContent>
            <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f3f0f7' }}>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Date Recorded</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Ride</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Location</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Maintenance Schedule</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Description</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Technician</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body1" color="text.secondary">
                          No maintenance reports found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell align="center">{formatDate(report.date)}</TableCell>
                        <TableCell align="center">{report.ride || 'N/A'}</TableCell>
                        <TableCell align="center">{report.location || '-'}</TableCell>
                        <TableCell align="center">
                          {report.nextMaintenance ? formatDate(report.nextMaintenance) : 'Not scheduled'}
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              width: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              textAlign: 'center',
                            }}
                            title={report.description || 'No description'}
                          >
                            {truncateText(report.description)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{report.technician || 'N/A'}</TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={getStatusIcon(report.status)}
                            label={report.status || 'Unknown'}
                            variant="outlined"
                            size="small"
                            sx={{
                              color: getStatusColor(report.status) === 'success' ? 'green' :
                                    getStatusColor(report.status) === 'warning' ? 'orange' :
                                    getStatusColor(report.status) === 'error' ? 'red' : 'blue',
                              borderColor: getStatusColor(report.status) === 'success' ? 'green' :
                                           getStatusColor(report.status) === 'warning' ? 'orange' :
                                           getStatusColor(report.status) === 'error' ? 'red' : 'blue',
                              backgroundColor: 'transparent',
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenViewDialog(report)}
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

        {/* View Details Dialog */}
        <ViewDetailsDialog />
        
        {/* Description Dialog */}
        <DescriptionDialog />

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
                {[...new Set(maintenanceData.map(report => report.ride).filter(Boolean))].sort().slice(0, 10).map(ride => (
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
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenRideModal(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <ReportGenerator
          open={openReportDialog}
          onClose={() => setOpenReportDialog(false)}
          data={filteredData}
          title="Maintenance Reports"
          reportType="maintenance"
          columns={[
            { header: 'Date Recorded', field: 'date', render: (item) => item.date ? new Date(item.date).toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : 'N/A' },
            { header: 'Ride', field: 'ride' },
            { header: 'Maintenance Schedule', field: 'nextMaintenance', render: (item) => item.nextMaintenance ? new Date(item.nextMaintenance).toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : 'Not scheduled' },
            { header: 'Description', field: 'description' },
            { header: 'Technician', field: 'technician' },
            { header: 'Status', field: 'status' },
          ]}
        />
      </Box>
    </DashboardLayout>
  );
};

export default AdminMaintenanceReports;