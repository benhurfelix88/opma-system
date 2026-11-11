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
  Circle as CircleIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import ReportGenerator from '../common/ReportGenerator';
import { sparePartsAPI, rideRepairsAPI, partDeploymentsAPI, partRemovalsAPI } from '../../services/api';
import { getSocket } from '../../utils/socket';

const ManagerPartsInventory = () => {
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
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [formData, setFormData] = useState({
    approvalStatus: '',
    notes: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [openRepairApprovalDialog, setOpenRepairApprovalDialog] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [repairFormData, setRepairFormData] = useState({
    approvalStatus: '',
  });
  const [openDeploymentApprovalDialog, setOpenDeploymentApprovalDialog] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [deploymentFormData, setDeploymentFormData] = useState({
    approvalStatus: '',
  });
  const [openRemovalApprovalDialog, setOpenRemovalApprovalDialog] = useState(false);
  const [selectedRemoval, setSelectedRemoval] = useState(null);
  const [removalFormData, setRemovalFormData] = useState({
    approvalStatus: '',
  });

  useEffect(() => {
    loadParts();
    loadRideRepairs();
    loadPartDeployments();
    loadPartRemovals();

    // Setup WebSocket connection
    const socket = getSocket();

    // Listen for spare parts updates
    socket.on('spare-parts-updated', (data) => {
      console.log('Spare parts updated via WebSocket:', data);
      loadParts();
    });

    // Cleanup on unmount
    return () => {
      socket.off('spare-parts-updated');
    };
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
          ride_location: part.ride_location || '', // Add ride_location field
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
      const mappedRepairs = repairs.map(repair => ({
        ...repair,
        approval_status: repair.approval_status || 'Pending',
        approval_date: repair.approval_date
      }));
      setRideRepairs(mappedRepairs || []);
    } catch (error) {
      console.error('Error loading ride repairs:', error);
    }
  };

  const loadPartDeployments = async () => {
    try {
      const deployments = await partDeploymentsAPI.getAll();
      const mappedDeployments = deployments.map(deployment => ({
        ...deployment,
        missing_parts: deployment.missing_parts || '',
        created_at: deployment.created_at,
        updated_at: deployment.updated_at,
        approval_status: deployment.approval_status || 'Pending',
        approval_date: deployment.approval_date
      }));
      setPartDeployments(mappedDeployments || []);
    } catch (error) {
      console.error('Error loading part deployments:', error);
    }
  };

  const loadPartRemovals = async () => {
    try {
      const removals = await partRemovalsAPI.getAll();
      const mappedRemovals = removals.map(removal => ({
        ...removal,
        missing_parts: removal.missing_parts || '',
        created_at: removal.created_at,
        updated_at: removal.updated_at,
        approval_status: removal.approval_status || 'Pending',
        approval_date: removal.approval_date
      }));
      setPartRemovals(mappedRemovals || []);
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
        ride_location: originalPart?.ride_location || selectedPart.ride_location || '',
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

  const handleOpenRepairApprovalDialog = (repair = null) => {
    if (repair) {
      setSelectedRepair(repair);
      setRepairFormData({
        approvalStatus: repair.approval_status || 'Pending',
      });
    }
    setOpenRepairApprovalDialog(true);
  };

  const handleCloseRepairApprovalDialog = () => {
    setOpenRepairApprovalDialog(false);
    setSelectedRepair(null);
    setRepairFormData({
      approvalStatus: '',
    });
  };

  const handleRepairApprovalSubmit = async () => {
    if (!selectedRepair || !repairFormData.approvalStatus) {
      setSnackbar({ open: true, message: 'Please select an approval status', severity: 'warning' });
      return;
    }

    try {
      const allRepairs = await rideRepairsAPI.getAll();
      const originalRepair = allRepairs.find(r => String(r.id) === String(selectedRepair.id));

      const updatePayload = {
        ride: originalRepair?.ride || selectedRepair.ride,
        date: originalRepair?.date || selectedRepair.date,
        issue: originalRepair?.issue || selectedRepair.issue,
        parts_replaced: originalRepair?.parts_replaced || selectedRepair.parts_replaced || '',
        cost: originalRepair?.cost || selectedRepair.cost || 0,
        technician: originalRepair?.technician || selectedRepair.technician,
        status: originalRepair?.status || selectedRepair.status,
        notes: originalRepair?.notes || selectedRepair.notes || '',
        location: originalRepair?.location || selectedRepair.location || '',
        approval_status: repairFormData.approvalStatus,
        approval_date: repairFormData.approvalStatus === 'Approved' ? new Date().toISOString() : null,
      };

      await rideRepairsAPI.update(selectedRepair.id, updatePayload);

      setRideRepairs((prev) =>
        prev.map((r) =>
          String(r.id) === String(selectedRepair.id)
            ? { ...r, approval_status: repairFormData.approvalStatus, approval_date: updatePayload.approval_date }
            : r
        )
      );

      handleCloseRepairApprovalDialog();
      setSnackbar({ open: true, message: `Repair has been ${repairFormData.approvalStatus.toLowerCase()} successfully!`, severity: 'success' });
      await loadRideRepairs();
    } catch (error) {
      console.error('Error updating repair approval:', error);
      setSnackbar({ open: true, message: `Failed to update approval status: ${error.message}`, severity: 'error' });
    }
  };

  const handleOpenDeploymentApprovalDialog = (deployment = null) => {
    if (deployment) {
      setSelectedDeployment(deployment);
      setDeploymentFormData({
        approvalStatus: deployment.approval_status || 'Pending',
      });
    }
    setOpenDeploymentApprovalDialog(true);
  };

  const handleCloseDeploymentApprovalDialog = () => {
    setOpenDeploymentApprovalDialog(false);
    setSelectedDeployment(null);
    setDeploymentFormData({
      approvalStatus: '',
    });
  };

  const handleDeploymentApprovalSubmit = async () => {
    if (!selectedDeployment || !deploymentFormData.approvalStatus) {
      setSnackbar({ open: true, message: 'Please select an approval status', severity: 'warning' });
      return;
    }

    try {
      const allDeployments = await partDeploymentsAPI.getAll();
      const originalDeployment = allDeployments.find(d => String(d.id) === String(selectedDeployment.id));

      const updatePayload = {
        date: originalDeployment?.date || selectedDeployment.date,
        place: originalDeployment?.place || selectedDeployment.place,
        ride: originalDeployment?.ride || selectedDeployment.ride,
        status: originalDeployment?.status || selectedDeployment.status,
        missing_parts: originalDeployment?.missing_parts || selectedDeployment.missing_parts || '',
        encoded_by: originalDeployment?.encoded_by || selectedDeployment.encoded_by,
        approval_status: deploymentFormData.approvalStatus,
        approval_date: deploymentFormData.approvalStatus === 'Approved' ? new Date().toISOString() : null,
      };

      await partDeploymentsAPI.update(selectedDeployment.id, updatePayload);

      setPartDeployments((prev) =>
        prev.map((d) =>
          String(d.id) === String(selectedDeployment.id)
            ? { ...d, approval_status: deploymentFormData.approvalStatus, approval_date: updatePayload.approval_date }
            : d
        )
      );

      handleCloseDeploymentApprovalDialog();
      setSnackbar({ open: true, message: `Deployment has been ${deploymentFormData.approvalStatus.toLowerCase()} successfully!`, severity: 'success' });
      await loadPartDeployments();
    } catch (error) {
      console.error('Error updating deployment approval:', error);
      setSnackbar({ open: true, message: `Failed to update approval status: ${error.message}`, severity: 'error' });
    }
  };

  const handleOpenRemovalApprovalDialog = (removal = null) => {
    if (removal) {
      setSelectedRemoval(removal);
      setRemovalFormData({
        approvalStatus: removal.approval_status || 'Pending',
      });
    }
    setOpenRemovalApprovalDialog(true);
  };

  const handleCloseRemovalApprovalDialog = () => {
    setOpenRemovalApprovalDialog(false);
    setSelectedRemoval(null);
    setRemovalFormData({
      approvalStatus: '',
    });
  };

  const handleRemovalApprovalSubmit = async () => {
    if (!selectedRemoval || !removalFormData.approvalStatus) {
      setSnackbar({ open: true, message: 'Please select an approval status', severity: 'warning' });
      return;
    }

    try {
      const allRemovals = await partRemovalsAPI.getAll();
      const originalRemoval = allRemovals.find(r => String(r.id) === String(selectedRemoval.id));

      const updatePayload = {
        date: originalRemoval?.date || selectedRemoval.date,
        place: originalRemoval?.place || selectedRemoval.place,
        ride: originalRemoval?.ride || selectedRemoval.ride,
        status: originalRemoval?.status || selectedRemoval.status,
        missing_parts: originalRemoval?.missing_parts || selectedRemoval.missing_parts || '',
        encoded_by: originalRemoval?.encoded_by || selectedRemoval.encoded_by,
        approval_status: removalFormData.approvalStatus,
        approval_date: removalFormData.approvalStatus === 'Approved' ? new Date().toISOString() : null,
      };

      await partRemovalsAPI.update(selectedRemoval.id, updatePayload);

      setPartRemovals((prev) =>
        prev.map((r) =>
          String(r.id) === String(selectedRemoval.id)
            ? { ...r, approval_status: removalFormData.approvalStatus, approval_date: updatePayload.approval_date }
            : r
        )
      );

      handleCloseRemovalApprovalDialog();
      setSnackbar({ open: true, message: `Removal has been ${removalFormData.approvalStatus.toLowerCase()} successfully!`, severity: 'success' });
      await loadPartRemovals();
    } catch (error) {
      console.error('Error updating removal approval:', error);
      setSnackbar({ open: true, message: `Failed to update approval status: ${error.message}`, severity: 'error' });
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
                <TableCell align="center" sx={{ width: '30px' }}></TableCell>
                <TableCell align="center">Part Name</TableCell>
                <TableCell align="center">Ride</TableCell>
                <TableCell align="center">Ride Location</TableCell>
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
                  <TableCell colSpan={15} align="center">
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
                      backgroundColor: isRecent(part.updated_at) || isRecent(part.created_at) ? 'rgba(255, 0, 0, 0.05)' : 'inherit',
                    }}
                  >
                    <TableCell align="center" sx={{ width: '30px' }}>
                      {(isRecent(part.updated_at) || isRecent(part.created_at)) && (
                        <CircleIcon sx={{ fontSize: 8, color: 'red' }} />
                      )}
                    </TableCell>
                    <TableCell align="center">{part.name}</TableCell>
                    <TableCell align="center">{part.ride || 'N/A'}</TableCell>
                    <TableCell align="center">{part.ride_location || 'N/A'}</TableCell>
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
                          <TableCell align="center" sx={{ width: '12%' }}>Date</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Ride</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Ride Location</TableCell>
                          <TableCell align="center" sx={{ width: '18%' }}>Issue</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Parts Replaced</TableCell>
                          <TableCell align="center" sx={{ width: '10%' }}>Technician</TableCell>
                          <TableCell align="center" sx={{ width: '10%' }}>Notes</TableCell>
                          <TableCell align="center" sx={{ width: '8%' }}>Status</TableCell>
                          <TableCell align="center" sx={{ width: '8%' }}>Cost</TableCell>
                          <TableCell align="center" sx={{ width: '8%' }}>Approval Status</TableCell>
                          <TableCell align="center" sx={{ width: '8%' }}>Approval Date</TableCell>
                          <TableCell align="center" sx={{ width: '5%' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredAndSortedRepairs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={13} align="center">
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
                              <TableCell align="center">
                                {new Date(repair.date).toLocaleDateString()} {new Date(repair.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </TableCell>
                              <TableCell align="center">{repair.ride}</TableCell>
                              <TableCell align="center">{repair.location || '-'}</TableCell>
                              <TableCell align="center" sx={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repair.issue}</TableCell>
                              <TableCell align="center" sx={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repair.parts_replaced || '-'}</TableCell>
                              <TableCell align="center">{repair.technician}</TableCell>
                              <TableCell align="center" sx={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repair.notes || '-'}</TableCell>
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
                                <Chip
                                  label={repair.approval_status || 'Pending'}
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    color: getApprovalColor(repair.approval_status) === 'success' ? 'green' :
                                          getApprovalColor(repair.approval_status) === 'warning' ? 'orange' :
                                          getApprovalColor(repair.approval_status) === 'error' ? 'red' : 'gray',
                                    borderColor: getApprovalColor(repair.approval_status) === 'success' ? 'green' :
                                                 getApprovalColor(repair.approval_status) === 'warning' ? 'orange' :
                                                 getApprovalColor(repair.approval_status) === 'error' ? 'red' : 'gray',
                                    backgroundColor: 'transparent'
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                {repair.approval_date ? (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Typography variant="body2">{new Date(repair.approval_date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</Typography>
                                    <Typography variant="body2">{new Date(repair.approval_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</Typography>
                                  </Box>
                                ) : '-'}
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenRepairApprovalDialog(repair)}
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
                          <TableCell align="center" sx={{ width: '10%' }}>Approval Status</TableCell>
                          <TableCell align="center" sx={{ width: '10%' }}>Approval Date</TableCell>
                          <TableCell align="center" sx={{ width: '5%' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredAndSortedDeployments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} align="center">
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
                              <TableCell align="center">
                                <Chip
                                  label={deployment.approval_status || 'Pending'}
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    color: getApprovalColor(deployment.approval_status) === 'success' ? 'green' :
                                          getApprovalColor(deployment.approval_status) === 'warning' ? 'orange' :
                                          getApprovalColor(deployment.approval_status) === 'error' ? 'red' : 'gray',
                                    borderColor: getApprovalColor(deployment.approval_status) === 'success' ? 'green' :
                                                 getApprovalColor(deployment.approval_status) === 'warning' ? 'orange' :
                                                 getApprovalColor(deployment.approval_status) === 'error' ? 'red' : 'gray',
                                    backgroundColor: 'transparent'
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                {deployment.approval_date ? new Date(deployment.approval_date).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDeploymentApprovalDialog(deployment)}
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
                          <TableCell align="center" sx={{ width: '10%' }}>Approval Status</TableCell>
                          <TableCell align="center" sx={{ width: '10%' }}>Approval Date</TableCell>
                          <TableCell align="center" sx={{ width: '5%' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredAndSortedRemovals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} align="center">
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
                              <TableCell align="center">
                                <Chip
                                  label={removal.approval_status || 'Pending'}
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    color: getApprovalColor(removal.approval_status) === 'success' ? 'green' :
                                          getApprovalColor(removal.approval_status) === 'warning' ? 'orange' :
                                          getApprovalColor(removal.approval_status) === 'error' ? 'red' : 'gray',
                                    borderColor: getApprovalColor(removal.approval_status) === 'success' ? 'green' :
                                                 getApprovalColor(removal.approval_status) === 'warning' ? 'orange' :
                                                 getApprovalColor(removal.approval_status) === 'error' ? 'red' : 'gray',
                                    backgroundColor: 'transparent'
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                {removal.approval_date ? new Date(removal.approval_date).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenRemovalApprovalDialog(removal)}
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
          <>
          <ReportGenerator
            open={openReportDialog}
            onClose={() => setOpenReportDialog(false)}
            data={filteredAndSortedRepairs}
            title="Ride Repairs Report"
            reportType="repairs"
            columns={[
              { header: 'Date', field: 'date' },
              { header: 'Ride', field: 'ride' },
              { header: 'Ride Location', field: 'location' },
              { header: 'Issue', field: 'issue' },
              { header: 'Parts Replaced', field: 'parts_replaced' },
              { header: 'Technician', field: 'technician' },
              { header: 'Notes', field: 'notes' },
              { header: 'Status', field: 'status' },
              { header: 'Cost', field: 'cost' },
              { header: 'Approval Status', field: 'approval_status' },
              { header: 'Approval Date', field: 'approval_date' }
            ]}
          />

          {/* Repair Approval Dialog */}
          <Dialog open={openRepairApprovalDialog} onClose={handleCloseRepairApprovalDialog} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Repair</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Approval Status</InputLabel>
                  <Select
                    value={repairFormData.approvalStatus}
                    label="Approval Status"
                    onChange={(e) => setRepairFormData({ ...repairFormData, approvalStatus: e.target.value })}
                  >
                    <MenuItem value="Approved">Approve</MenuItem>
                    <MenuItem value="Rejected">Reject</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseRepairApprovalDialog}>Cancel</Button>
              <Button onClick={handleRepairApprovalSubmit} variant="contained" color="primary">
                Update
              </Button>
            </DialogActions>
          </Dialog>
          </>
        )}

        {tabValue === 2 && (
          <>
          <ReportGenerator
            open={openReportDialog}
            onClose={() => setOpenReportDialog(false)}
            data={filteredAndSortedDeployments}
            title="Part Deployments Report"
            reportType="deployments"
            columns={[
              { header: 'Date Recorded', field: 'created_at' },
              { header: 'Date of Deployment', field: 'date' },
              { header: 'Place', field: 'place' },
              { header: 'Ride', field: 'ride' },
              { header: 'Status', field: 'status' },
              { header: 'Missing Parts', field: 'missing_parts' },
              { header: 'Encoded By', field: 'encoded_by' },
              { header: 'Approval Status', field: 'approval_status' },
              { header: 'Approval Date', field: 'approval_date' }
            ]}
          />

          {/* Deployment Approval Dialog */}
          <Dialog open={openDeploymentApprovalDialog} onClose={handleCloseDeploymentApprovalDialog} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Deployment</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Approval Status</InputLabel>
                  <Select
                    value={deploymentFormData.approvalStatus}
                    label="Approval Status"
                    onChange={(e) => setDeploymentFormData({ ...deploymentFormData, approvalStatus: e.target.value })}
                  >
                    <MenuItem value="Approved">Approve</MenuItem>
                    <MenuItem value="Rejected">Reject</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDeploymentApprovalDialog}>Cancel</Button>
              <Button onClick={handleDeploymentApprovalSubmit} variant="contained" color="primary">
                Update
              </Button>
            </DialogActions>
          </Dialog>
          </>
        )}

        {tabValue === 3 && (
          <>
          <ReportGenerator
            open={openReportDialog}
            onClose={() => setOpenReportDialog(false)}
            data={filteredAndSortedRemovals}
            title="Part Removals Report"
            reportType="removals"
            columns={[
              { header: 'Date Recorded', field: 'created_at' },
              { header: 'Date of Removal', field: 'date' },
              { header: 'Place', field: 'place' },
              { header: 'Ride', field: 'ride' },
              { header: 'Status', field: 'status' },
              { header: 'Missing Parts', field: 'missing_parts' },
              { header: 'Encoded By', field: 'encoded_by' },
              { header: 'Approval Status', field: 'approval_status' },
              { header: 'Approval Date', field: 'approval_date' }
            ]}
          />

          {/* Removal Approval Dialog */}
          <Dialog open={openRemovalApprovalDialog} onClose={handleCloseRemovalApprovalDialog} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Removal</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Approval Status</InputLabel>
                  <Select
                    value={removalFormData.approvalStatus}
                    label="Approval Status"
                    onChange={(e) => setRemovalFormData({ ...removalFormData, approvalStatus: e.target.value })}
                  >
                    <MenuItem value="Approved">Approve</MenuItem>
                    <MenuItem value="Rejected">Reject</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseRemovalApprovalDialog}>Cancel</Button>
              <Button onClick={handleRemovalApprovalSubmit} variant="contained" color="primary">
                Update
              </Button>
            </DialogActions>
          </Dialog>
          </>
        )}
      </Box>
    </DashboardLayout>
  );
};

export default ManagerPartsInventory; 