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
  Chip,
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
  Alert,
  IconButton,
  Tooltip,
  Snackbar,
  Card,
  CardContent,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Edit as EditIcon,
  PictureAsPdf as ReportIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import ReportGenerator from '../common/ReportGenerator';
import { sparePartsAPI, rideRepairsAPI, partDeploymentsAPI, partRemovalsAPI } from '../../services/api';

const ManagerPartsInventory = () => {
  const [tabValue, setTabValue] = useState(0);
  const [parts, setParts] = useState([]);
  const [rideRepairs, setRideRepairs] = useState([]);
  const [partDeployments, setPartDeployments] = useState([]);
  const [partRemovals, setPartRemovals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [repairsSearchQuery, setRepairsSearchQuery] = useState('');
  const [repairsSortOrder, setRepairsSortOrder] = useState('desc');
  const [deploymentsSearchQuery, setDeploymentsSearchQuery] = useState('');
  const [deploymentsSortOrder, setDeploymentsSortOrder] = useState('desc');
  const [removalsSearchQuery, setRemovalsSearchQuery] = useState('');
  const [removalsSortOrder, setRemovalsSortOrder] = useState('desc');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [formData, setFormData] = useState({
    approvalStatus: '',
    notes: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openReportDialog, setOpenReportDialog] = useState(false);

  useEffect(() => {
    loadParts();
    loadRideRepairs();
    loadPartDeployments();
    loadPartRemovals();
  }, []);

  const loadParts = async () => {
    try {
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
          notes: notes,
        };
      });
      setParts(mappedParts);
    } catch (error) {
      console.error('Error loading parts:', error);
    } finally {
    }
  };

  const loadRideRepairs = async () => {
    try {
      const repairs = await rideRepairsAPI.getAll();
      setRideRepairs(repairs || []);
    } catch (error) {
      console.error('Error loading ride repairs:', error);
    }
  };

  const loadPartDeployments = async () => {
    try {
      const deployments = await partDeploymentsAPI.getAll();
      setPartDeployments(deployments || []);
    } catch (error) {
      console.error('Error loading part deployments:', error);
    }
  };

  const loadPartRemovals = async () => {
    try {
      const removals = await partRemovalsAPI.getAll();
      setPartRemovals(removals || []);
    } catch (error) {
      console.error('Error loading part removals:', error);
    }
  };

  const handleOpenDialog = (part = null) => {
    if (part) {
      setSelectedPart(part);
      setFormData({
        approvalStatus: part.approvalStatus || '',
        notes: part.notes || '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPart(null);
    setFormData({
      approvalStatus: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!selectedPart || !formData.approvalStatus) {
      setSnackbar({ open: true, message: 'Please select an approval status', severity: 'warning' });
      return;
    }

    try {
      // Get the original part data from database to preserve all fields
      const allParts = await sparePartsAPI.getAll();
      const originalPart = allParts.find(p => String(p.id) === String(selectedPart.id));

      console.log('Original part:', originalPart);
      console.log('Selected part:', selectedPart);
      console.log('Form data:', formData);

      // Update approval status in database - use approval_status column directly
      const updatePayload = {
        part_name: originalPart?.part_name || selectedPart.part_name || selectedPart.name,
        part_number: originalPart?.part_number || selectedPart.part_number || '',
        category: originalPart?.category || selectedPart.category || '',
        quantity: originalPart?.quantity || selectedPart.quantity || 0,
        unit: originalPart?.unit || selectedPart.unit || '',
        cost: originalPart?.cost || selectedPart.cost || selectedPart.price || 0,
        status: originalPart?.status || selectedPart.status || 'Available',
        location: originalPart?.location || selectedPart.location || '',
        supplier: originalPart?.supplier || selectedPart.supplier || '',
        ride: originalPart?.ride || selectedPart.ride || '',
        approval_status: formData.approvalStatus, // Store approval status directly in database column
        notes: formData.notes || '', // Store notes separately
      };

      console.log('Update payload:', updatePayload);

      await sparePartsAPI.update(selectedPart.id, updatePayload);

      // Optimistic UI update so the table reflects the change immediately
      setParts((prev) =>
        prev.map((p) =>
          String(p.id) === String(selectedPart.id)
            ? { ...p, approvalStatus: formData.approvalStatus, notes: formData.notes || '' }
            : p
        )
      );

      handleCloseDialog();

      setSnackbar({ open: true, message: `Part "${selectedPart.name}" has been ${formData.approvalStatus.toLowerCase()} successfully!`, severity: 'success' });

      // Reload from database to ensure sync
      await loadParts();
    } catch (error) {
      console.error('Error updating part:', error);
      console.error('Error response:', error.response);
      setSnackbar({ open: true, message: `Failed to update approval status: ${error.response?.data?.details || error.message}`, severity: 'error' });
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'default';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('in stock')) return 'success';
    if (statusLower.includes('low stock')) return 'warning';
    if (statusLower.includes('out of stock')) return 'error';
    return 'default';
  };

  const getApprovalColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'error';
      case 'Pending':
        return 'warning';
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

  const filteredAndSortedRepairs = rideRepairs
    .filter((repair) => {
      if (!repairsSearchQuery) return true;
      const q = repairsSearchQuery.toLowerCase();
      return (
        repair.ride?.toLowerCase().includes(q) ||
        repair.issue?.toLowerCase().includes(q) ||
        repair.technician?.toLowerCase().includes(q) ||
        repair.status?.toLowerCase().includes(q)
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
        deployment.status?.toLowerCase().includes(q)
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
        removal.status?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return removalsSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const filteredAndSortedParts = parts
    .filter((part) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return [
        part.name,
        part.ride,
        part.status,
        part.approvalStatus,
        part.location,
        part.supplier,
        part.unit,
      ]
        .map((v) => (v || '').toString().toLowerCase())
        .some((v) => v.includes(q));
    })
    .filter((part) => {
      // Status filter
      if (statusFilter !== 'all') {
        return part.status === statusFilter;
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = normalizedValue(
        sortBy === 'price'
          ? Number(a.price)
          : sortBy === 'quantity'
          ? Number(a.quantity)
          : sortBy === 'lastUpdated'
          ? a.lastUpdated
          : a[sortBy]
      );
      const bVal = normalizedValue(
        sortBy === 'price'
          ? Number(b.price)
          : sortBy === 'quantity'
          ? Number(b.quantity)
          : sortBy === 'lastUpdated'
          ? b.lastUpdated
          : b[sortBy]
      );
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

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
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search parts..."
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
                <TableCell align="center">Part Name</TableCell>
                <TableCell align="center">Ride</TableCell>
                <TableCell align="center">Quantity</TableCell>
                <TableCell align="center">Unit</TableCell>
                <TableCell align="center">Price</TableCell>
                <TableCell align="center">Total Amount</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Location</TableCell>
                <TableCell align="center">Supplier</TableCell>
                <TableCell align="center">Approval Status</TableCell>
                <TableCell align="center">Approval Date</TableCell>
                <TableCell align="center">Last Updated</TableCell>
                <TableCell align="center">Actions</TableCell>
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
                  <TableRow key={part.id}>
                    <TableCell align="center">{part.name}</TableCell>
                    <TableCell align="center">{part.ride || 'N/A'}</TableCell>
                    <TableCell align="center">{part.quantity}</TableCell>
                    <TableCell align="center">{part.unit || 'N/A'}</TableCell>
                    <TableCell align="center">₱{Number(part.price).toFixed(2)}</TableCell>
                    <TableCell align="center">₱{part.totalAmount ? Number(part.totalAmount).toFixed(2) : (Number(part.price) * Number(part.quantity)).toFixed(2)}</TableCell>
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
                          color: getApprovalColor(part.approvalStatus) === 'success' ? 'green' :
                                getApprovalColor(part.approvalStatus) === 'warning' ? 'orange' :
                                getApprovalColor(part.approvalStatus) === 'error' ? 'red' :
                                getApprovalColor(part.approvalStatus) === 'info' ? 'blue' : 'gray',
                          borderColor: getApprovalColor(part.approvalStatus) === 'success' ? 'green' :
                                       getApprovalColor(part.approvalStatus) === 'warning' ? 'orange' :
                                       getApprovalColor(part.approvalStatus) === 'error' ? 'red' :
                                       getApprovalColor(part.approvalStatus) === 'info' ? 'blue' : 'gray',
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
                              month: 'short',
                              day: 'numeric'
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
                      {part.updated_at ? (
                        <Box>
                          <Typography variant="body2">
                            {new Date(part.updated_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </Typography>
                          <Typography variant="body2">
                            {new Date(part.updated_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </Typography>
                        </Box>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit Approval">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(part)}
                        >
                          <EditIcon />
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
          </Box>
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
              >
                Export
              </Button>
            </Box>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Ride Repairs</Typography>
                <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ride</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Issue</TableCell>
                      <TableCell>Technician</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAndSortedRepairs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">No ride repairs found</TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedRepairs.map((repair) => (
                        <TableRow key={repair.id}>
                          <TableCell>{repair.ride}</TableCell>
                          <TableCell>{new Date(repair.date).toLocaleDateString()}</TableCell>
                          <TableCell>{repair.issue}</TableCell>
                          <TableCell>{repair.technician}</TableCell>
                          <TableCell>{repair.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
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
              >
                Export
              </Button>
            </Box>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Part Deployments</Typography>
                <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Place</TableCell>
                      <TableCell>Ride</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Encoded By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAndSortedDeployments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">No deployments found</TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedDeployments.map((deployment) => (
                        <TableRow key={deployment.id}>
                          <TableCell>{new Date(deployment.date).toLocaleDateString()}</TableCell>
                          <TableCell>{deployment.place}</TableCell>
                          <TableCell>{deployment.ride}</TableCell>
                          <TableCell>{deployment.status}</TableCell>
                          <TableCell>{deployment.encoded_by}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
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
              >
                Export
              </Button>
            </Box>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Part Removals</Typography>
                <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Place</TableCell>
                      <TableCell>Ride</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Encoded By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAndSortedRemovals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">No removals found</TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedRemovals.map((removal) => (
                        <TableRow key={removal.id}>
                          <TableCell>{new Date(removal.date).toLocaleDateString()}</TableCell>
                          <TableCell>{removal.place}</TableCell>
                          <TableCell>{removal.ride}</TableCell>
                          <TableCell>{removal.status}</TableCell>
                          <TableCell>{removal.encoded_by}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
          </>
        )}

        {tabValue === 0 && (
          <>
        {/* Review Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Review Part</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Approval Status</InputLabel>
                <Select
                  value={formData.approvalStatus}
                  label="Approval Status"
                  onChange={(e) => setFormData({ ...formData, approvalStatus: e.target.value })}
                >
                  <MenuItem value="Approved">Approve</MenuItem>
                  <MenuItem value="Rejected">Reject</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes or comments about this approval..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              Update
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

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
            { header: 'Approval Status', field: 'approvalStatus' },
            { header: 'Approval Date', field: 'approval_date' },
            { header: 'Location', field: 'location' },
            { header: 'Supplier', field: 'supplier' },
            { header: 'Last Updated', field: 'updated_at' }
          ]}
        />
          </>
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
              { header: 'Encoded By', field: 'encoded_by' }
            ]}
          />
        )}
      </Box>
    </DashboardLayout>
  );
};

export default ManagerPartsInventory; 