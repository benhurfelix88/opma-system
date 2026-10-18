import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Link,
  Alert,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { keyframes } from '@mui/system';
import Logo from '../common/Logo';
import { CheckCircle, Visibility, VisibilityOff } from '@mui/icons-material';
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

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent form submission
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData.username, formData.password);
      const user = response.user;

      setOpenSuccessModal(true);
      setTimeout(() => {
        switch (user.role) {
          case 'IT Admin':
            navigate('/admin-dashboard');
            break;
          case 'IT Encoder':
            navigate('/encoder-dashboard');
            break;
          case 'Operations Manager':
            navigate('/manager-dashboard');
            break;
          case 'Amusement Park Personnel':
            navigate('/personnel-dashboard');
            break;
          default:
            setError('Invalid role');
            setOpenSuccessModal(false);
            setLoading(false);
        }
      }, 2000);
    } catch (err) {
      console.error('Login error:', err);
      // Ensure error message is set and displayed
      const errorMessage = err.response?.data?.error || err.message || 'Invalid username or password';
      setError(errorMessage);
      setLoading(false);
      // Don't navigate or refresh - keep user on login page with error message
    }
    
    return false;
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
          elevation={0}
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
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Logo size="large" />
            <Typography
              variant="h4"
              sx={{
                mt: 2,
                fontWeight: 'bold',
                color: 'primary.main',
                letterSpacing: 1,
              }}
            >
              OPMA
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: 'text.secondary',
                mt: 1,
              }}
            >
              Operations And Maintenance Management System
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box 
            component="form" 
            onSubmit={handleSubmit} 
            sx={{ width: '100%' }}
            noValidate
          >
            <TextField
              margin="normal"
              required
              fullWidth
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                fontSize: '1rem',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(107, 91, 149, 0.2)',
                },
              }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Forgot password?
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Success Modal */}
      <Dialog
        open={openSuccessModal}
        onClose={() => setOpenSuccessModal(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2,
            minWidth: 300,
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          <CheckCircle color="success" sx={{ fontSize: 60, display: 'block', mx: 'auto', mb: 2 }} />
          Login Successful
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" align="center" sx={{ mb: 2 }}>
            Redirecting to dashboard...
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <CircularProgress size={24} />
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login; 