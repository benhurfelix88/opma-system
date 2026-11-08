import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Button,
  Typography,
  Avatar,
  Alert,
} from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { keyframes } from '@mui/system';

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
            p: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
            animation: `${fadeIn} 0.5s ease-out`,
          }}
        >
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'warning.main', mb: 3 }}>
            <SupportAgentIcon sx={{ fontSize: 36 }} />
          </Avatar>

          <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
            Password Reset Request
          </Typography>

          <Alert
            severity="warning"
            sx={{ width: '100%', mb: 4, textAlign: 'center' }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'center' }}>
              PLEASE CONTACT YOUR IT ADMINISTRATOR
            </Typography>
          </Alert>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center', lineHeight: 1.8 }}>
            To request a password change, please contact your IT Administrator directly.
            <br /><br />
            They will assist you with resetting your account password securely.
            <br /><br />
            For security purposes, password changes must be authorized by your IT Administrator.
          </Typography>

          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            sx={{
              py: 1.5,
              px: 4,
              fontSize: '1rem',
              fontWeight: 600,
              mt: 2,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(107, 91, 149, 0.2)',
              },
            }}
          >
            Back to Login
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPassword;
