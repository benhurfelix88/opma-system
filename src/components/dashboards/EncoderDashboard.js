import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { keyframes } from '@mui/system';
import {
  Assessment as AssessmentIcon,
  Inventory as InventoryIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';

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

const hoverEffect = keyframes`
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
  100% {
    transform: translateY(0);
  }
`;

const EncoderDashboard = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Overview',
      description: 'Real-time summary of operations',
      icon: <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      path: '/encoder-dashboard/overview',
    },
    {
      title: 'Ride Parts Inventory',
      description: 'Manage and track parts inventory',
      icon: <InventoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      path: '/encoder-dashboard/parts-inventory',
    },
    {
      title: 'Ride Repairs',
      description: 'Manage ride repairs',
      icon: <BuildIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      path: '/encoder-dashboard/ride-repairs',
    },
    {
      title: "Customers' Count (per ride)",
      description: "Manage customers' count per ride and entries",
      icon: <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      path: '/admin-dashboard/customers-count',
    },
  ];

  return (
    <DashboardLayout title="IT Encoder Dashboard">
      <Box sx={{ p: 3, animation: `${fadeIn} 0.5s ease-out` }}>
        <Typography variant="h5" gutterBottom sx={{ 
          fontWeight: 'bold',
          color: 'primary.main',
          mb: 4
        }}>
          Welcome to IT Encoder Dashboard
        </Typography>
        <Grid container spacing={3}>
          {modules.map((module, index) => (
            <Grid item xs={12} sm={6} md={4} key={module.title}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  animation: `${fadeIn} 0.5s ease-out ${index * 0.1}s`,
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                    animation: `${hoverEffect} 0.5s ease-in-out`,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ 
                    mb: 2,
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    }
                  }}>
                    {module.icon}
                  </Box>
                  <Typography gutterBottom variant="h5" component="h2" sx={{
                    fontWeight: 'bold',
                    color: 'primary.main'
                  }}>
                    {module.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {module.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => navigate(module.path)}
                    sx={{
                      width: '80%',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                      }
                    }}
                  >
                    Access Module
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default EncoderDashboard; 