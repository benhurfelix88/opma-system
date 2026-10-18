import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  CssBaseline,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  CircularProgress,
  TextField,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Person as PersonIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Build as BuildIcon,
  Warning as WarningIcon,
  Group as GroupIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  CameraAlt as CameraAltIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { keyframes } from '@mui/system';
import Logo from '../common/Logo';
import FadeInContent from '../common/FadeInContent';
import { authAPI } from '../../services/api';

const drawerWidth = 240;

const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

const DashboardLayout = ({ children, title = 'Dashboard', menuItems }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [activeButton, setActiveButton] = useState(null);
  const [openLogoutModal, setOpenLogoutModal] = useState(false);
  const [openLogoutLoadingModal, setOpenLogoutLoadingModal] = useState(false);
  const [openProfileModal, setOpenProfileModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSnackbar, setProfileSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const BACKEND_URL = API_BASE_URL.replace('/api', '');

  const getProfilePicUrl = (picPath) => {
    if (!picPath) return null;
    if (picPath.startsWith('http')) return picPath;
    return `${BACKEND_URL}${picPath}`;
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setEditedUser(userData);

        // Fetch fresh user data from server to get latest profile picture
        try {
          const freshUser = await authAPI.getCurrentUser();
          setUser(freshUser);
          setEditedUser(freshUser);
        } catch (error) {
          console.error('Failed to fetch current user:', error);
          // If 401, session is invalid (someone else logged in)
          if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = '/login';
          }
        }
      }
    };
    loadCurrentUser();

    // Send heartbeat every 60 seconds to update session activity
    const heartbeatInterval = setInterval(async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          await authAPI.heartbeat();
        } catch (error) {
          console.error('Heartbeat failed:', error);
          // If 401, session is invalid (someone else logged in)
          if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = '/login';
          }
        }
      }
    }, 60000);

    return () => clearInterval(heartbeatInterval);
  }, [API_BASE_URL]);

  const getMenuItems = () => {
    switch (user?.role) {
      case 'IT Admin':
        return [
          { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin-dashboard' },
          { text: 'User Management', icon: <GroupIcon />, path: '/admin-dashboard/user-management' },
          { text: 'Ride Parts Inventory', icon: <BuildIcon />, path: '/admin-dashboard/parts-inventory' },
          { text: 'Maintenance', icon: <BuildIcon />, path: '/admin-dashboard/maintenance' },
          { text: 'Incident Reports', icon: <WarningIcon />, path: '/admin-dashboard/incidents' },
          { text: 'Customers\' Count (per ride)', icon: <ConfirmationNumberIcon />, path: '/admin-dashboard/customers-count' }
        ];
      case 'IT Encoder':
        return [
          { text: 'Dashboard', icon: <DashboardIcon />, path: '/encoder-dashboard' },
          { text: 'Ride Parts Inventory', icon: <BuildIcon />, path: '/encoder-dashboard/parts-inventory' },
          { text: 'Maintenance', icon: <BuildIcon />, path: '/encoder-dashboard/maintenance' },
          { text: 'Incident Reports', icon: <WarningIcon />, path: '/encoder-dashboard/incidents' },
          { text: 'Customers\' Count (per ride)', icon: <ConfirmationNumberIcon />, path: '/admin-dashboard/customers-count', hasColorCode: true }
        ];
      case 'Operations Manager':
        return [
          { text: 'Dashboard', icon: <DashboardIcon />, path: '/manager-dashboard' },
          { text: 'Ride Status', icon: <BuildIcon />, path: '/manager-dashboard/ride-status' },
          { text: 'Ride Parts Inventory', icon: <BuildIcon />, path: '/manager-dashboard/parts-inventory' },
          { text: 'Maintenance', icon: <BuildIcon />, path: '/manager-dashboard/maintenance' },
          { text: 'Incident Reports', icon: <WarningIcon />, path: '/manager-dashboard/incidents' },
          { text: 'Customers\' Count (per ride)', icon: <ConfirmationNumberIcon />, path: '/admin-dashboard/customers-count' }
        ];
      case 'Amusement Park Personnel':
        return [
          { text: 'Dashboard', icon: <DashboardIcon />, path: '/personnel-dashboard' },
          { text: 'Incident Reports', icon: <WarningIcon />, path: '/personnel-dashboard/incidents' },
          { text: 'Customers\' Count (per ride)', icon: <ConfirmationNumberIcon />, path: '/personnel-dashboard/ride-counters' }
        ];
      default:
        return [];
    }
  };

  const handleNavigation = (path, text) => {
    setActiveButton(text);
    setTimeout(() => {
      navigate(path);
      setActiveButton(null);
    }, 300);
  };

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleLogout = () => {
    setOpenLogoutModal(false);
    setOpenLogoutLoadingModal(true);

    // Simulate logout process
    setTimeout(() => {
      localStorage.removeItem('currentUser');
      navigate('/login');
    }, 1500);
  };

  const handleProfileClick = () => {
    setOpenProfileModal(true);
    setEditMode(false);
    setEditedUser({ ...user });
    setPhotoPreview(null);
  };

  const handleEditClick = () => {
    setEditMode(true);
  };

  const handleSaveClick = async () => {
    setProfileSaving(true);
    try {
      await authAPI.updateProfile({
        full_name: editedUser.fullName || editedUser.full_name,
        email: editedUser.email,
        mobile_number: editedUser.mobileNumber || editedUser.mobile_number,
        username: editedUser.username,
      });
      const updatedUser = {
        ...user,
        ...editedUser,
        fullName: editedUser.fullName || editedUser.full_name,
        mobileNumber: editedUser.mobileNumber || editedUser.mobile_number,
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditMode(false);
      setProfileSnackbar({ open: true, message: 'Profile updated successfully', severity: 'success' });
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to update profile';
      setProfileSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelClick = () => {
    setEditedUser({ ...user });
    setEditMode(false);
  };

  const handleFieldChange = (field, value) => {
    setEditedUser(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      setProfileSnackbar({ open: true, message: 'Only PNG and JPG files are allowed', severity: 'error' });
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      await authAPI.uploadProfilePicture(file);
      // Fetch fresh user data from server to get the updated profile picture
      const freshUser = await authAPI.getCurrentUser();
      setUser(freshUser);
      setEditedUser(freshUser);
      setProfileSnackbar({ open: true, message: 'Profile picture updated', severity: 'success' });
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to upload picture';
      setProfileSnackbar({ open: true, message: msg, severity: 'error' });
      setPhotoPreview(null);
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoUploading(true);
    try {
      await authAPI.deleteProfilePicture();
      // Fetch fresh user data from server to get the updated profile picture
      const freshUser = await authAPI.getCurrentUser();
      setUser(freshUser);
      setEditedUser(freshUser);
      setPhotoPreview(null);
      setProfileSnackbar({ open: true, message: 'Profile picture removed', severity: 'success' });
    } catch (error) {
      setProfileSnackbar({ open: true, message: 'Failed to remove picture', severity: 'error' });
    } finally {
      setPhotoUploading(false);
    }
  };

  const getPageTitle = () => {
    if (location.pathname === '/admin-dashboard/customers-count') {
      return 'Customers\' Count (per ride)';
    }
    if (user?.role === 'IT Admin') {
      if (location.pathname === '/admin-dashboard/incidents') {
        return 'Incident Reports';
      }
      if (location.pathname === '/admin-dashboard/parts-inventory') {
        return 'Parts Inventory';
      }
    }
    return title;
  };

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: 'primary.main' }}>
            {getPageTitle()}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar 
                src={photoPreview || getProfilePicUrl(user?.profile_picture)}
                sx={{ 
                  bgcolor: 'primary.main', 
                  width: 36, 
                  height: 36,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: 'primary.light',
                  '&:hover': {
                    animation: `${pulseAnimation} 0.5s ease-in-out`,
                  }
                }}
                onClick={handleProfileClick}
              >
                <PersonIcon />
              </Avatar>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  {user?.fullName}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {user?.role}
                </Typography>
              </Box>
            </Box>
            <Button
              onClick={() => setOpenLogoutModal(true)}
              startIcon={<LogoutIcon />}
              sx={{
                textTransform: 'none',
                color: 'text.primary',
                '&:hover': {
                  animation: `${pulseAnimation} 0.5s ease-in-out`,
                },
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 0 20px rgba(0,0,0,0.05)',
          },
        }}
      >
        <Toolbar sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          py: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          <Logo size="large" />
        </Toolbar>

        <Box sx={{ overflow: 'auto', py: 2 }}>
          <List sx={{ px: 2 }}>
            {(menuItems || getMenuItems()).map((item, index) => (
              <ListItem 
                key={item.text} 
                disablePadding
                sx={{ mb: 0.5 }}
              >
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleNavigation(item.path, item.text)}
                  sx={{
                    borderRadius: '12px',
                    py: 1.5,
                    px: 2,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '0%',
                      bgcolor: item.hasColorCode ? 'secondary.main' : 'primary.main',
                      borderRadius: '0 2px 2px 0',
                      transition: 'height 0.3s ease',
                    },
                    '&:hover': {
                      bgcolor: item.hasColorCode ? 'rgba(156, 39, 176, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                      transform: 'translateX(4px)',
                      '&::before': {
                        height: '60%',
                      },
                      '& .MuiListItemIcon-root': {
                        color: item.hasColorCode ? 'secondary.main' : 'primary.main',
                        transform: 'scale(1.1)',
                      },
                      '& .MuiListItemText-primary': {
                        color: item.hasColorCode ? 'secondary.main' : 'primary.main',
                        fontWeight: 600,
                      }
                    },
                    '&.Mui-selected': {
                      bgcolor: item.hasColorCode ? 'rgba(156, 39, 176, 0.12)' : 'rgba(25, 118, 210, 0.12)',
                      '&::before': {
                        height: '80%',
                      },
                      '&:hover': {
                        bgcolor: item.hasColorCode ? 'rgba(156, 39, 176, 0.16)' : 'rgba(25, 118, 210, 0.16)',
                      },
                    },
                    transform: activeButton === item.text ? 'scale(0.98)' : 'scale(1)',
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: location.pathname === item.path ? (item.hasColorCode ? 'secondary.main' : 'primary.main') : (item.isViewOnly ? 'text.disabled' : 'text.secondary'),
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    minWidth: '40px',
                    '& svg': {
                      fontSize: '1.25rem',
                    }
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    secondary={item.isViewOnly ? 'View Only' : null}
                    secondaryTypographyProps={{ 
                      variant: 'caption',
                      sx: { fontSize: '0.7rem', opacity: 0.7, color: 'text.disabled' }
                    }}
                    sx={{ 
                      color: location.pathname === item.path ? (item.hasColorCode ? 'secondary.main' : 'primary.main') : (item.isViewOnly ? 'text.disabled' : 'text.primary'),
                      '& .MuiTypography-root': {
                        fontWeight: location.pathname === item.path ? 600 : 500,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontSize: '0.875rem',
                        letterSpacing: '0.01em',
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <FadeInContent>
        {children}
        </FadeInContent>
      </Box>

      {/* Profile Information Modal */}
      <Dialog 
        open={openProfileModal} 
        onClose={() => { setOpenProfileModal(false); setEditMode(false); }}
        PaperProps={{
          sx: { borderRadius: 3, minWidth: 420, maxWidth: 480 },
        }}
      >
        <DialogTitle sx={{ pb: 0, pt: 3, textAlign: 'center', fontWeight: 700, fontSize: '1.2rem' }}>
          User Profile
        </DialogTitle>

        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {/* Profile Picture Section */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box sx={{ position: 'relative', mb: 1 }}>
              <Avatar
                src={photoPreview || getProfilePicUrl(user?.profile_picture)}
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: 'primary.main',
                  fontSize: '2.5rem',
                  border: '3px solid',
                  borderColor: 'primary.light',
                }}
              >
                {!user?.profile_picture && !photoPreview && (user?.fullName?.[0] || <PersonIcon sx={{ fontSize: '2.5rem' }} />)}
              </Avatar>
              {photoUploading && (
                <Box sx={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  bgcolor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <CircularProgress size={28} sx={{ color: 'white' }} />
                </Box>
              )}
              {/* Camera overlay button */}
              <Tooltip title="Upload photo (PNG or JPG only)">
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  sx={{
                    position: 'absolute', bottom: 0, right: 0,
                    bgcolor: 'primary.main', color: 'white', width: 30, height: 30,
                    '&:hover': { bgcolor: 'primary.dark' },
                    border: '2px solid white',
                  }}
                >
                  <CameraAltIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />
            {(user?.profile_picture || photoPreview) && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleRemovePhoto}
                disabled={photoUploading}
                sx={{ mt: 0.5, fontSize: '0.75rem' }}
              >
                Remove Photo
              </Button>
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Profile Fields */}
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Full Name
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth size="small" sx={{ mt: 0.5 }}
                    value={editedUser?.fullName || ''}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    placeholder="Enter full name"
                  />
                ) : (
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>{user?.fullName || '—'}</Typography>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Role
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500, color: 'primary.main' }}>{user?.role || '—'}</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Username
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth size="small" sx={{ mt: 0.5 }}
                    value={editedUser?.username || ''}
                    onChange={(e) => handleFieldChange('username', e.target.value)}
                    placeholder="Enter username"
                  />
                ) : (
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>{user?.username || '—'}</Typography>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Mobile Number
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth size="small" sx={{ mt: 0.5 }}
                    value={editedUser?.mobileNumber || ''}
                    onChange={(e) => handleFieldChange('mobileNumber', e.target.value)}
                    placeholder="Enter mobile number"
                  />
                ) : (
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>{user?.mobileNumber || '—'}</Typography>
                )}
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Email Address
              </Typography>
              {editMode ? (
                <TextField
                  fullWidth size="small" sx={{ mt: 0.5 }}
                  value={editedUser?.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="Enter email address"
                  type="email"
                />
              ) : (
                <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>{user?.email || '—'}</Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
          {editMode ? (
            <>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancelClick}
                disabled={profileSaving}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={profileSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={handleSaveClick}
                disabled={profileSaving}
              >
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditClick}
              >
                Edit Profile
              </Button>
              <Button
                variant="contained"
                onClick={() => setOpenProfileModal(false)}
              >
                Close
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={profileSnackbar.open}
        autoHideDuration={4000}
        onClose={() => setProfileSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setProfileSnackbar(prev => ({ ...prev, open: false }))}
          severity={profileSnackbar.severity}
          sx={{ width: '100%' }}
        >
          {profileSnackbar.message}
        </Alert>
      </Snackbar>

      {/* Logout Confirmation Modal */}
      <Dialog open={openLogoutModal} onClose={() => setOpenLogoutModal(false)}>
        <DialogTitle>Confirm Logout</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Are you sure you want to log out?
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLogoutModal(false)}>Cancel</Button>
          <Button
            onClick={handleLogout}
            color="error"
            variant="contained"
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logout Loading Modal */}
      <Dialog 
        open={openLogoutLoadingModal} 
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2,
            minWidth: 300,
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          <LogoutIcon color="primary" sx={{ fontSize: 60, display: 'block', mx: 'auto', mb: 2 }} />
          Logging Out
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" align="center" sx={{ mb: 2 }}>
            Please wait...
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <CircularProgress size={24} />
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardLayout; 
