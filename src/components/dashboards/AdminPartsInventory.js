import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  PictureAsPdf as ReportIcon,
  Circle as CircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import ReportGenerator from '../common/ReportGenerator';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { sparePartsAPI, rideRepairsAPI, partDeploymentsAPI, partRemovalsAPI } from '../../services/api';
import { getSocket } from '../../utils/socket';

const AdminPartsInventory = () => {
  // Helper function to check if record is newly added/edited (within 1 minute)
  const isRecent = useCallback((timestamp) => {
    if (!timestamp) return false;
    const recordTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now - recordTime;
    const diffMinutes = diffMs / 60000; // Convert to minutes
    return diffMinutes <= 1; // Within 1 minute
  }, []);

  // Helper function to check if approval status was recently updated
  const isApprovalStatusRecent = useCallback((item) => {
    // Check if approval_status is not the default 'Pending' or was recently changed
    if (!item.approval_status || item.approval_status === 'Pending') return false;
    // Use updated_at as proxy for when approval status was changed
    return isRecent(item.updated_at);
  }, [isRecent]);

  // Force re-render every second to update highlights
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000); // Check every second
    return () => clearInterval(interval);
  }, []);

  const [tabValue, setTabValue] = useState(0);
  const [parts, setParts] = useState([]);
  const [rideRepairs, setRideRepairs] = useState([]);
  const [partDeployments, setPartDeployments] = useState([]);
  const [partRemovals, setPartRemovals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy] = useState('updated_at'); // Changed from 'name' to 'updated_at'
  const [sortOrder, setSortOrder] = useState('desc'); // Changed from 'asc' to 'desc'
  const [statusFilter, setStatusFilter] = useState('all');
  const [repairsSearchQuery, setRepairsSearchQuery] = useState('');
  const [repairsSortOrder, setRepairsSortOrder] = useState('desc');
  const [deploymentsSearchQuery, setDeploymentsSearchQuery] = useState('');
  const [deploymentsSortOrder, setDeploymentsSortOrder] = useState('desc');
  const [removalsSearchQuery, setRemovalsSearchQuery] = useState('');
  const [removalsSortOrder, setRemovalsSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [openRepairDetailsDialog, setOpenRepairDetailsDialog] = useState(false);
  const [selectedRepairDetails, setSelectedRepairDetails] = useState(null);

  const loadParts = useCallback(async () => {
    try {
      setLoading(true);
      const allParts = await sparePartsAPI.getAll();
      // Map database fields to component fields
      const mappedParts = allParts.map(part => {
        // Use approval_status from database directly, fallback to parsing notes if needed
        let approvalStatus = part.approval_status || 'Pending';
        let notes = part.notes || '';

        // Fallback: if approval_status doesn't exist, try parsing from notes (for backward compatibility)
        if (!part.approval_status && part.notes) {
          try {
            const parsed = JSON.parse(part.notes);
            if (parsed.approvalStatus) {
              approvalStatus = parsed.approvalStatus;
              notes = parsed.notes || '';
            } else {
              notes = part.notes;
            }
          } catch {
            // If notes is not JSON, use it as is
            notes = part.notes;
          }
        }

        return {
          ...part,
          id: part.id,
          name: part.part_name || part.name,
          quantity: part.quantity || 0,
          unit: part.unit || '',
          price: part.cost || part.price || 0,
          status: part.status || 'Available',
          location: part.location || '',
          supplier: part.supplier || '',
          ride: part.ride || '', // Use actual ride field from database
          totalAmount: (part.cost || 0) * (part.quantity || 0),
          approvalStatus: approvalStatus,
          approval_date: part.approval_date,
          notes: notes,
        };
      });
      setParts(mappedParts);

      // Check for newly approved items and newly added items
      const hasNewlyApproved = mappedParts.some(part =>
        part.approvalStatus === 'Approved' && isApprovalStatusRecent(part)
      );
      const hasNewlyAdded = mappedParts.some(part =>
        isRecent(part.created_at)
      );
      window.dispatchEvent(new CustomEvent('set-notification', {
        detail: { path: '/admin-dashboard/parts-inventory', hasNotification: hasNewlyApproved || hasNewlyAdded }
      }));
    } catch (error) {
      console.error('Error loading parts:', error);
    } finally {
      setLoading(false);
    }
  }, [isApprovalStatusRecent, isRecent]);

  const loadRideRepairs = useCallback(async () => {
    try {
      const repairs = await rideRepairsAPI.getAll();
      setRideRepairs(repairs || []);
    } catch (error) {
      console.error('Error loading ride repairs:', error);
    }
  }, []);

  const loadPartDeployments = useCallback(async () => {
    try {
      const deployments = await partDeploymentsAPI.getAll();
      const mappedDeployments = deployments.map(deployment => ({
        ...deployment,
        missing_parts: deployment.missing_parts || ''
      }));
      setPartDeployments(mappedDeployments || []);
    } catch (error) {
      console.error('Error loading part deployments:', error);
    }
  }, []);

  const loadPartRemovals = useCallback(async () => {
    try {
      const removals = await partRemovalsAPI.getAll();
      const mappedRemovals = removals.map(removal => ({
        ...removal,
        missing_parts: removal.missing_parts || ''
      }));
      setPartRemovals(mappedRemovals || []);
    } catch (error) {
      console.error('Error loading part removals:', error);
    }
  }, []);

  useEffect(() => {
    loadParts();
    loadRideRepairs();
    loadPartDeployments();
    loadPartRemovals();

    // Setup WebSocket connection
    const socket = getSocket();

    // Listen for updates
    socket.on('spare-parts-updated', () => {
      console.log('Spare parts updated via WebSocket');
      loadParts();
    });

    socket.on('ride-repairs-updated', () => {
      console.log('Ride repairs updated via WebSocket');
      loadRideRepairs();
    });

    socket.on('part-deployments-updated', () => {
      console.log('Part deployments updated via WebSocket');
      loadPartDeployments();
    });

    socket.on('part-removals-updated', () => {
      console.log('Part removals updated via WebSocket');
      loadPartRemovals();
    });

    // Cleanup on unmount
    return () => {
      socket.off('spare-parts-updated');
      socket.off('ride-repairs-updated');
      socket.off('part-deployments-updated');
      socket.off('part-removals-updated');
    };
  }, [loadParts, loadRideRepairs, loadPartDeployments, loadPartRemovals]);

  const normalizedValue = (value) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') return value;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.getTime();
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
    return String(value).toLowerCase();
  };

  const filteredAndSortedParts = parts
    .filter((part) => {
      // Search filter
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return Object.values(part)
        .map((v) => (v || '').toString().toLowerCase())
        .some((v) => v.includes(q));
    })
    .filter((part) => {
      // Status filter
      if (statusFilter === 'all') return true;
      return part.status === statusFilter;
    })
    .sort((a, b) => {
      // Sorting logic
      const aVal = normalizedValue(
        sortBy === 'price'
          ? Number(a.price)
          : sortBy === 'quantity'
          ? Number(a.quantity)
          : sortBy === 'updated_at'
          ? a.updated_at
          : a[sortBy]
      );
      const bVal = normalizedValue(
        sortBy === 'price'
          ? Number(b.price)
          : sortBy === 'quantity'
          ? Number(b.quantity)
          : sortBy === 'updated_at'
          ? b.updated_at
          : b[sortBy]
      );
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const getStatusColor = (status) => {
    if (!status) return 'default';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('in stock')) return 'success';
    if (statusLower.includes('low stock')) return 'warning';
    if (statusLower.includes('out of stock')) return 'error';
    return 'default';
  };

  const handleOpenRepairDetails = (repair) => {
    setSelectedRepairDetails(repair);
    setOpenRepairDetailsDialog(true);
  };

  const handleCloseRepairDetails = () => {
    setOpenRepairDetailsDialog(false);
    setSelectedRepairDetails(null);
  };

  const filteredAndSortedRepairs = rideRepairs
    .filter((repair) => {
      if (!repairsSearchQuery) return true;
      const q = repairsSearchQuery.toLowerCase();
      return (
        repair.ride?.toLowerCase().includes(q) ||
        repair.location?.toLowerCase().includes(q) ||
        repair.issue?.toLowerCase().includes(q) ||
        repair.technician?.toLowerCase().includes(q) ||
        repair.status?.toLowerCase().includes(q) ||
        new Date(repair.date).toLocaleDateString().toLowerCase().includes(q) ||
        repair.cost?.toString().toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return repairsSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const filteredAndSortedDeployments = partDeployments
    .filter((deployment) => {
      if (!deploymentsSearchQuery) return true;
      const q = deploymentsSearchQuery.toLowerCase();
      return (
        deployment.place?.toLowerCase().includes(q) ||
        deployment.ride?.toLowerCase().includes(q) ||
        deployment.encoded_by?.toLowerCase().includes(q) ||
        deployment.status?.toLowerCase().includes(q) ||
        deployment.missing_parts?.toLowerCase().includes(q) ||
        new Date(deployment.date).toLocaleDateString().toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return deploymentsSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const filteredAndSortedRemovals = partRemovals
    .filter((removal) => {
      if (!removalsSearchQuery) return true;
      const q = removalsSearchQuery.toLowerCase();
      return (
        removal.place?.toLowerCase().includes(q) ||
        removal.ride?.toLowerCase().includes(q) ||
        removal.encoded_by?.toLowerCase().includes(q) ||
        removal.status?.toLowerCase().includes(q) ||
        removal.missing_parts?.toLowerCase().includes(q) ||
        new Date(removal.date).toLocaleDateString().toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return removalsSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <DashboardLayout title="Ride Parts Inventory">
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Parts Inventory" />
            <Tab label="Ride Repairs" />
            <Tab label="Deployments" />
            <Tab label="Removals" />
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search parts..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                <MenuItem value="In Stock">In Stock</MenuItem>
                <MenuItem value="Low Stock">Low Stock</MenuItem>
                <MenuItem value="Out of Stock">Out of Stock</MenuItem>
              </Select>
            </FormControl>
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

        <Card>
          <CardContent>
            <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader>
                  <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ width: '30px' }}></TableCell>
                <TableCell align="center" sx={{ width: '12%' }}>Part Name</TableCell>
                <TableCell align="center" sx={{ width: '10%' }}>Ride</TableCell>
                <TableCell align="center" sx={{ width: '8%' }}>Quantity</TableCell>
                <TableCell align="center" sx={{ width: '8%' }}>Unit</TableCell>
                <TableCell align="center" sx={{ width: '10%' }}>Price</TableCell>
                <TableCell align="center" sx={{ width: '10%' }}>Total Amount</TableCell>
                <TableCell align="center" sx={{ width: '10%' }}>Status</TableCell>
                <TableCell align="center" sx={{ width: '10%' }}>Location</TableCell>
                <TableCell align="center" sx={{ width: '12%' }}>Supplier</TableCell>
                <TableCell align="center" sx={{ width: '10%' }}>Approval Status</TableCell>
                <TableCell align="center" sx={{ width: '10%' }}>Approval Date</TableCell>
                <TableCell align="center" sx={{ width: '10%' }}>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedParts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} align="center">
                    <Typography variant="body1" color="text.secondary">
                      No parts found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedParts.map((part) => (
                  <TableRow
                    key={part.id}
                    sx={{
                      backgroundColor: isRecent(part.updated_at) || isRecent(part.created_at) || isApprovalStatusRecent(part) ? 'rgba(255, 0, 0, 0.05)' : 'inherit',
                    }}
                  >
                    <TableCell align="center" sx={{ width: '30px' }}>
                      {(isRecent(part.updated_at) || isRecent(part.created_at) || isApprovalStatusRecent(part)) && (
                        <CircleIcon sx={{ fontSize: 8, color: 'red' }} />
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{part.name}</TableCell>
                    <TableCell align="center">{part.ride || 'N/A'}</TableCell>
                    <TableCell align="center">{part.quantity}</TableCell>
                    <TableCell align="center">{part.unit || 'N/A'}</TableCell>
                    <TableCell align="center">₱{Number(part.price || 0).toFixed(2)}</TableCell>
                    <TableCell align="center">₱{Number(part.totalAmount || (Number(part.price || 0) * Number(part.quantity || 0))).toFixed(2)}</TableCell>
                    <TableCell align="center">
                        <Chip
                          label={part.status || 'Unknown'}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            color: getStatusColor(part.status) === 'success' ? 'green' : 
                                   getStatusColor(part.status) === 'warning' ? 'orange' : 
                                   getStatusColor(part.status) === 'error' ? 'red' : 
                                   getStatusColor(part.status) === 'info' ? 'blue' : 'gray',
                            borderColor: getStatusColor(part.status) === 'success' ? 'green' : 
                                         getStatusColor(part.status) === 'warning' ? 'orange' : 
                                         getStatusColor(part.status) === 'error' ? 'red' : 
                                         getStatusColor(part.status) === 'info' ? 'blue' : 'gray',
                            backgroundColor: 'transparent'
                          }}
                        />
                    </TableCell>
                    <TableCell align="center">{part.location || 'N/A'}</TableCell>
                    <TableCell align="center">{part.supplier || 'N/A'}</TableCell>
                    <TableCell align="center">
                        <Chip
                          label={part.approvalStatus || 'Pending'}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            color: part.approvalStatus === 'Approved' ? 'green' : 
                                   part.approvalStatus === 'Rejected' ? 'red' : 
                                   part.approvalStatus === 'Pending' ? 'orange' : 'gray',
                            borderColor: part.approvalStatus === 'Approved' ? 'green' : 
                                         part.approvalStatus === 'Rejected' ? 'red' : 
                                         part.approvalStatus === 'Pending' ? 'orange' : 'gray',
                            backgroundColor: 'transparent'
                          }}
                        />
                    </TableCell>
                    <TableCell align="center">
                      {part.approval_date ? (
                        <Box>
                          <Typography variant="body2">
                            {new Date(part.approval_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(part.approval_date).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </Typography>
                        </Box>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell align="center">
                      {part.updated_at ? new Date(part.updated_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }).replace(',', '') : 'N/A'}
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
          </>
        )}

        {tabValue === 1 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  placeholder="Search repairs..."
                  variant="outlined"
                  size="small"
                  value={repairsSearchQuery}
                  onChange={(e) => setRepairsSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  sx={{ minWidth: 200 }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Order</InputLabel>
                  <Select
                    label="Order"
                    value={repairsSortOrder}
                    onChange={(e) => setRepairsSortOrder(e.target.value)}
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

            <Card>
              <CardContent>
                <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                  <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell align="center" sx={{ width: '30px' }}></TableCell>
                          <TableCell align="center" sx={{ width: '15%' }}>Ride</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Ride Location</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Date</TableCell>
                          <TableCell align="center" sx={{ width: '20%' }}>Issue</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Technician</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Status</TableCell>
                          <TableCell align="center" sx={{ width: '10%' }}>Cost</TableCell>
                          <TableCell align="center" sx={{ width: '7%' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredAndSortedRepairs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} align="center">
                              <Typography variant="body1" color="text.secondary">
                                No ride repairs found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAndSortedRepairs.map((repair) => (
                            <TableRow
                              key={repair.id}
                              sx={{
                                backgroundColor: isRecent(repair.updated_at) || isRecent(repair.created_at) ? 'rgba(255, 0, 0, 0.05)' : 'inherit',
                              }}
                            >
                              <TableCell align="center" sx={{ width: '30px' }}>
                                {(isRecent(repair.updated_at) || isRecent(repair.created_at)) && (
                                  <CircleIcon sx={{ fontSize: 8, color: 'red' }} />
                                )}
                              </TableCell>
                              <TableCell align="center">{repair.ride}</TableCell>
                              <TableCell align="center">{repair.location || '-'}</TableCell>
                              <TableCell align="center">{new Date(repair.date).toLocaleDateString()}</TableCell>
                              <TableCell align="center" sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repair.issue}</TableCell>
                              <TableCell align="center">{repair.technician}</TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={repair.status}
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    color: repair.status === 'Completed' ? 'green' :
                                           repair.status === 'In Progress' ? 'orange' :
                                           repair.status === 'Pending' ? 'blue' : 'gray',
                                    borderColor: repair.status === 'Completed' ? 'green' :
                                                 repair.status === 'In Progress' ? 'orange' :
                                                 repair.status === 'Pending' ? 'blue' : 'gray',
                                    backgroundColor: 'transparent'
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">₱{Number(repair.cost || 0).toFixed(2)}</TableCell>
                              <TableCell align="center">
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenRepairDetails(repair)}
                                  >
                                    <InfoIcon />
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
          </>
        )}

        {tabValue === 2 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  placeholder="Search deployments..."
                  variant="outlined"
                  size="small"
                  value={deploymentsSearchQuery}
                  onChange={(e) => setDeploymentsSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  sx={{ minWidth: 200 }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Order</InputLabel>
                  <Select
                    label="Order"
                    value={deploymentsSortOrder}
                    onChange={(e) => setDeploymentsSortOrder(e.target.value)}
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

            <Card>
              <CardContent>
                <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                  <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell align="center" sx={{ width: '30px' }}></TableCell>
                          <TableCell align="center" sx={{ width: '14%' }}>Date Recorded</TableCell>
                          <TableCell align="center" sx={{ width: '14%' }}>Date of Deployment</TableCell>
                          <TableCell align="center" sx={{ width: '16%' }}>Place</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Ride</TableCell>
                          <TableCell align="center" sx={{ width: '11%' }}>Status</TableCell>
                          <TableCell align="center" sx={{ width: '16%' }}>Missing Parts</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Encoded By</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredAndSortedDeployments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} align="center">
                              <Typography variant="body1" color="text.secondary">
                                No deployments found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAndSortedDeployments.map((deployment) => (
                            <TableRow
                              key={deployment.id}
                              sx={{
                                backgroundColor: isRecent(deployment.updated_at) || isRecent(deployment.created_at) ? 'rgba(255, 0, 0, 0.05)' : 'inherit',
                              }}
                            >
                              <TableCell align="center" sx={{ width: '30px' }}>
                                {(isRecent(deployment.updated_at) || isRecent(deployment.created_at)) && (
                                  <CircleIcon sx={{ fontSize: 8, color: 'red' }} />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                {new Date(deployment.created_at).toLocaleDateString()} {new Date(deployment.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </TableCell>
                              <TableCell align="center">
                                {new Date(deployment.date).toLocaleDateString()} {new Date(deployment.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </TableCell>
                              <TableCell align="center">{deployment.place}</TableCell>
                              <TableCell align="center">{deployment.ride}</TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={deployment.status}
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    color: deployment.status === 'Complete' ? 'green' :
                                           deployment.status === 'Defective' ? 'red' :
                                           deployment.status === 'With missing parts' ? 'orange' : 'gray',
                                    borderColor: deployment.status === 'Complete' ? 'green' :
                                                 deployment.status === 'Defective' ? 'red' :
                                                 deployment.status === 'With missing parts' ? 'orange' : 'gray',
                                    backgroundColor: 'transparent'
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center" sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deployment.missing_parts || '-'}</TableCell>
                              <TableCell align="center">{deployment.encoded_by}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </CardContent>
            </Card>
          </>
        )}

        {tabValue === 3 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  placeholder="Search removals..."
                  variant="outlined"
                  size="small"
                  value={removalsSearchQuery}
                  onChange={(e) => setRemovalsSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  sx={{ minWidth: 200 }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Order</InputLabel>
                  <Select
                    label="Order"
                    value={removalsSortOrder}
                    onChange={(e) => setRemovalsSortOrder(e.target.value)}
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

            <Card>
              <CardContent>
                <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                  <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell align="center" sx={{ width: '30px' }}></TableCell>
                          <TableCell align="center" sx={{ width: '14%' }}>Date Recorded</TableCell>
                          <TableCell align="center" sx={{ width: '14%' }}>Date of Removal</TableCell>
                          <TableCell align="center" sx={{ width: '16%' }}>Place</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Ride</TableCell>
                          <TableCell align="center" sx={{ width: '11%' }}>Status</TableCell>
                          <TableCell align="center" sx={{ width: '16%' }}>Missing Parts</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Encoded By</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredAndSortedRemovals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} align="center">
                              <Typography variant="body1" color="text.secondary">
                                No removals found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAndSortedRemovals.map((removal) => (
                            <TableRow
                              key={removal.id}
                              sx={{
                                backgroundColor: isRecent(removal.updated_at) || isRecent(removal.created_at) ? 'rgba(255, 0, 0, 0.05)' : 'inherit',
                              }}
                            >
                              <TableCell align="center" sx={{ width: '30px' }}>
                                {(isRecent(removal.updated_at) || isRecent(removal.created_at)) && (
                                  <CircleIcon sx={{ fontSize: 8, color: 'red' }} />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                {new Date(removal.created_at).toLocaleDateString()} {new Date(removal.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </TableCell>
                              <TableCell align="center">
                                {new Date(removal.date).toLocaleDateString()} {new Date(removal.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </TableCell>
                              <TableCell align="center">{removal.place}</TableCell>
                              <TableCell align="center">{removal.ride}</TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={removal.status}
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    color: removal.status === 'Complete' ? 'green' :
                                           removal.status === 'Defective' ? 'red' :
                                           removal.status === 'With missing parts' ? 'orange' : 'gray',
                                    borderColor: removal.status === 'Complete' ? 'green' :
                                                 removal.status === 'Defective' ? 'red' :
                                                 removal.status === 'With missing parts' ? 'orange' : 'gray',
                                    backgroundColor: 'transparent'
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center" sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{removal.missing_parts || '-'}</TableCell>
                              <TableCell align="center">{removal.encoded_by}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </CardContent>
            </Card>
          </>
        )}

        {tabValue === 0 && (
          <ReportGenerator
            open={openReportDialog}
            onClose={() => setOpenReportDialog(false)}
            data={filteredAndSortedParts}
            title="Ride Parts Inventory Report"
            reportType="parts"
            columns={[
              { header: 'Part Name', field: 'name' },
              { header: 'Ride', field: 'ride' },
              { header: 'Quantity', field: 'quantity' },
              { header: 'Unit', field: 'unit' },
              { header: 'Price', field: 'price' },
              { header: 'Total Amount', field: 'totalAmount' },
              { header: 'Status', field: 'status' },
              { header: 'Location', field: 'location' },
              { header: 'Supplier', field: 'supplier' },
              { header: 'Approval Status', field: 'approvalStatus' },
              { header: 'Approval Date', field: 'approval_date' },
              { header: 'Last Updated', field: 'updated_at' }
            ]}
          />
        )}

        {tabValue === 1 && (
          <ReportGenerator
            open={openReportDialog}
            onClose={() => setOpenReportDialog(false)}
            data={filteredAndSortedRepairs}
            title="Ride Repairs Report"
            reportType="repairs"
            columns={[
              { header: 'Ride', field: 'ride' },
              { header: 'Date', field: 'date' },
              { header: 'Issue', field: 'issue' },
              { header: 'Technician', field: 'technician' },
              { header: 'Status', field: 'status' }
            ]}
          />
        )}

        {/* Repair Details Dialog */}
        <Dialog open={openRepairDetailsDialog} onClose={handleCloseRepairDetails} maxWidth="md" fullWidth>
          <DialogTitle>Repair Details</DialogTitle>
          <DialogContent>
            {selectedRepairDetails && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Date:</Typography>
                    <Typography variant="body1">{new Date(selectedRepairDetails.date).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Ride:</Typography>
                    <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{selectedRepairDetails.ride}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Ride Location:</Typography>
                    <Typography variant="body1">{selectedRepairDetails.location || 'Not specified'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Issue:</Typography>
                    <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{selectedRepairDetails.issue}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Technician:</Typography>
                    <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{selectedRepairDetails.technician}</Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseRepairDetails}>Close</Button>
          </DialogActions>
        </Dialog>

        {tabValue === 2 && (
          <ReportGenerator
            open={openReportDialog}
            onClose={() => setOpenReportDialog(false)}
            data={filteredAndSortedDeployments}
            title="Part Deployments Report"
            reportType="deployments"
            columns={[
              { header: 'Date', field: 'date' },
              { header: 'Place', field: 'place' },
              { header: 'Ride', field: 'ride' },
              { header: 'Status', field: 'status' },
              { header: 'Missing Parts', field: 'missing_parts' },
              { header: 'Encoded By', field: 'encoded_by' }
            ]}
          />
        )}

        {tabValue === 3 && (
          <ReportGenerator
            open={openReportDialog}
            onClose={() => setOpenReportDialog(false)}
            data={filteredAndSortedRemovals}
            title="Part Removals Report"
            reportType="removals"
            columns={[
              { header: 'Date', field: 'date' },
              { header: 'Place', field: 'place' },
              { header: 'Ride', field: 'ride' },
              { header: 'Status', field: 'status' },
              { header: 'Missing Parts', field: 'missing_parts' },
              { header: 'Encoded By', field: 'encoded_by' }
            ]}
          />
        )}
      </Box>
    </DashboardLayout>
  );
};

export default AdminPartsInventory; 