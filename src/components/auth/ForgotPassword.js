import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Avatar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import { Visibility, VisibilityOff, Email as EmailIcon } from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { authAPI } from '../../services/api';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');
  
  const [isResetMode] = useState(!!resetToken);
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageSeverity, setMessageSeverity] = useState('info');
  const [openDialog, setOpenDialog] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    if (messageSeverity === 'success') {
      navigate('/login');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await authAPI.forgotPassword(formData.email);
      setMessage(response.message);
      setMessageSeverity('success');

      // Build reset URL using current origin (frontend URL)
      const resetUrl = response.resetToken
        ? `${window.location.origin}/forgot-password?token=${response.resetToken}`
        : response.resetUrl;

      // Show the reset link as fallback
      if (resetUrl) {
        setMessage(
          `${response.message}\n\nReset Link: ${resetUrl}`
        );
      }

      setOpenDialog(true);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to send reset email');
      setMessageSeverity('error');
      setOpenDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setMessageSeverity('error');
      setOpenDialog(true);
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setMessageSeverity('error');
      setOpenDialog(true);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await authAPI.resetPassword(resetToken, formData.newPassword);
      setMessage(response.message);
      setMessageSeverity('success');
      setOpenDialog(true);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to reset password');
      setMessageSeverity('error');
      setOpenDialog(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
            animation: `${fadeIn} 0.5s ease-out`,
          }}
        >
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', mb: 2 }}>
            <LockResetIcon sx={{ fontSize: 32 }} />
          </Avatar>
          
          <Typography component="h1" variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
            {isResetMode ? 'Reset Password' : 'Forgot Password'}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
            {isResetMode 
              ? 'Enter your new password below'
              : 'Enter your email address and we\'ll send you a link to reset your password'
            }
          </Typography>

          {!isResetMode ? (
            // Forgot Password Form
            <Box 
              component="form" 
              onSubmit={handleForgotPassword} 
              sx={{ width: '100%' }}
            >
              <TextField
                required
                fullWidth
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange}
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  mb: 2,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(107, 91, 149, 0.2)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Send Reset Link'}
              </Button>
            </Box>
          ) : (
            // Reset Password Form
            <Box 
              component="form" 
              onSubmit={handleResetPassword} 
              sx={{ width: '100%' }}
            >
              <TextField
                required
                fullWidth
                name="newPassword"
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleChange}
                autoFocus
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />
              
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  mb: 2,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(107, 91, 149, 0.2)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Reset Password'}
              </Button>
            </Box>
          )}

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link 
              component="button"
              type="button"
              onClick={() => navigate('/login')}
              variant="body2"
              sx={{ 
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              Back to Login
            </Link>
          </Box>
        </Paper>
      </Container>

      {/* Message Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {messageSeverity.charAt(0).toUpperCase() + messageSeverity.slice(1)}
        </DialogTitle>
        <DialogContent>
          <Alert severity={messageSeverity} sx={{ mt: 1 }}>
            {message}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary" variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ForgotPassword; 