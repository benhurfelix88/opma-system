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
} from '@mui/material';
import {
  Edit as EditIcon,
  PictureAsPdf as ReportIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import ReportGenerator from '../common/ReportGenerator';
import { sparePartsAPI } from '../../services/api';

const ManagerPartsInventory = () => {
  const [parts, setParts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rideFilter, setRideFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [openPartsModal, setOpenPartsModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [formData, setFormData] = useState({
    approvalStatus: '',
    notes: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openReportDialog, setOpenReportDialog] = useState(false);

  useEffect(() => {
    loadParts();
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
      
      // Update approval status in database - use approval_status column directly
      await sparePartsAPI.update(selectedPart.id, {
        part_name: originalPart?.part_name || selectedPart.part_name || selectedPart.name,
        part_number: originalPart?.part_number || selectedPart.part_number || '',
        category: originalPart?.category || selectedPart.category || '',
        quantity: originalPart?.quantity || selectedPart.quantity || 0,
        unit: originalPart?.unit || selectedPart.unit || '',
        cost: originalPart?.cost || selectedPart.cost || selectedPart.price || 0,
        status: originalPart?.status || selectedPart.status || 'Available',
        location: originalPart?.location || selectedPart.location || '',
        supplier: originalPart?.supplier || selectedPart.supplier || '',
        approval_status: formData.approvalStatus, // Store approval status directly in database column
        notes: formData.notes || '', // Store notes separately
      });

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
      setSnackbar({ open: true, message: 'Failed to update approval status', severity: 'error' });
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
    .filter((part) => {
      // Ride filter
      if (rideFilter !== 'all') {
        return part.ride === rideFilter;
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
            <Button
              variant="outlined"
              size="small"
              onClick={() => setOpenPartsModal(true)}
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
                {rideFilter === 'all' ? 'All Parts' : rideFilter}
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
                <TableCell align="center">Last Updated</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedParts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">
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

        {/* Parts Selection Modal */}
        <Dialog 
          open={openPartsModal} 
          onClose={() => setOpenPartsModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Select Ride Parts</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              <Box
                onClick={() => {
                  setRideFilter('all');
                  setOpenPartsModal(false);
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
                  All Parts
                </Typography>
              </Box>
              {[...new Set(parts.map(part => part.ride).filter(Boolean))].sort().map(ride => (
                <Box
                  key={ride}
                  onClick={() => {
                    setRideFilter(ride);
                    setOpenPartsModal(false);
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
            <Button onClick={() => setOpenPartsModal(false)}>Close</Button>
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
            { header: 'Location', field: 'location' },
            { header: 'Supplier', field: 'supplier' },
            { header: 'Last Updated', field: 'updated_at' }
          ]}
        />
      </Box>
    </DashboardLayout>
  );
};

export default ManagerPartsInventory; 