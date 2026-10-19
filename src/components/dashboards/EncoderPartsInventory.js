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
  List,
  ListItem,
  ListItemText,
  Alert,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Tooltip,
  Tabs,
  Tab,
  Snackbar,
} from '@mui/material';
import DashboardLayout from '../layout/DashboardLayout';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { keyframes } from '@mui/system';
import { sparePartsAPI, ridesAPI, rideRepairsAPI, partDeploymentsAPI, partRemovalsAPI, rideStatusAPI } from '../../services/api';

// Define animations
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const LOW_STOCK_THRESHOLD = 10;
const DEPLOYMENT_REMOVAL_STATUS_OPTIONS = ['Complete', 'Defective', 'Missing'];
const VISIBLE_LIST_LIMIT = 8;
const RIDE_LIST_ITEM_HEIGHT = 48;
const PARTS_TABLE_ROW_HEIGHT = 52;
const PARTS_TABLE_HEADER_HEIGHT = 56;

const computeStockStatus = (quantity) => {
  const qty = Number(quantity) || 0;
  if (qty <= 0) return 'Out of Stock';
  if (qty <= LOW_STOCK_THRESHOLD) return 'Low Stock';
  return 'In Stock';
};

const parseApprovalStatus = (part) => {
  let approvalStatus = part.approval_status || 'Pending';
  let notes = part.notes || '';
  if (!part.approval_status && part.notes) {
    try {
      const parsed = JSON.parse(part.notes);
      if (parsed.approvalStatus) {
        approvalStatus = parsed.approvalStatus;
        notes = parsed.notes || '';
      }
    } catch {
      // notes is plain text
    }
  }
  return { approvalStatus, notes };
};

