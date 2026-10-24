import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
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
} from '@mui/material';
import DashboardLayout from '../layout/DashboardLayout';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningAction, setWarningAction] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    username: '',
    password: '',
    role: '',
    email: '',
    fullName: '',
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  useEffect(() => {
    // Check if user is logged in and is IT Admin
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'IT Admin') {
      navigate('/login');
      return;
    }

    // Load users from sessionStorage
    const storedUsers = sessionStorage.getItem('users');
    if (storedUsers) {
      const parsedUsers = JSON.parse(storedUsers);
      // Sort users by creation time to identify the first IT Admin
      const sortedUsers = parsedUsers.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setUsers(sortedUsers);
    }
  }, [navigate]);

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({
        id: Date.now().toString(),
        username: '',
        password: '',
        role: '',
        email: '',
        fullName: '',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      id: '',
      username: '',
      password: '',
      role: '',
      email: '',
      fullName: '',
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  };

  const isFirstITAdmin = (user) => {
    const itAdmins = users.filter(u => u.role === 'IT Admin');
    return itAdmins.length > 0 && itAdmins[0].id === user.id;
  };

  const handleDelete = (id) => {
    const userToDelete = users.find(user => user.id === id);
    
    if (userToDelete.role === 'IT Admin') {
      if (isFirstITAdmin(userToDelete)) {
        // Check if there are other users
        if (users.length > 1) {
          setWarningMessage('Cannot delete the first IT Admin account while other user accounts exist.');
          setWarningAction(() => () => {
            setOpenWarningModal(false);
          });
          setOpenWarningModal(true);
          return;
        }
      } else {
        // For other IT Admin accounts, check if it's the last IT Admin
        const otherITAdmins = users.filter(u => u.role === 'IT Admin' && u.id !== id);
        if (otherITAdmins.length === 0) {
          setWarningMessage('Cannot delete the last IT Admin account.');
          setWarningAction(() => () => {
            setOpenWarningModal(false);
          });
          setOpenWarningModal(true);
          return;
        }
      }
    }

    setWarningMessage(`Are you sure you want to delete the user "${userToDelete.username}"?`);
    setWarningAction(() => () => {
      const updatedUsers = users.filter((user) => user.id !== id);
      setUsers(updatedUsers);
      sessionStorage.setItem('users', JSON.stringify(updatedUsers));

      // If IT Admin is deleted, redirect to login
      if (userToDelete.role === 'IT Admin') {
        sessionStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
    });
    setOpenWarningModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const handleSubmit = () => {
    const updatedUsers = editingUser
      ? users.map((user) => (user.id === editingUser.id ? formData : user))
      : [...users, formData];

    setUsers(updatedUsers);
    sessionStorage.setItem('users', JSON.stringify(updatedUsers));
    handleCloseDialog();
  };

  return (
    <DashboardLayout title="Manage Users">
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add User
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.filter(user => user.status !== 'rejected').map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{new Date(user.lastUpdated).toLocaleString()}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleOpenDialog(user)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {user.role === 'IT Admin' ? (
                      isFirstITAdmin(user) ? (
                        users.length === 1 && (
                          <Tooltip title="Delete">
                            <IconButton onClick={() => handleDelete(user.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )
                      ) : (
                        <Tooltip title="Delete">
                          <IconButton onClick={() => handleDelete(user.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )
                    ) : (
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(user.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit User Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <TextField
                label="Full Name"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <TextField
                label="Role"
                name="role"
                select
                value={formData.role}
                onChange={handleInputChange}
                fullWidth
                required
              >
                <MenuItem value="IT Admin">IT Admin</MenuItem>
                <MenuItem value="IT Encoder">IT Encoder</MenuItem>
                <MenuItem value="Operations Manager">Operations Manager</MenuItem>
                <MenuItem value="Amusement Park Personnel">Amusement Park Personnel</MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingUser ? 'Save Changes' : 'Add User'}
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
      </Box>
    </DashboardLayout>
  );
};

export default ManageUsers; 