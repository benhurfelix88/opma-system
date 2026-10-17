import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  Alert,
  Tooltip,
  Tabs,
  Tab,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Fade,
  Grow,
  Avatar,
  Divider,
  Grid,
} from '@mui/material';
import DashboardLayout from '../layout/DashboardLayout';
import FadeInContent from '../common/FadeInContent';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AttractionsIcon from '@mui/icons-material/Attractions';
import UpdateIcon from '@mui/icons-material/Update';
import SettingsIcon from '@mui/icons-material/Settings';
import PhoneIcon from '@mui/icons-material/Phone';
import LockIcon from '@mui/icons-material/Lock';
import BadgeIcon from '@mui/icons-material/Badge';
import { usersAPI, ridesAPI, rideStatusAPI } from '../../services/api';

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningAction, setWarningAction] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [userHistory, setUserHistory] = useState([]);
  const [openClearHistoryModal, setOpenClearHistoryModal] = useState(false);
  const [availableRides, setAvailableRides] = useState([]);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    open: false,
    userToDelete: null,
    message: ''
  });
  const [rideSelectionModal, setRideSelectionModal] = useState({
    open: false,
    isForApproval: false,
    selectedRide: null
  });
  const [formData, setFormData] = useState({
    id: '',
    username: '',
    password: '',
    role: '',
    email: '',
    fullName: '',
    assignedRide: null,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  const [formErrors, setFormErrors] = useState({
    email: '',
    mobileNumber: ''
  });

  useEffect(() => {
    // Check if user is logged in and is IT Admin
    const token = localStorage.getItem('authToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!token && (!currentUser || currentUser.role !== 'IT Admin')) {
      navigate('/login');
      return;
    }

    loadUsers();
    loadAvailableRides();
  }, [navigate]);

  const loadAvailableRides = async () => {
    try {
      // Fetch rides and statuses from backend
      const [rides, statusMap] = await Promise.all([
        ridesAPI.getAll().catch(() => []),
        rideStatusAPI.get().catch(() => ({}))
      ]);

      const items = (rides || []).map(r => {
        return {
          id: r.name,
          name: r.name,
          status: statusMap[r.name] || 'operational',
        };
      });
      
      setAvailableRides(items);
    } catch (error) {
      console.error('Error loading rides:', error);
      setAvailableRides([]);
    }
  };

  const loadUsers = async () => {
    try {
      const allUsers = await usersAPI.getAll();
      
      // Map database fields (snake_case) to frontend fields (camelCase)
      const mappedUsers = allUsers.map(user => ({
        ...user,
        fullName: user.full_name || user.fullName,
        mobileNumber: user.mobile_number || user.mobileNumber,
        assignedRide: user.assigned_ride ? {
          name: user.assigned_ride,
          id: user.assigned_ride
        } : null,
        lastUpdated: user.updated_at || user.lastUpdated,
        createdAt: user.created_at || user.createdAt,
        approvedAt: user.approved_at || user.approvedAt,
        actionBy: user.action_by || user.actionBy
      }));
      
      const sortedUsers = mappedUsers.sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));
      
      
      // Set approved users for Manage Users tab
      const approvedUsers = sortedUsers.filter(user => user.status === 'approved');
      setUsers(approvedUsers);
      
      // Set user history for both approved and rejected users
      const historyUsers = sortedUsers.filter(user => 
        user.status === 'approved' || user.status === 'rejected'
      ).sort((a, b) => new Date(b.updated_at || b.lastUpdated || b.created_at || b.createdAt) - new Date(a.updated_at || a.lastUpdated || a.created_at || a.createdAt));
      setUserHistory(historyUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleViewUser = (user) => {
    setViewUser(user);
    setOpenViewDialog(true);
  };

  const handleDeleteUser = (user) => {
    // Check if user is the current logged-in user
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (currentUser && currentUser.id === user.id) {
      setWarningMessage('You cannot delete your own account while logged in.');
      setWarningAction(() => () => {
        setOpenWarningModal(false);
      });
      setOpenWarningModal(true);
      return;
    }

    // Check if there are other users
    if (users.length <= 1) {
      setWarningMessage('Cannot delete the only user account in the system.');
      setWarningAction(() => () => {
        setOpenWarningModal(false);
      });
      setOpenWarningModal(true);
      return;
    }

    // Check if user is IT Admin
    if (user.role === 'IT Admin') {
      const otherITAdmins = users.filter(u => u.role === 'IT Admin' && u.id !== user.id && u.status === 'active');
      if (otherITAdmins.length === 0) {
        setWarningMessage('Cannot delete the last active IT Admin account.');
        setWarningAction(() => () => {
          setOpenWarningModal(false);
        });
        setOpenWarningModal(true);
        return;
      }
    }

    const fullName = user.full_name || user.fullName || 'N/A';
    const email = user.email || 'N/A';
    const role = user.role || 'N/A';
    
    setDeleteConfirmModal({
      open: true,
      userToDelete: user,
      message: `Are you sure you want to delete this user?\n\nUsername: ${user.username}\nFull Name: ${fullName}\nEmail: ${email}\nRole: ${role}`
    });
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      // Map database fields to form fields
      const mappedUser = {
        ...user,
        fullName: user.full_name || user.fullName,
        mobileNumber: user.mobile_number || user.mobileNumber,
        assignedRide: user.assigned_ride ? {
          name: user.assigned_ride,
          id: user.assigned_ride
        } : (user.assignedRide || null)
      };
      
      // Find matching ride object if assigned_ride exists
      if (user.assigned_ride && availableRides.length > 0) {
        const matchingRide = availableRides.find(r => r.name === user.assigned_ride);
        if (matchingRide) {
          mappedUser.assignedRide = matchingRide;
        }
      }
      
      setFormErrors({ email: '', mobileNumber: '' });
      setFormData({
        id: user.id,
        username: user.username || '',
        password: '', // Don't pre-fill password for security
        role: user.role || '',
        email: user.email || '',
        fullName: mappedUser.fullName || '',
        mobileNumber: mappedUser.mobileNumber || '',
        assignedRide: mappedUser.assignedRide,
        lastUpdated: user.updated_at || user.lastUpdated || new Date().toISOString(),
        createdAt: user.created_at || user.createdAt || new Date().toISOString(),
      });
    } else {
      setEditingUser(null);
      setFormErrors({ email: '', mobileNumber: '' });
      setFormData({
        id: '',
        username: '',
        password: '',
        role: '',
        email: '',
        fullName: '',
        mobileNumber: '',
        assignedRide: null,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setSelectedUser(null);
    setSelectedRole('');
    setFormErrors({ email: '', mobileNumber: '' });
    setFormData({
      id: '',
      username: '',
      password: '',
      role: '',
      email: '',
      fullName: '',
      mobileNumber: '',
      assignedRide: null,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  };

  const confirmDelete = async () => {
    const { userToDelete } = deleteConfirmModal;
    
    try {
      await usersAPI.delete(userToDelete.id);
      await loadUsers();
      
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (userToDelete.role === 'IT Admin' && currentUser && currentUser.id === userToDelete.id) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
      
      setDeleteConfirmModal({ open: false, userToDelete: null, message: '' });
      setSnackbar({ open: true, message: `User "${userToDelete.username}" deleted successfully!`, severity: 'success' });
    } catch (error) {
      console.error('Error deleting user:', error);
      setDeleteConfirmModal({ open: false, userToDelete: null, message: '' });
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete user';
      setSnackbar({ open: true, message: `Error: ${errorMessage}`, severity: 'error' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Validate email
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setFormErrors(prev => ({ ...prev, email: 'Please enter a valid email address (e.g., user@example.com)' }));
      } else {
        setFormErrors(prev => ({ ...prev, email: '' }));
      }
    }
    
    // Validate mobile number
    if (name === 'mobileNumber') {
      const phoneRegex = /^09\d{9}$/;
      if (value && !phoneRegex.test(value)) {
        setFormErrors(prev => ({ 
          ...prev, 
          mobileNumber: 'Mobile number must be 11 digits starting with 09 (e.g., 09123456789)' 
        }));
      } else {
        setFormErrors(prev => ({ ...prev, mobileNumber: '' }));
      }
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setSnackbar({ open: true, message: 'Please enter a valid email address (e.g., user@example.com)', severity: 'error' });
        return;
      }
      
      // Validate mobile number format if provided
      if (formData.mobileNumber) {
        const phoneRegex = /^09\d{9}$/;
        if (!phoneRegex.test(formData.mobileNumber)) {
          setSnackbar({ open: true, message: 'Mobile number must be 11 digits starting with 09 (e.g., 09123456789)', severity: 'error' });
          return;
        }
      }
      
      if (editingUser) {
        const updateData = {
          username: formData.username,
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
          assigned_ride: formData.assignedRide ? (formData.assignedRide.name || formData.assignedRide) : null,
          assigned_ride_id: formData.assignedRide && formData.assignedRide.id ? formData.assignedRide.id : null,
          status: 'approved', // Keep approved status when editing
        };
        
        // Only include mobile_number if provided
        if (formData.mobileNumber) {
          updateData.mobile_number = formData.mobileNumber;
        }
        
        // Only include password if provided (for password updates)
        if (formData.password && formData.password.trim() !== '') {
          updateData.password = formData.password;
        }
        
        await usersAPI.update(editingUser.id, updateData);
      } else {
        if (!formData.username || !formData.password || !formData.email || !formData.fullName || !formData.role) {
          setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
          return;
        }
        
        await usersAPI.create({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          full_name: formData.fullName,
          mobile_number: formData.mobileNumber || null,
          role: formData.role,
          assigned_ride: formData.assignedRide ? (formData.assignedRide.name || formData.assignedRide) : null,
          assigned_ride_id: formData.assignedRide && formData.assignedRide.id ? formData.assignedRide.id : null,
        });
        
        // Approve directly added users
        const allUsers = await usersAPI.getAll();
        const newUser = allUsers.find(u => u.username === formData.username);
        if (newUser) {
          await usersAPI.updateStatus(newUser.id, 'approved');
        }
      }
      
      setOpenDialog(false);
      await loadUsers();
      
      // Show success message
      setSnackbar({ 
        open: true, 
        message: editingUser ? 'User updated successfully!' : 'User created successfully!', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save user';
      setSnackbar({ 
        open: true, 
        message: `Error: ${errorMessage}`, 
        severity: 'error'
      });
    }
  };

  const handleConfirmApprove = async () => {
    try {
      if (!selectedRole) {
        setSnackbar({ open: true, message: 'Please select a role for the user', severity: 'error' });
        return;
      }
      
      const updateData = {
        username: selectedUser.username,
        email: selectedUser.email,
        full_name: selectedUser.full_name || selectedUser.fullName,
        role: selectedRole,
        assigned_ride: formData.assignedRide ? (formData.assignedRide.name || formData.assignedRide) : null,
        assigned_ride_id: formData.assignedRide && formData.assignedRide.id ? formData.assignedRide.id : null,
        status: 'approved',
      };
      
      if (selectedUser.mobile_number || selectedUser.mobileNumber) {
        updateData.mobile_number = selectedUser.mobile_number || selectedUser.mobileNumber;
      }
      
      if (selectedUser.department) {
        updateData.department = selectedUser.department;
      }
      
      await usersAPI.update(selectedUser.id, updateData);
      setOpenDialog(false);
      setSelectedUser(null);
      setSelectedRole('');
      await loadUsers();
      setSnackbar({ open: true, message: 'User approved successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error approving user:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to approve user';
      setSnackbar({ open: true, message: `Error: ${errorMessage}`, severity: 'error' });
    }
  };

  const handleOpenRideSelection = (isForApproval = false) => {
    setRideSelectionModal({
      open: true,
      isForApproval,
      selectedRide: formData.assignedRide
    });
  };

  const handleRideSelect = (ride) => {
    setRideSelectionModal((prev) => ({
      ...prev,
      open: false,
      selectedRide: ride
    }));
    setFormData((prev) => ({
      ...prev,
      assignedRide: ride
    }));
  };

  const handleClearHistory = async () => {
    try {
      const allUsers = await usersAPI.getAll();
      // Delete approved and rejected users (history)
      let deletedCount = 0;
      for (const user of allUsers) {
        if (user.status === 'approved' || user.status === 'rejected') {
          await usersAPI.delete(user.id);
          deletedCount++;
        }
      }
      await loadUsers();
      setOpenClearHistoryModal(false);
      setSnackbar({ 
        open: true, 
        message: `User history cleared successfully! ${deletedCount} record(s) removed.`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error clearing history:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to clear user history';
      setSnackbar({ open: true, message: `Error: ${errorMessage}`, severity: 'error' });
    }
  };

  return (
    <DashboardLayout title="User Management">
      <Box sx={{ p: 3 }}>
        <Grow in={true} timeout={{ enter: 500 }}>
          <Box>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              sx={{ 
                mb: 3,
                '& .MuiTab-root': {
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                  }
                }
              }}
            >
              <Tab label="Manage Users" />
              <Tab label="User History" />
            </Tabs>
          </Box>
        </Grow>

        <Fade in={true} timeout={{ enter: 600 }}>
          <Box>
            {activeTab === 0 && (
              <FadeInContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }
                    }}
                  >
                    Add
                  </Button>
                </Box>

                <Grow in={true} timeout={{ enter: 700 }}>
                  <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                    <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxHeight: '70vh' }}>
                      <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell 
                            align="center"
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              py: 2,
                              borderBottom: '2px solid #e0e0e0'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <PersonIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                              Username
                            </Box>
                          </TableCell>
                          <TableCell 
                            align="center"
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              py: 2,
                              borderBottom: '2px solid #e0e0e0'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <InfoIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                              Full Name
                            </Box>
                          </TableCell>
                          <TableCell 
                            align="center"
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              py: 2,
                              borderBottom: '2px solid #e0e0e0'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <EmailIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                              Email
                            </Box>
                          </TableCell>
                          <TableCell 
                            align="center"
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              py: 2,
                              borderBottom: '2px solid #e0e0e0'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <AssignmentIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                              Role
                            </Box>
                          </TableCell>
                          <TableCell 
                            align="center"
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              py: 2,
                              borderBottom: '2px solid #e0e0e0'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <AttractionsIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                              Assigned Ride
                            </Box>
                          </TableCell>
                          <TableCell 
                            align="center"
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              py: 2,
                              borderBottom: '2px solid #e0e0e0'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <UpdateIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                              Last Updated
                            </Box>
                          </TableCell>
                          <TableCell 
                            align="center"
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              py: 2,
                              borderBottom: '2px solid #e0e0e0'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <SettingsIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                              Actions
                            </Box>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((user, index) => {
                          const fullName = user.full_name || user.fullName;
                          const assignedRide = user.assigned_ride || (user.assignedRide?.name);
                          const lastUpdated = user.updated_at || user.lastUpdated;
                          
                          return (
                            <Grow 
                              key={user.id} 
                              in={true} 
                              timeout={{ enter: 800 + index * 100 }}
                            >
                              <TableRow>
                                <TableCell align="center">{user.username}</TableCell>
                                <TableCell align="center">{fullName}</TableCell>
                                <TableCell align="center">{user.email}</TableCell>
                                <TableCell align="center">{user.role}</TableCell>
                                <TableCell align="center">
                                  {assignedRide ? assignedRide : 'N/A'}
                                </TableCell>
                                <TableCell align="center">
                                  {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'N/A'}
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                    <Tooltip title="View Details">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleViewUser(user)}
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
                                    <Tooltip title="Edit User">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleOpenDialog(user)}
                                        sx={{
                                          transition: 'all 0.2s ease',
                                          '&:hover': {
                                            backgroundColor: 'primary.main',
                                            color: 'white',
                                            transform: 'scale(1.1)',
                                          }
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete User">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDeleteUser(user)}
                                        sx={{
                                          transition: 'all 0.2s ease',
                                          '&:hover': {
                                            backgroundColor: 'error.main',
                                            color: 'white',
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
                            </Grow>
                          );
                        })}
                        {users.length === 0 && (
                          <Fade in={true} timeout={{ enter: 1000 }}>
                            <TableRow>
                              <TableCell colSpan={7} align="center">
                                <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                                  No users found
                                </Typography>
                              </TableCell>
                            </TableRow>
                          </Fade>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  </Box>
                </Grow>
              </FadeInContent>
            )}
            {activeTab === 1 && (
              <FadeInContent>
                <Grow in={true} timeout={{ enter: 600 }}>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => setOpenClearHistoryModal(true)}
                      startIcon={<DeleteIcon />}
                      sx={{
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(244,67,54,0.3)'
                        }
                      }}
                    >
                      Clear History
                    </Button>
                  </Box>
                </Grow>
                
                <Grow in={true} timeout={{ enter: 700 }}>
                  <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                    <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxHeight: '70vh' }}>
                      <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell align="center">Full Name</TableCell>
                          <TableCell align="center">Username</TableCell>
                          <TableCell align="center">Email</TableCell>
                          <TableCell align="center">Requested Role</TableCell>
                          <TableCell align="center">Action By</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {userHistory.map((user, index) => {
                          const fullName = user.full_name || user.fullName;
                          const actionBy = user.action_by || user.actionBy;
                          
                          return (
                            <Grow 
                              key={user.id} 
                              in={true} 
                              timeout={{ enter: 800 + index * 50 }}
                            >
                              <TableRow>
                                <TableCell align="center">{fullName}</TableCell>
                                <TableCell align="center">{user.username}</TableCell>
                                <TableCell align="center">{user.email}</TableCell>
                                <TableCell align="center">{user.role}</TableCell>
                                <TableCell align="center">{actionBy || 'System'}</TableCell>
                              </TableRow>
                            </Grow>
                          );
                        })}
                        {userHistory.length === 0 && (
                          <Fade in={true} timeout={{ enter: 1000 }}>
                            <TableRow>
                              <TableCell colSpan={5} align="center">
                                <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                                  No user history available
                                </Typography>
                              </TableCell>
                            </TableRow>
                          </Fade>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  </Box>
                </Grow>
              </FadeInContent>
            )}
          </Box>
        </Fade>

        {/* View User Dialog */}
        <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PersonIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  Account Information
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  User profile details
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent>
            {viewUser && (() => {
              const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
              const picSrc = viewUser.profile_picture
                ? (viewUser.profile_picture.startsWith('http') ? viewUser.profile_picture : `${API_BASE}${viewUser.profile_picture}`)
                : null;
              return (
                <Box sx={{ mt: 1 }}>
                  {/* Profile Picture */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Avatar
                      src={picSrc}
                      sx={{
                        width: 90,
                        height: 90,
                        bgcolor: 'primary.main',
                        fontSize: '2rem',
                        border: '3px solid',
                        borderColor: 'primary.light',
                      }}
                    >
                      {!picSrc && (viewUser.full_name?.[0] || viewUser.fullName?.[0] || <PersonIcon />)}
                    </Avatar>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Username</Typography>
                        <Typography variant="body1" fontWeight={500}>{viewUser.username}</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Full Name</Typography>
                        <Typography variant="body1" fontWeight={500}>{viewUser.full_name || viewUser.fullName}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</Typography>
                        <Typography variant="body1" fontWeight={500}>{viewUser.email}</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Mobile Number</Typography>
                        <Typography variant="body1" fontWeight={500}>{viewUser.mobile_number || viewUser.mobileNumber || 'N/A'}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Role</Typography>
                        <Typography variant="body1" fontWeight={500}>{viewUser.role}</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Assigned Ride</Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {viewUser.assigned_ride || viewUser.assignedRide?.name || viewUser.assignedRide || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Created At</Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {viewUser.created_at || viewUser.createdAt ? new Date(viewUser.created_at || viewUser.createdAt).toLocaleString() : 'N/A'}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Last Updated</Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {viewUser.updated_at || viewUser.lastUpdated ? new Date(viewUser.updated_at || viewUser.lastUpdated).toLocaleString() : 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Add/Edit User Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: editingUser ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 
                          selectedUser ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' : 
                          'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {editingUser ? <EditIcon sx={{ color: 'white', fontSize: 20 }} /> : 
                 selectedUser ? <InfoIcon sx={{ color: 'white', fontSize: 20 }} /> : 
                 <AddIcon sx={{ color: 'white', fontSize: 20 }} />}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  {editingUser ? 'Edit User' : selectedUser ? 'Approve User' : 'Add New User'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {editingUser ? 'Modify user account information' : 
                   selectedUser ? 'Approve pending user registration' : 
                   'Create a new user account'}
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedUser ? (
              <>
                <Typography gutterBottom>
                  {"Please confirm the role for " + (selectedUser.full_name || selectedUser.fullName)}
                </Typography>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={selectedRole}
                    label="Role"
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <MenuItem value="IT Admin">IT Admin</MenuItem>
                    <MenuItem value="IT Encoder">IT Encoder</MenuItem>
                    <MenuItem value="Operations Manager">Operations Manager</MenuItem>
                    <MenuItem value="Amusement Park Personnel">Amusement Park Personnel</MenuItem>
                  </Select>
                </FormControl>
                
                {/* Email validation and display */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    Email
                  </Typography>
                  <TextField
                    value={selectedUser.email || ''}
                    fullWidth
                    disabled
                    size="small"
                    error={selectedUser.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(selectedUser.email)}
                  />
                </Box>
                
                {/* Mobile number validation and display */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <PhoneIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    Mobile Number
                  </Typography>
                  <TextField
                    value={selectedUser.mobile_number || selectedUser.mobileNumber || ''}
                    fullWidth
                    disabled
                    size="small"
                    error={(selectedUser.mobile_number || selectedUser.mobileNumber) 
                      && !/^09\d{9}$/.test(selectedUser.mobile_number || selectedUser.mobileNumber)}
                  />
                </Box>
                
                {/* Ride Assignment for Park Personnel */}
                {selectedRole === 'Amusement Park Personnel' && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AttractionsIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="subtitle2" fontWeight="bold">Assign Ride</Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleOpenRideSelection(true)}
                      sx={{
                        py: 2.5,
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        borderColor: formData.assignedRide ? 'primary.main' : 'divider',
                        backgroundColor: formData.assignedRide ? 'primary.lighter' : 'background.paper',
                        borderWidth: formData.assignedRide ? 2 : 1
                      }}
                    >
                      {formData.assignedRide ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <AttractionsIcon sx={{ mr: 1.5, color: 'primary.main', fontSize: 24 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight="bold">{formData.assignedRide.name}</Typography>
                            <Typography variant="caption" color="text.secondary">Assigned ride</Typography>
                          </Box>
                          <Chip 
                            label={formData.assignedRide.status}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              ml: 1,
                              color: formData.assignedRide.status === 'operational' ? 'success.main' : 'error.main',
                              borderColor: formData.assignedRide.status === 'operational' ? 'success.main' : 'error.main',
                            }}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                          <AttractionsIcon sx={{ mr: 1.5, fontSize: 24 }} />
                          <Box>
                            <Typography variant="body1">Click to select a ride</Typography>
                            <Typography variant="caption">Choose from available operational rides</Typography>
                          </Box>
                        </Box>
                      )}
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <TextField
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <TextField
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <TextField
                  label="Full Name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <BadgeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <TextField
                  label="Mobile Number"
                  name="mobileNumber"
                  value={formData.mobileNumber || ''}
                  onChange={handleInputChange}
                  fullWidth
                  error={!!formErrors.mobileNumber}
                  helperText={formErrors.mobileNumber}
                  inputProps={{ maxLength: 11 }}
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <TextField
                  label="Role"
                  name="role"
                  select
                  value={formData.role}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <SettingsIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                >
                  <MenuItem value="IT Admin">IT Admin</MenuItem>
                  <MenuItem value="IT Encoder">IT Encoder</MenuItem>
                  <MenuItem value="Operations Manager">Operations Manager</MenuItem>
                  <MenuItem value="Amusement Park Personnel">Amusement Park Personnel</MenuItem>
                </TextField>
                
                {/* Ride Assignment for Park Personnel */}
                {formData.role === 'Amusement Park Personnel' && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AttractionsIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="subtitle2" fontWeight="bold">Assign Ride</Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleOpenRideSelection(false)}
                      sx={{
                        py: 2.5,
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        borderColor: formData.assignedRide ? 'primary.main' : 'divider',
                        backgroundColor: formData.assignedRide ? 'primary.lighter' : 'background.paper',
                        borderWidth: formData.assignedRide ? 2 : 1
                      }}
                    >
                      {formData.assignedRide ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <AttractionsIcon sx={{ mr: 1.5, color: 'primary.main', fontSize: 24 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight="bold">{formData.assignedRide.name}</Typography>
                            <Typography variant="caption" color="text.secondary">Assigned ride</Typography>
                          </Box>
                          <Chip 
                            label={formData.assignedRide.status}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              ml: 1,
                              color: formData.assignedRide.status === 'operational' ? 'success.main' : 'error.main',
                              borderColor: formData.assignedRide.status === 'operational' ? 'success.main' : 'error.main',
                            }}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                          <AttractionsIcon sx={{ mr: 1.5, fontSize: 24 }} />
                          <Box>
                            <Typography variant="body1">Click to select a ride</Typography>
                            <Typography variant="caption">Choose from available operational rides</Typography>
                          </Box>
                        </Box>
                      )}
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={selectedUser ? handleConfirmApprove : handleSubmit}
              variant="contained"
              disabled={selectedUser && !selectedRole}
            >
              {selectedUser ? 'Confirm Approval' : editingUser ? 'Save Changes' : 'Add User'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteConfirmModal.open} onClose={() => setDeleteConfirmModal({ ...deleteConfirmModal, open: false })}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DeleteIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="bold" color="error.main">
                  Confirm Delete
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  This action cannot be undone
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
              {deleteConfirmModal.message}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmModal({ ...deleteConfirmModal, open: false })}>Cancel</Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Warning Modal */}
        <Dialog open={openWarningModal} onClose={() => setOpenWarningModal(false)}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <InfoIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="bold" color="warning.main">
                  Confirm Delete
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  System restriction warning
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
              {warningMessage}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenWarningModal(false)}>Cancel</Button>
            <Button
              onClick={() => {
                warningAction();
                setOpenWarningModal(false);
              }}
              color="error"
              variant="contained"
            >
              {warningMessage.includes('delete') ? 'Delete' : 'OK'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Ride Selection Modal */}
        <Dialog 
          open={rideSelectionModal.open} 
          onClose={() => setRideSelectionModal((prev) => ({ ...prev, open: false }))}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AttractionsIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  Select Ride
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Choose a ride to assign to the personnel
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, maxHeight: '60vh', overflow: 'auto' }}>
              <Grid container spacing={2}>
                {availableRides.map((ride) => (
                  <Grid item xs={12} sm={6} md={4} key={ride.id}>
                    <Paper
                      elevation={2}
                      sx={{
                        p: 2,
                        cursor: ride.status === 'operational' ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                        border: `2px solid ${rideSelectionModal.selectedRide?.id === ride.id ? 'primary.main' : 'transparent'}`,
                        '&:hover': ride.status === 'operational' ? {
                          transform: 'translateY(-4px)',
                          boxShadow: 4,
                          borderColor: 'primary.light'
                        } : {},
                        opacity: ride.status !== 'operational' ? 0.6 : 1,
                        backgroundColor: rideSelectionModal.selectedRide?.id === ride.id ? 'primary.lighter' : 'background.paper'
                      }}
                      onClick={() => ride.status === 'operational' && handleRideSelect(ride)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AttractionsIcon sx={{ mr: 1, color: ride.status === 'operational' ? 'primary.main' : 'text.secondary' }} />
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                          {ride.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={ride.status}
                        size="small"
                        variant="outlined"
                        sx={{
                          color: ride.status === 'operational' ? 'success.main' : 'error.main',
                          borderColor: ride.status === 'operational' ? 'success.main' : 'error.main',
                        }}
                      />
                      {ride.status !== 'operational' && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          Currently unavailable
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                ))}
                {availableRides.length === 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      <Typography variant="body1">No rides available</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRideSelectionModal((prev) => ({ ...prev, open: false }))}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Clear History Modal */}
        <Dialog open={openClearHistoryModal} onClose={() => setOpenClearHistoryModal(false)}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DeleteIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="bold" color="warning.main">
                  Clear User History
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Permanent data removal
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mt: 2 }}>
              Are you sure you want to clear all user history? This action cannot be undone.
              This will remove all records of approved and rejected users while keeping active and pending users.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenClearHistoryModal(false)}>Cancel</Button>
            <Button
              onClick={handleClearHistory}
              color="error"
              variant="contained"
            >
              Clear History
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
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

export default UserManagement; 