const EncoderPartsInventory = ({ repairsReadOnly = false }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedRide, setSelectedRide] = useState('');
  const [rides, setRides] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [rideStatusMap, setRideStatusMap] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningAction, setWarningAction] = useState(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [detailsData, setDetailsData] = useState(null);
  const [rideSelectionModalOpen, setRideSelectionModalOpen] = useState(false);
  const [partsSelectionModalOpen, setPartsSelectionModalOpen] = useState(false);
  const [deploymentRideModalOpen, setDeploymentRideModalOpen] = useState(false);
  const [removalRideModalOpen, setRemovalRideModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: '',
    price: '',
    totalAmount: '',
    status: 'In Stock',
    location: '',
    supplier: '',
    ride: '',
  });
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
  const [deployments, setDeployments] = useState([]);
  const [removals, setRemovals] = useState([]);
  const [deploymentRemovalMode, setDeploymentRemovalMode] = useState('deployment');
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [selectedRemoval, setSelectedRemoval] = useState(null);
  const [deploymentData, setDeploymentData] = useState({
    date: '',
    place: '',
    ride: '',
    status: 'Complete',
    encodedBy: '',
  });
  const [removalData, setRemovalData] = useState({
    date: '',
    place: '',
    ride: '',
    status: 'Complete',
    encodedBy: '',
  });
  const [summaryMode, setSummaryMode] = useState('deployment');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });
  const [repairSortBy, setRepairSortBy] = useState('date-desc');

  const loadRidesFromManager = async () => {
    try {
      const list = await ridesAPI.getAll();
      const names = (list || []).map((r) => r.name).filter(Boolean);
      setRides(names);
      setSelectedRide((prev) => (prev && !names.includes(prev) ? '' : prev));
    } catch (e) {
      console.error('Error loading rides:', e);
    }
  };

  useEffect(() => {
    loadParts();
    loadRidesFromManager();
    const loadData = async () => {
      try {
        await loadRidesFromManager();

        // Load repairs from API
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
        
        // Load ride statuses
        const statuses = await rideStatusAPI.get();
        setRideStatusMap(statuses || {});
        
        // Load deployments from API
        const deploymentsList = await partDeploymentsAPI.getAll();
        const mappedDeployments = deploymentsList.map(deployment => ({
          id: deployment.id,
          date: deployment.date,
          place: deployment.place,
          ride: deployment.ride,
          status: deployment.status,
          encodedBy: deployment.encoded_by,
        }));
        setDeployments(mappedDeployments);

        // Load removals from API
        const removalsList = await partRemovalsAPI.getAll();
        const mappedRemovals = removalsList.map(removal => ({
          id: removal.id,
          date: removal.date,
          place: removal.place,
          ride: removal.ride,
          status: removal.status,
          encodedBy: removal.encoded_by,
        }));
        setRemovals(mappedRemovals);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
    const syncInterval = setInterval(() => {
      loadRidesFromManager();
      loadParts();
    }, 300000);
    return () => clearInterval(syncInterval);
  }, []);

  const loadParts = async () => {
    try {
      const allParts = await sparePartsAPI.getAll();
      // Map database fields to component fields
      const mappedParts = allParts.map(part => {
        const { approvalStatus } = parseApprovalStatus(part);
        return {
          ...part,
          id: part.id,
          name: part.part_name || part.name,
          quantity: part.quantity || 0,
          unit: part.unit || '',
          price: part.cost || part.price || 0,
          status: part.status || 'In Stock',
          location: part.location || '',
          supplier: part.supplier || '',
          ride: part.ride || '', // Use actual ride field from database
          category: part.category || '',
          approvalStatus,
          totalAmount: (part.cost || 0) * (part.quantity || 0),
          lastUpdated: part.updated_at || part.created_at || new Date().toISOString(),
        };
      });
      setSpareParts(mappedParts);
      setFilteredParts(mappedParts);
    } catch (error) {
      console.error('Error loading parts:', error);
    }
  };

  useEffect(() => {
    const rideSet = new Set(rides);
    if (selectedRide) {
      setFilteredParts(spareParts.filter((part) => part.ride === selectedRide));
    } else {
      setFilteredParts(
        spareParts.filter((part) => part.ride && rideSet.has(part.ride))
      );
    }
  }, [selectedRide, spareParts, rides]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleRideSelect = (ride) => {
    setSelectedRide(ride);
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setSelectedItem(item);
      const totalAmount = item.price && item.quantity ? (Number(item.price) * Number(item.quantity)).toFixed(2) : '';
      setFormData({
        ...item,
        totalAmount,
        ride: item.ride || selectedRide,
        status: computeStockStatus(item.quantity || 0),
      });
    } else {
      setSelectedItem(null);
      setFormData({
        name: '',
        quantity: '',
        unit: '',
        price: '',
        totalAmount: '',
        status: computeStockStatus(''),
        location: '',
        supplier: '',
        ride: selectedRide || '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
    setFormData({
      name: '',
      quantity: '',
      unit: '',
      price: '',
      totalAmount: '',
      status: computeStockStatus(''),
      location: '',
      supplier: '',
      ride: selectedRide,
    });
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name || !formData.quantity || !formData.price || !formData.status || !formData.supplier) {
      setWarningMessage('Please fill in all required fields before adding the item.');
      setWarningAction(() => () => {
        setOpenWarningModal(false);
      });
      setOpenWarningModal(true);
      return;
    }

    try {
      const stockStatus = selectedItem
        ? (formData.status || computeStockStatus(formData.quantity))
        : computeStockStatus(formData.quantity);
      const partPayload = {
        part_name: formData.name,
        part_number: formData.part_number || '',
        category: formData.category || '',
        ride: selectedRide || '', // Use selectedRide from the filter
        quantity: Number(formData.quantity) || 0,
        unit: formData.unit || '',
        location: formData.location || '',
        supplier: formData.supplier || '',
        cost: Number(formData.price) || 0,
        status: stockStatus,
      };

      if (selectedItem) {
        await sparePartsAPI.update(selectedItem.id, partPayload);
        setSnackbar({ open: true, message: 'Part updated successfully', severity: 'success' });
      } else {
        await sparePartsAPI.create(partPayload);
        setSnackbar({ open: true, message: 'Part added successfully', severity: 'success' });
      }

      await loadParts();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving part:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save part';
      setSnackbar({ open: true, message: `Error: ${errorMessage}`, severity: 'error' });
    }
  };

  const handleDelete = (id) => {
    const partToDelete = spareParts.find(part => part.id === id);
    const warningText = `Are you sure you want to delete this part?\n\nPart Name: ${partToDelete?.name || 'N/A'}\nRide: ${partToDelete?.ride || 'N/A'}\nQuantity: ${partToDelete?.quantity || 'N/A'}\nPrice: ₱${partToDelete?.price ? Number(partToDelete.price).toFixed(2) : 'N/A'}\nStatus: ${partToDelete?.status || 'N/A'}`;
    
    setDeleteDialog({
      open: true,
      title: 'Delete Part',
      message: warningText,
      onConfirm: async () => {
        try {
          await sparePartsAPI.delete(id);
          await loadParts();
          setSnackbar({ open: true, message: 'Part deleted successfully', severity: 'success' });
        } catch (error) {
          console.error('Error deleting part:', error);
          setSnackbar({ open: true, message: 'Failed to delete part', severity: 'error' });
        } finally {
          setDeleteDialog(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Stock':
        return 'success';
      case 'Low Stock':
        return 'warning';
      case 'Out of Stock':
        return 'error';
      default:
        return 'default';
    }
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

  const handleOpenRepairDialog = (repair = null) => {
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
        date: new Date().toISOString().split('T')[0],
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

  const handleCloseRepairDialog = () => {
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

  const handleOpenDetailsDialog = (repair, stats) => {
    setDetailsData({ repair, stats });
    setOpenDetailsDialog(true);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setDetailsData(null);
  };

  const getRepairPartsForRide = (ride) => {
    if (!ride) return [];
    return spareParts.filter((part) => part.ride === ride);
  };

  const getSortedRepairs = () => {
    const sortedRepairs = [...repairs];
    switch (repairSortBy) {
      case 'date-desc':
        return sortedRepairs.sort((a, b) => new Date(b.date) - new Date(a.date));
      case 'date-asc':
        return sortedRepairs.sort((a, b) => new Date(a.date) - new Date(b.date));
      case 'ride-asc':
        return sortedRepairs.sort((a, b) => a.ride.localeCompare(b.ride));
      case 'ride-desc':
        return sortedRepairs.sort((a, b) => b.ride.localeCompare(a.ride));
      case 'cost-desc':
        return sortedRepairs.sort((a, b) => Number(b.cost) - Number(a.cost));
      case 'cost-asc':
        return sortedRepairs.sort((a, b) => Number(a.cost) - Number(b.cost));
      default:
        return sortedRepairs;
    }
  };

  const handleSubmitRepair = async () => {
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
        await rideRepairsAPI.update(selectedRepair.id, repairPayload);
      } else {
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
      handleCloseRepairDialog();
      setSnackbar({ open: true, message: selectedRepair ? 'Repair updated successfully' : 'Repair added successfully', severity: 'success' });
    } catch (error) {
      console.error('Error saving repair:', error);
      setSnackbar({ open: true, message: 'Failed to save repair', severity: 'error' });
    }
  };

  const handleDeleteRepair = (id) => {
    const repairToDelete = repairs.find(repair => repair.id === id);
    const repairDate = repairToDelete?.date ? new Date(repairToDelete.date).toLocaleDateString() : 'N/A';
    setWarningMessage(`Are you sure you want to delete this repair record?\n\nRide: ${repairToDelete?.ride || 'N/A'}\nDate: ${repairDate}\nIssue: ${repairToDelete?.issue || 'N/A'}\nTechnician: ${repairToDelete?.technician || 'N/A'}`);
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
        setSnackbar({ open: true, message: 'Repair deleted successfully', severity: 'success' });
      } catch (error) {
        console.error('Error deleting repair:', error);
        setSnackbar({ open: true, message: 'Failed to delete repair', severity: 'error' });
      } finally {
        setOpenWarningModal(false);
      }
    });
    setOpenWarningModal(true);
  };

  const getRepairStats = (ride) => {
    const rideRepairs = repairs.filter(repair => repair.ride === ride);
    return {
      totalRepairs: rideRepairs.length,
      totalCost: rideRepairs.reduce((sum, repair) => sum + (Number(repair.cost) || 0), 0),
      lastRepair: rideRepairs.length > 0 ? new Date(Math.max(...rideRepairs.map(r => new Date(r.date)))) : null,
    };
  };

  const handleDeploymentRemovalModeChange = (event, newValue) => {
    setDeploymentRemovalMode(newValue ?? event.target.value);
  };

  const handleDeploymentStatusChange = async (id, newStatus) => {
    const deployment = deployments.find((item) => item.id === id);
    if (!deployment || deployment.status === newStatus) return;
    try {
      await partDeploymentsAPI.update(id, {
        date: deployment.date,
        place: deployment.place,
        ride: deployment.ride,
        parts: deployment.parts,
        quantity: Number(deployment.quantity),
        status: newStatus,
        encoded_by: deployment.encodedBy,
      });
      setDeployments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
      setSnackbar({ open: true, message: 'Deployment status updated', severity: 'success' });
    } catch (error) {
      console.error('Error updating deployment status:', error);
      setSnackbar({ open: true, message: 'Failed to update deployment status', severity: 'error' });
    }
  };

  const handleRemovalStatusChange = async (id, newStatus) => {
    const removal = removals.find((item) => item.id === id);
    if (!removal || removal.status === newStatus) return;
    try {
      await partRemovalsAPI.update(id, {
        date: removal.date,
        place: removal.place,
        ride: removal.ride,
        parts: removal.parts,
        quantity: Number(removal.quantity),
        status: newStatus,
        encoded_by: removal.encodedBy,
      });
      setRemovals((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
      setSnackbar({ open: true, message: 'Removal status updated', severity: 'success' });
    } catch (error) {
      console.error('Error updating removal status:', error);
      setSnackbar({ open: true, message: 'Failed to update removal status', severity: 'error' });
    }
  };

  const handleOpenDeploymentDialog = (deployment = null) => {
    setSelectedDeployment(deployment);
    setDeploymentData(deployment ? {
      date: deployment.date,
      place: deployment.place,
      ride: deployment.ride,
      status: deployment.status,
      encodedBy: deployment.encodedBy
    } : {
      date: new Date().toISOString().split('T')[0],
      place: '',
      ride: '',
      status: 'Complete',
      encodedBy: ''
    });
    setOpenDialog(true);
  };

  const handleCloseDeploymentDialog = () => {
    setSelectedDeployment(null);
    setDeploymentData({
      date: new Date().toISOString().split('T')[0],
      place: '',
      ride: '',
      status: 'Complete',
      encodedBy: ''
    });
    setOpenDialog(false);
  };

  const handleSubmitDeployment = async () => {
    if (!deploymentData.date || !deploymentData.place || !deploymentData.ride || !deploymentData.status || !deploymentData.encodedBy) {
      setWarningMessage('Please fill in all fields');
      setWarningAction(() => () => setOpenWarningModal(false));
      setOpenWarningModal(true);
      return;
    }
    
    try {
      const deploymentPayload = {
        date: deploymentData.date,
        place: deploymentData.place,
        ride: deploymentData.ride,
        status: deploymentData.status,
        encoded_by: deploymentData.encodedBy,
      };

      if (selectedDeployment) {
        await partDeploymentsAPI.update(selectedDeployment.id, deploymentPayload);
      } else {
        await partDeploymentsAPI.create(deploymentPayload);
      }

      // Reload deployments from API
      const deploymentsList = await partDeploymentsAPI.getAll();
      const mappedDeployments = deploymentsList.map(deployment => ({
        id: deployment.id,
        date: deployment.date,
        place: deployment.place,
        ride: deployment.ride,
        status: deployment.status,
        encodedBy: deployment.encoded_by,
      }));
      setDeployments(mappedDeployments);
      handleCloseDeploymentDialog();
      setSnackbar({ open: true, message: selectedDeployment ? 'Deployment updated successfully' : 'Deployment added successfully', severity: 'success' });
    } catch (error) {
      console.error('Error saving deployment:', error);
      setSnackbar({ open: true, message: 'Failed to save deployment', severity: 'error' });
    }
  };

  const handleDeleteDeployment = (id) => {
    const deploymentToDelete = deployments.find(deployment => deployment.id === id);
    const deploymentDate = deploymentToDelete?.date ? new Date(deploymentToDelete.date).toLocaleDateString() : 'N/A';
    setWarningMessage(`Are you sure you want to delete this deployment record?\n\nRide: ${deploymentToDelete?.ride || 'N/A'}\nDate: ${deploymentDate}\nParts: ${deploymentToDelete?.parts || 'N/A'}\nQuantity: ${deploymentToDelete?.quantity || 'N/A'}\nPlace: ${deploymentToDelete?.place || 'N/A'}`);
    setWarningAction(async () => {
      try {
        await partDeploymentsAPI.delete(id);
        // Reload deployments from API
        const deploymentsList = await partDeploymentsAPI.getAll();
        const mappedDeployments = deploymentsList.map(deployment => ({
          id: deployment.id,
          date: deployment.date,
          place: deployment.place,
          ride: deployment.ride,
          parts: deployment.parts,
          quantity: deployment.quantity,
          status: deployment.status,
          encodedBy: deployment.encoded_by,
        }));
        setDeployments(mappedDeployments);
        setSnackbar({ open: true, message: 'Deployment deleted successfully', severity: 'success' });
      } catch (error) {
        console.error('Error deleting deployment:', error);
        setSnackbar({ open: true, message: 'Failed to delete deployment', severity: 'error' });
      } finally {
        setOpenWarningModal(false);
      }
    });
    setOpenWarningModal(true);
  };

  const handleOpenRemovalDialog = (removal = null) => {
    setSelectedRemoval(removal);
    setRemovalData(removal ? {
      date: removal.date,
      place: removal.place,
      ride: removal.ride,
      status: removal.status,
      encodedBy: removal.encoded_by
    } : {
      date: new Date().toISOString().split('T')[0],
      place: '',
      ride: '',
      status: 'Complete',
      encodedBy: ''
    });
    setOpenDialog(true);
  };

  const handleCloseRemovalDialog = () => {
    setSelectedRemoval(null);
    setRemovalData({
      date: new Date().toISOString().split('T')[0],
      place: '',
      ride: '',
      status: 'Complete',
      encodedBy: ''
    });
    setOpenDialog(false);
  };

  const handleSubmitRemoval = async () => {
    if (!removalData.date || !removalData.place || !removalData.ride || !removalData.status || !removalData.encodedBy) {
      setWarningMessage('Please fill in all required fields');
      setWarningAction(() => () => setOpenWarningModal(false));
      setOpenWarningModal(true);
      return;
    }
    
    try {
      const removalPayload = {
        date: removalData.date,
        place: removalData.place,
        ride: removalData.ride,
        status: removalData.status,
        encoded_by: removalData.encodedBy,
      };

      if (selectedRemoval) {
        await partRemovalsAPI.update(selectedRemoval.id, removalPayload);
      } else {
        await partRemovalsAPI.create(removalPayload);
      }

      // Reload removals from API
      const removalsList = await partRemovalsAPI.getAll();
      const mappedRemovals = removalsList.map(removal => ({
        id: removal.id,
        date: removal.date,
        place: removal.place,
        ride: removal.ride,
        status: removal.status,
        encodedBy: removal.encoded_by,
      }));
      setRemovals(mappedRemovals);
      handleCloseRemovalDialog();
      setSnackbar({ open: true, message: selectedRemoval ? 'Removal updated successfully' : 'Removal added successfully', severity: 'success' });
    } catch (error) {
      console.error('Error saving removal:', error);
      setSnackbar({ open: true, message: 'Failed to save removal', severity: 'error' });
    }
  };

  const handleDeleteRemoval = (id) => {
    const removalToDelete = removals.find(removal => removal.id === id);
    const removalDate = removalToDelete?.date ? new Date(removalToDelete.date).toLocaleDateString() : 'N/A';
    setWarningMessage(`Are you sure you want to delete this removal record?\n\nRide: ${removalToDelete?.ride || 'N/A'}\nDate: ${removalDate}\nParts: ${removalToDelete?.parts || 'N/A'}\nQuantity: ${removalToDelete?.quantity || 'N/A'}\nPlace: ${removalToDelete?.place || 'N/A'}`);
    setWarningAction(async () => {
      try {
        await partRemovalsAPI.delete(id);
        // Reload removals from API
        const removalsList = await partRemovalsAPI.getAll();
        const mappedRemovals = removalsList.map(removal => ({
          id: removal.id,
          date: removal.date,
          place: removal.place,
          ride: removal.ride,
          parts: removal.parts,
          quantity: removal.quantity,
          status: removal.status,
          encodedBy: removal.encoded_by,
        }));
        setRemovals(mappedRemovals);
        setSnackbar({ open: true, message: 'Removal deleted successfully', severity: 'success' });
      } catch (error) {
        console.error('Error deleting removal:', error);
        setSnackbar({ open: true, message: 'Failed to delete removal', severity: 'error' });
      } finally {
        setOpenWarningModal(false);
      }
    });
    setOpenWarningModal(true);
  };

  return (
    <DashboardLayout title="Ride Parts Inventory">
      <Box sx={{ p: 3, animation: `${fadeIn} 0.5s ease-out` }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={selectedTab} onChange={handleTabChange} aria-label="inventory tabs">
            <Tab label="Ride Parts Inventory" />
            <Tab label="Ride Repairs" />
            <Tab label="Deployment/Removal" />
            <Tab label="History" />
          </Tabs>
        </Box>

        {selectedTab === 0 ? (
          // Ride Parts Inventory Content
        <Grid container spacing={3}>
          {/* Rides Section */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Rides
              </Typography>
              <Box
                sx={{
                  maxHeight: VISIBLE_LIST_LIMIT * RIDE_LIST_ITEM_HEIGHT + 56,
                  overflowY: 'auto',
                  pr: 0.5,
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: 3,
                  },
                }}
              >
                <List dense disablePadding>
                  <ListItem
                    button
                    selected={selectedRide === ''}
                    onClick={() => handleRideSelect('')}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 0.5,
                      minHeight: RIDE_LIST_ITEM_HEIGHT,
                    }}
                  >
                    <ListItemText primary="View All" />
                  </ListItem>
                  {rides.map((ride) => (
                    <ListItem
                      key={ride}
                      button
                      selected={selectedRide === ride}
                      onClick={() => handleRideSelect(ride)}
                      sx={{ minHeight: RIDE_LIST_ITEM_HEIGHT }}
                    >
                      <ListItemText primary={ride} primaryTypographyProps={{ noWrap: true }} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Paper>
          </Grid>

          {/* Inventory Section */}
          <Grid item xs={12} md={9}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5">
                {selectedRide ? `${selectedRide} Parts` : 'Ride Parts Inventory'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    if (!selectedRide) {
                      setWarningMessage('Please select a ride first before adding parts.');
                      setWarningAction(() => () => {
                        setOpenWarningModal(false);
                      });
                      setOpenWarningModal(true);
                    } else {
                      handleOpenDialog();
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
            </Box>
            <Paper sx={{ p: 2, position: 'relative' }}>
              <IconButton
                onClick={() => {
                  const container = document.getElementById('parts-table-container');
                  if (container) {
                    container.scrollBy({ left: -200, behavior: 'smooth' });
                  }
                }}
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  backgroundColor: 'transparent',
                  boxShadow: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <TableContainer
                id="parts-table-container"
                sx={{
                  maxHeight: PARTS_TABLE_HEADER_HEIGHT + VISIBLE_LIST_LIMIT * PARTS_TABLE_ROW_HEIGHT,
                  overflowY: 'auto',
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': {
                    height: '8px',
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
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f3f0f7' }}>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Part Name</TableCell>
                      {!selectedRide && (
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Ride</TableCell>
                      )}
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Quantity</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Unit</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Price</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Total Amount</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Status</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Location</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Supplier</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Last Updated</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Approval Status</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredParts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={selectedRide ? 11 : 12} align="center">
                          <Typography variant="body1" color="text.secondary">
                            No parts found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredParts.map((part) => (
                        <TableRow key={part.id}>
                          <TableCell align="center">{part.name}</TableCell>
                          {!selectedRide && (
                            <TableCell align="center">{part.ride}</TableCell>
                          )}
                          <TableCell align="center">{part.quantity}</TableCell>
                          <TableCell align="center">{part.unit || 'N/A'}</TableCell>
                          <TableCell align="center">₱{Number(part.price).toFixed(2)}</TableCell>
                          <TableCell align="center">₱{part.totalAmount ? Number(part.totalAmount).toFixed(2) : (Number(part.price) * Number(part.quantity)).toFixed(2)}</TableCell>
                          <TableCell align="center">
                              <Chip
                                label={part.status}
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
                          <TableCell align="center">{part.location}</TableCell>
                          <TableCell align="center">{part.supplier}</TableCell>
                          <TableCell align="center">{new Date(part.lastUpdated).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={part.approvalStatus || 'Pending'}
                              variant="outlined"
                              size="small"
                              sx={{
                                color: getApprovalColor(part.approvalStatus) === 'success' ? 'green' :
                                      getApprovalColor(part.approvalStatus) === 'warning' ? 'orange' :
                                      getApprovalColor(part.approvalStatus) === 'error' ? 'red' : 'gray',
                                borderColor: getApprovalColor(part.approvalStatus) === 'success' ? 'green' :
                                             getApprovalColor(part.approvalStatus) === 'warning' ? 'orange' :
                                             getApprovalColor(part.approvalStatus) === 'error' ? 'red' : 'gray',
                                backgroundColor: 'transparent',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <IconButton onClick={() => handleOpenDialog(part)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton onClick={() => handleDelete(part.id)}>
                              <DeleteIcon />
                            </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <IconButton
                onClick={() => {
                  const container = document.getElementById('parts-table-container');
                  if (container) {
                    container.scrollBy({ left: 200, behavior: 'smooth' });
                  }
                }}
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  backgroundColor: 'transparent',
                  boxShadow: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Paper>
          </Grid>
        </Grid>
        ) : selectedTab === 1 ? (
          // Ride Repairs Content
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box></Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={repairSortBy}
                      label="Sort By"
                      onChange={(e) => setRepairSortBy(e.target.value)}
                    >
                      <MenuItem value="date-desc">Date (Newest)</MenuItem>
                      <MenuItem value="date-asc">Date (Oldest)</MenuItem>
                      <MenuItem value="ride-asc">Ride (A-Z)</MenuItem>
                      <MenuItem value="ride-desc">Ride (Z-A)</MenuItem>
                      <MenuItem value="cost-desc">Cost (High-Low)</MenuItem>
                      <MenuItem value="cost-asc">Cost (Low-High)</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenRepairDialog()}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
              <Paper sx={{ p: 2, position: 'relative' }}>
                <TableContainer
                  id="repairs-table-container"
                  sx={{
                    overflowX: 'auto',
                    '&::-webkit-scrollbar': {
                      height: '8px',
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
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f3f0f7' }}>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Date</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Rides</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Issue</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Parts Replaced</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Cost</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Status</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Technician</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Notes</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getSortedRepairs().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center">
                          <Typography variant="body1" color="text.secondary">
                            No repair records found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      getSortedRepairs().map((repair) => {
                        const stats = getRepairStats(repair.ride);
                        return (
                          <TableRow key={repair.id}>
                            <TableCell align="center">{new Date(repair.date).toLocaleDateString()}</TableCell>
                            <TableCell align="center">{repair.ride}</TableCell>
                            <TableCell align="center">{repair.issue}</TableCell>
                            <TableCell align="center">{repair.partsReplaced}</TableCell>
                            <TableCell align="center">₱{Number(repair.cost).toFixed(2)}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={repair.status}
                                variant="outlined"
                                size="small"
                                sx={{ 
                                  color: getStatusColor(repair.status) === 'success' ? 'green' : 
                                        getStatusColor(repair.status) === 'warning' ? 'orange' : 
                                        getStatusColor(repair.status) === 'error' ? 'red' : 
                                        getStatusColor(repair.status) === 'info' ? 'blue' : 'gray',
                                  borderColor: getStatusColor(repair.status) === 'success' ? 'green' : 
                                               getStatusColor(repair.status) === 'warning' ? 'orange' : 
                                               getStatusColor(repair.status) === 'error' ? 'red' : 
                                               getStatusColor(repair.status) === 'info' ? 'blue' : 'gray',
                                  backgroundColor: 'transparent'
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">{repair.technician}</TableCell>
                            <TableCell align="center">
                              {repair.notes && repair.notes.length > 30 
                                ? repair.notes.substring(0, 30) + '...' 
                                : repair.notes}
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDetailsDialog(repair, stats)}
                                  >
                                    <InfoIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenRepairDialog(repair)}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteRepair(repair.id)}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            </Grid>
          </Grid>
        ) : selectedTab === 2 ? (
          // Deployment/Removal Content (merged single page)
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Tabs
                value={deploymentRemovalMode}
                onChange={handleDeploymentRemovalModeChange}
                sx={{ minHeight: 40 }}
              >
                <Tab value="deployment" label="Deployment" sx={{ minHeight: 40 }} />
                <Tab value="removal" label="Removal" sx={{ minHeight: 40 }} />
              </Tabs>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => deploymentRemovalMode === 'deployment' ? handleOpenDeploymentDialog() : handleOpenRemovalDialog()}
              >
                Add
              </Button>
            </Box>
            <Paper sx={{ p: 2, position: 'relative' }}>
              <TableContainer
                id="deployment-table-container"
                sx={{
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': {
                    height: '8px',
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
                <Table>
                  {deploymentRemovalMode === 'deployment' ? (
                    <>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f3f0f7' }}>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Date of Deployment</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Place of Installation</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Name of Ride</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Status</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deployments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <Typography variant="body1" color="text.secondary">
                                No deployment records found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          deployments.map((deployment) => (
                            <TableRow key={deployment.id}>
                              <TableCell align="center">{new Date(deployment.date).toLocaleDateString()}</TableCell>
                              <TableCell align="center">{deployment.place}</TableCell>
                              <TableCell align="center">{deployment.ride}</TableCell>
                              <TableCell align="center">
                                <FormControl size="small" sx={{ minWidth: 130 }}>
                                  <Select
                                    value={deployment.status}
                                    onChange={(e) => handleDeploymentStatusChange(deployment.id, e.target.value)}
                                  >
                                    {DEPLOYMENT_REMOVAL_STATUS_OPTIONS.map((status) => (
                                      <MenuItem key={status} value={status}>{status}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleOpenDeploymentDialog(deployment)}>
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" onClick={() => handleDeleteDeployment(deployment.id)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </>
                  ) : (
                    <>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f3f0f7' }}>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Date of Removal</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Place</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Ride</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Status</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {removals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <Typography variant="body1" color="text.secondary">
                                No removal records found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          removals.map((removal) => (
                            <TableRow key={removal.id}>
                              <TableCell align="center">{new Date(removal.date).toLocaleDateString()}</TableCell>
                              <TableCell align="center">{removal.place}</TableCell>
                              <TableCell align="center">{removal.ride}</TableCell>
                              <TableCell align="center">
                                <FormControl size="small" sx={{ minWidth: 130 }}>
                                  <Select
                                    value={removal.status}
                                    onChange={(e) => handleRemovalStatusChange(removal.id, e.target.value)}
                                  >
                                    {DEPLOYMENT_REMOVAL_STATUS_OPTIONS.map((status) => (
                                      <MenuItem key={status} value={status}>{status}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleOpenRemovalDialog(removal)}>
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" onClick={() => handleDeleteRemoval(removal.id)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </>
                  )}
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        ) : (
          // History Content
          <Box>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControl size="small">
                <InputLabel>Type</InputLabel>
                <Select value={summaryMode} onChange={e => setSummaryMode(e.target.value)} label="Type">
                  <MenuItem value="deployment">Deployment</MenuItem>
                  <MenuItem value="removal">Removal</MenuItem>
                  <MenuItem value="parts">Ride Parts Inventory</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Paper sx={{ p: 2, position: 'relative' }}>
              <TableContainer
                id="history-table-container"
                sx={{
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': {
                    height: '8px',
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
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f3f0f7' }}>
                      {summaryMode === 'parts' ? (
                        <>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Part Name</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Ride</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Quantity</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Unit</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Price</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Status</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Location</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Supplier</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Last Updated</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Date</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Rides</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Parts</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Quantity</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Price</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Supplier</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Status</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 2, borderBottom: '2px solid #e0e0e0', backgroundColor: '#f3f0f7' }}>Last Updated</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summaryMode === 'deployment' && (
                      deployments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Typography variant="body1" color="text.secondary">
                              No deployment records found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        deployments.map((item) => {
                          const part = spareParts.find(p => p.name === item.parts && p.ride === item.ride);
                          return (
                            <TableRow key={item.id}>
                              <TableCell align="center">{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</TableCell>
                              <TableCell align="center">{item.ride || 'N/A'}</TableCell>
                              <TableCell align="center">{item.parts || 'N/A'}</TableCell>
                              <TableCell align="center">{item.quantity || 'N/A'}</TableCell>
                              <TableCell align="center">{part?.price ? `₱${Number(part.price).toFixed(2)}` : 'N/A'}</TableCell>
                              <TableCell align="center">{part?.supplier || 'N/A'}</TableCell>
                              <TableCell align="center">{item.status || 'N/A'}</TableCell>
                              <TableCell align="center">{item.date ? new Date(item.date).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</TableCell>
                            </TableRow>
                          );
                        })
                      )
                    )}
                    {summaryMode === 'removal' && (
                      removals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Typography variant="body1" color="text.secondary">
                              No removal records found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        removals.map((item) => {
                          const part = spareParts.find(p => p.name === item.parts && p.ride === item.ride);
                          return (
                            <TableRow key={item.id}>
                              <TableCell align="center">{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</TableCell>
                              <TableCell align="center">{item.ride || 'N/A'}</TableCell>
                              <TableCell align="center">{item.parts || 'N/A'}</TableCell>
                              <TableCell align="center">{item.quantity || 'N/A'}</TableCell>
                              <TableCell align="center">{part?.price ? `₱${Number(part.price).toFixed(2)}` : 'N/A'}</TableCell>
                              <TableCell align="center">{part?.supplier || 'N/A'}</TableCell>
                              <TableCell align="center">{item.status || 'N/A'}</TableCell>
                              <TableCell align="center">{item.date ? new Date(item.date).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</TableCell>
                            </TableRow>
                          );
                        })
                      )
                    )}
                    {summaryMode === 'parts' && (
                      spareParts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            <Typography variant="body1" color="text.secondary">
                              No parts inventory records found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        spareParts.map((part) => (
                          <TableRow key={part.id}>
                            <TableCell align="center">{part.name || 'N/A'}</TableCell>
                            <TableCell align="center">{part.ride || 'N/A'}</TableCell>
                            <TableCell align="center">{part.quantity || 'N/A'}</TableCell>
                            <TableCell align="center">{part.unit || 'N/A'}</TableCell>
                            <TableCell align="center">{part.price ? `₱${Number(part.price).toFixed(2)}` : 'N/A'}</TableCell>
                            <TableCell align="center">{part.status || 'N/A'}</TableCell>
                            <TableCell align="center">{part.location || 'N/A'}</TableCell>
                            <TableCell align="center">{part.supplier || 'N/A'}</TableCell>
                            <TableCell align="center">{part.lastUpdated ? new Date(part.lastUpdated).toLocaleString() : 'N/A'}</TableCell>
                          </TableRow>
                        ))
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={
          selectedTab === 0 ? handleCloseDialog :
          selectedTab === 1 ? handleCloseRepairDialog :
          selectedTab === 2 && deploymentRemovalMode === 'deployment' ? handleCloseDeploymentDialog :
          selectedTab === 2 && deploymentRemovalMode === 'removal' ? handleCloseRemovalDialog :
          () => {}
        } maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedTab === 0
              ? (selectedItem ? 'Edit Part' : 'Add New Part')
              : selectedTab === 1
              ? (selectedRepair ? 'Edit Repair Record' : 'Add Repair Record')
              : selectedTab === 2 && deploymentRemovalMode === 'deployment'
              ? (selectedDeployment ? 'Edit Deployment Record' : 'Add')
              : selectedTab === 2 && deploymentRemovalMode === 'removal'
              ? (selectedRemoval ? 'Edit Removal Record' : 'Add')
              : ''}
          </DialogTitle>
          <DialogContent>
            {selectedTab === 0 ? (
              // Ride Parts Inventory Form
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Part Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => {
                      const quantity = e.target.value;
                      const price = formData.price;
                      const totalAmount = price && quantity ? (Number(price) * Number(quantity)).toFixed(2) : '';
                      const updates = { ...formData, quantity, totalAmount };
                      updates.status = computeStockStatus(quantity);
                      setFormData(updates);
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={formData.unit}
                      label="Unit"
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <MenuItem value="pcs">Pieces (pcs)</MenuItem>
                      <MenuItem value="m">Meters (m)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => {
                      const price = e.target.value;
                      const quantity = formData.quantity;
                      const totalAmount = price && quantity ? (Number(price) * Number(quantity)).toFixed(2) : '';
                      setFormData({ ...formData, price, totalAmount });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Total Amount"
                    value={formData.totalAmount}
                    InputProps={{
                      readOnly: true,
                      style: { 
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        cursor: 'default'
                      }
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Status"
                    value={formData.status}
                    disabled
                    helperText="Auto-detected from quantity"
                    sx={{
                      '& .MuiInputBase-root': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Supplier's Location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
            ) : selectedTab === 1 ? (
              // Repair Record Form
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={repairData.date ? String(repairData.date).split('T')[0] : ''}
                    onChange={(e) => setRepairData({ ...repairData, date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  {selectedRepair ? (
                    <TextField
                      fullWidth
                      label="Rides"
                      value={repairData.ride}
                      InputProps={{
                        readOnly: true,
                        style: { backgroundColor: '#f5f5f5', borderRadius: '4px', padding: '8.5px 14px' }
                      }}
                    />
                  ) : (
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => setRideSelectionModalOpen(true)}
                      sx={{ height: 56 }}
                    >
                      {repairData.ride || 'Select Ride'}
                    </Button>
                  )}
                </Grid>
                <Grid item xs={12}>
                  {repairData.ride ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => setPartsSelectionModalOpen(true)}
                      sx={{ height: 56 }}
                    >
                      {repairData.partsReplaced || 'Select Parts'}
                    </Button>
                  ) : (
                    <TextField
                      fullWidth
                      label="Parts Name"
                      value={repairData.partsReplaced || ''}
                      InputProps={{
                        readOnly: true,
                        style: { backgroundColor: '#f5f5f5', borderRadius: '4px', padding: '8.5px 14px' }
                      }}
                    />
                  )}
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={repairData.issue}
                    onChange={(e) => setRepairData({ ...repairData, issue: e.target.value })}
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
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                    }}
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
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Technician"
                    value={repairData.technician}
                    onChange={(e) => setRepairData({ ...repairData, technician: e.target.value })}
                  />
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
            ) : selectedTab === 2 && deploymentRemovalMode === 'deployment' ? (
              // Deployment Form
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Date of Deployment"
                    type="date"
                    value={deploymentData.date}
                    onChange={(e) => setDeploymentData({ ...deploymentData, date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Place of Installation"
                    value={deploymentData.place}
                    onChange={(e) => setDeploymentData({ ...deploymentData, place: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setDeploymentRideModalOpen(true)}
                    sx={{ height: 56 }}
                  >
                    {deploymentData.ride || 'Select Ride'}
                  </Button>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={deploymentData.status}
                      onChange={(e) => setDeploymentData({ ...deploymentData, status: e.target.value })}
                      label="Status"
                      disabled={!selectedDeployment}
                    >
                      {DEPLOYMENT_REMOVAL_STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status} value={status}>{status}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Encoded By"
                    value={deploymentData.encodedBy}
                    onChange={(e) => setDeploymentData({ ...deploymentData, encodedBy: e.target.value })}
                  />
                </Grid>
              </Grid>
            ) : selectedTab === 2 && deploymentRemovalMode === 'removal' ? (
              // Removal Form
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Date of Removal"
                    type="date"
                    value={removalData.date}
                    onChange={(e) => setRemovalData({ ...removalData, date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Place of Uninstallation"
                    value={removalData.place}
                    onChange={(e) => setRemovalData({ ...removalData, place: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setRemovalRideModalOpen(true)}
                    sx={{ height: 56 }}
                  >
                    {removalData.ride || 'Select Ride'}
                  </Button>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={removalData.status}
                      onChange={(e) => setRemovalData({ ...removalData, status: e.target.value })}
                      label="Status"
                      disabled={!selectedRemoval}
                    >
                      {DEPLOYMENT_REMOVAL_STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status} value={status}>{status}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Encoded By"
                    value={removalData.encodedBy}
                    onChange={(e) => setRemovalData({ ...removalData, encodedBy: e.target.value })}
                  />
                </Grid>
              </Grid>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={
              selectedTab === 0 ? handleCloseDialog :
              selectedTab === 1 ? handleCloseRepairDialog :
              selectedTab === 2 && deploymentRemovalMode === 'deployment' ? handleCloseDeploymentDialog :
              selectedTab === 2 && deploymentRemovalMode === 'removal' ? handleCloseRemovalDialog :
              () => {}
            }>
              Cancel
            </Button>
            <Button
              onClick={
                selectedTab === 0 ? handleSubmit :
                selectedTab === 1 ? handleSubmitRepair :
                selectedTab === 2 && deploymentRemovalMode === 'deployment' ? handleSubmitDeployment :
                selectedTab === 2 && deploymentRemovalMode === 'removal' ? handleSubmitRemoval :
                () => {}
              }
              variant="contained"
            >
              {selectedTab === 0
                ? (selectedItem ? 'Save Changes' : 'Add')
                : selectedTab === 1
                ? (selectedRepair ? 'Save Changes' : 'Add Repair Record')
                : selectedTab === 2 && deploymentRemovalMode === 'deployment'
                ? (selectedDeployment ? 'Save Changes' : 'Add')
                : selectedTab === 2 && deploymentRemovalMode === 'removal'
                ? (selectedRemoval ? 'Save Changes' : 'Add')
                : ''}
            </Button>
          </DialogActions>
        </Dialog>
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

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog(prev => ({ ...prev, open: false }))}>
          <DialogTitle>{deleteDialog.title || 'Confirm Delete'}</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
              {deleteDialog.message}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
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

        {/* Warning Modal */}
        <Dialog open={openWarningModal} onClose={() => setOpenWarningModal(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
              {warningMessage}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenWarningModal(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (warningAction) {
                  await warningAction();
                } else {
                  setOpenWarningModal(false);
                }
              }}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Repair Details Dialog */}
        <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="md" fullWidth>
          <DialogTitle>Repair Details</DialogTitle>
          <DialogContent>
            {detailsData && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Ride:</Typography>
                    <Typography variant="body1">{detailsData.repair.ride}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Date:</Typography>
                    <Typography variant="body1">{new Date(detailsData.repair.date).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Issue:</Typography>
                    <Typography variant="body1">{detailsData.repair.issue}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Technician:</Typography>
                    <Typography variant="body1">{detailsData.repair.technician}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Parts Replaced:</Typography>
                    <Typography variant="body1">{detailsData.repair.partsReplaced}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Cost:</Typography>
                    <Typography variant="body1">₱{Number(detailsData.repair.cost).toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Status:</Typography>
                    <Chip
                      label={detailsData.repair.status}
                      variant="outlined"
                      size="small"
                      sx={{ 
                        color: getStatusColor(detailsData.repair.status) === 'success' ? 'green' : 
                              getStatusColor(detailsData.repair.status) === 'warning' ? 'orange' : 
                              getStatusColor(detailsData.repair.status) === 'error' ? 'red' : 
                              getStatusColor(detailsData.repair.status) === 'info' ? 'blue' : 'gray',
                        borderColor: getStatusColor(detailsData.repair.status) === 'success' ? 'green' : 
                                     getStatusColor(detailsData.repair.status) === 'warning' ? 'orange' : 
                                     getStatusColor(detailsData.repair.status) === 'error' ? 'red' : 
                                     getStatusColor(detailsData.repair.status) === 'info' ? 'blue' : 'gray',
                        backgroundColor: 'transparent'
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Notes:</Typography>
                    <Typography variant="body1">{detailsData.repair.notes || 'No notes'}</Typography>
                  </Grid>
                  {detailsData.stats && (
                    <>
                      <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Repair Statistics</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Total Repairs:</Typography>
                        <Typography variant="body1">{detailsData.stats.totalRepairs}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Total Cost:</Typography>
                        <Typography variant="body1">₱{detailsData.stats.totalCost.toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Last Repair:</Typography>
                        <Typography variant="body1">{detailsData.stats.lastRepair ? detailsData.stats.lastRepair.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}</Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetailsDialog}>Close</Button>
          </DialogActions>
        </Dialog>

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
              {rides.map((ride) => {
                const rideStatus = rideStatusMap[ride] || 'operational';
                const statusColor = rideStatus === 'operational' ? 'green' : 
                                   rideStatus === 'maintenance' ? 'orange' : 
                                   rideStatus === 'malfunction' ? 'red' : 'gray';
                return (
                  <Box
                    key={ride}
                    onClick={() => {
                      setRepairData({ ...repairData, ride: ride, partsReplaced: '' });
                      setRideSelectionModalOpen(false);
                    }}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: repairData.ride === ride ? '2px solid' : '1px solid',
                      borderColor: repairData.ride === ride ? 'primary.main' : 'divider',
                      backgroundColor: repairData.ride === ride ? 'primary.50' : 'background.paper',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: repairData.ride === ride ? 'primary.100' : 'action.hover',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {ride}
                      </Typography>
                      <Chip
                        label={rideStatus}
                        size="small"
                        sx={{ 
                          color: statusColor,
                          borderColor: statusColor,
                          backgroundColor: 'transparent'
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRideSelectionModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Parts Selection Modal */}
        <Dialog 
          open={partsSelectionModalOpen} 
          onClose={() => setPartsSelectionModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Select Parts</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              {getRepairPartsForRide(repairData.ride).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No parts available for this ride
                </Typography>
              ) : (
                getRepairPartsForRide(repairData.ride).map((part) => (
                  <Box
                    key={part.id}
                    onClick={() => {
                      setRepairData({ ...repairData, partsReplaced: part.name });
                      setPartsSelectionModalOpen(false);
                    }}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: repairData.partsReplaced === part.name ? '2px solid' : '1px solid',
                      borderColor: repairData.partsReplaced === part.name ? 'primary.main' : 'divider',
                      backgroundColor: repairData.partsReplaced === part.name ? 'primary.50' : 'background.paper',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: repairData.partsReplaced === part.name ? 'primary.100' : 'action.hover',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {part.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Qty: {part.quantity}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPartsSelectionModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Deployment Ride Selection Modal */}
        <Dialog 
          open={deploymentRideModalOpen} 
          onClose={() => setDeploymentRideModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Select Ride for Deployment</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              {rides.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No rides available
                </Typography>
              ) : (
                rides.map((ride) => (
                  <Box
                    key={ride}
                    onClick={() => {
                      setDeploymentData({ ...deploymentData, ride: ride });
                      setDeploymentRideModalOpen(false);
                    }}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: deploymentData.ride === ride ? '2px solid' : '1px solid',
                      borderColor: deploymentData.ride === ride ? 'primary.main' : 'divider',
                      backgroundColor: deploymentData.ride === ride ? 'primary.50' : 'background.paper',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: deploymentData.ride === ride ? 'primary.100' : 'action.hover',
                      },
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {ride}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeploymentRideModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Removal Ride Selection Modal */}
        <Dialog 
          open={removalRideModalOpen} 
          onClose={() => setRemovalRideModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Select Ride for Removal</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              {rides.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No rides available
                </Typography>
              ) : (
                rides.map((ride) => (
                  <Box
                    key={ride}
                    onClick={() => {
                      setRemovalData({ ...removalData, ride: ride });
                      setRemovalRideModalOpen(false);
                    }}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: removalData.ride === ride ? '2px solid' : '1px solid',
                      borderColor: removalData.ride === ride ? 'primary.main' : 'divider',
                      backgroundColor: removalData.ride === ride ? 'primary.50' : 'background.paper',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: removalData.ride === ride ? 'primary.100' : 'action.hover',
                      },
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {ride}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRemovalRideModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default EncoderPartsInventory; 
