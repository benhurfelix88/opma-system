import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from '@mui/material';
import {
  ConfirmationNumber as TicketIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import ManageUsers from './ManageUsers';
import MaintenanceReports from './MaintenanceReports';
import IncidentReports from './IncidentReports';
import AdminPartsInventory from './AdminPartsInventory';
import AdminCustomersCount from '../modules/AdminCustomersCount';
import { keyframes } from '@mui/system';
import { incidentsAPI } from '../../services/api';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

// Component to display incident count
const IncidentCount = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const incidents = await incidentsAPI.getAll();
        setCount(incidents.length);
      } catch (error) {
        setCount(0);
      }
    };
    loadCount();
  }, []);

  return <>{count}</>;
};

// Component to display recent incidents
const RecentIncidents = () => {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const loadIncidents = async () => {
      try {
        const allIncidents = await incidentsAPI.getAll();
        const mappedIncidents = allIncidents.slice(0, 5).map(incident => ({
          ...incident,
          id: incident.id,
          timestamp: incident.date_reported && incident.time_reported 
            ? `${incident.date_reported}T${incident.time_reported}` 
            : (incident.date_reported || incident.created_at || new Date().toISOString()),
          ride: incident.ride_name || incident.ride || '',
          type: incident.incident_type || incident.type || 'accident',
          severity: incident.severity || 'low',
        }));
        setIncidents(mappedIncidents);
      } catch (error) {
        setIncidents([]);
      }
    };
    loadIncidents();
  }, []);

  return (
    <>
      {incidents.map((incident) => (
        <TableRow key={incident.id}>
          <TableCell>{new Date(incident.timestamp).toLocaleDateString()}</TableCell>
          <TableCell>{incident.ride}</TableCell>
          <TableCell>{incident.type}</TableCell>
          <TableCell>
            <Chip 
              label={incident.severity}
              color={
                incident.severity === 'high' ? 'error' :
                incident.severity === 'medium' ? 'warning' : 'success'
              }
              size="small"
            />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [openLogoutModal, setOpenLogoutModal] = useState(false);
  const [warningMessage] = useState('');
  const [warningAction] = useState(null);

  useEffect(() => {
    // Load current user from sessionStorage
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing current user:', error);
        setUser(null);
      }
    }
  }, []);

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <Box sx={{ p: 3, animation: `${fadeIn} 0.5s ease-out` }}>
        <Routes>
          <Route path="/" element={
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6} lg={3}>
                  <Card sx={{ 
                    height: '100%',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Users
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>U</Avatar>
                        <Typography variant="h4">
                          {JSON.parse(sessionStorage.getItem('users') || '[]').length}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Card sx={{ 
                    height: '100%',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Incidents
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'error.main' }}>I</Avatar>
                        <Typography variant="h4">
                          <IncidentCount />
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Card sx={{ 
                    height: '100%',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Maintenance
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>M</Avatar>
                        <Typography variant="h4">
                          {JSON.parse(sessionStorage.getItem('maintenanceRecords') || '[]').length}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Card sx={{ 
                    height: '100%',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Active Rides
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TicketIcon color="success" />
                        <Typography variant="h4">
                          {JSON.parse(sessionStorage.getItem('rides') || '[]').length}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={3} sx={{ mt: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Recent Incidents
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Ride</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Severity</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <RecentIncidents />
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Recent Maintenance
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Ride</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {JSON.parse(sessionStorage.getItem('maintenanceRecords') || '[]')
                              .slice(0, 5)
                              .map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell>{record.date}</TableCell>
                                  <TableCell>{record.ride}</TableCell>
                                  <TableCell>{record.type}</TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={record.status}
                                      color={
                                        record.status === 'completed' ? 'success' :
                                        record.status === 'in_progress' ? 'warning' : 'info'
                                      }
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          } />
          <Route path="/users" element={<ManageUsers />} />
          <Route path="/customers-count" element={<AdminCustomersCount />} />
          <Route path="/incidents" element={<IncidentReports />} />
          <Route path="/maintenance" element={<MaintenanceReports />} />
          <Route path="/parts-inventory" element={<AdminPartsInventory />} />
        </Routes>
      </Box>

      {/* Logout Dialog */}
      <Dialog open={openLogoutModal} onClose={() => setOpenLogoutModal(false)}>
        <DialogTitle>Logout</DialogTitle>
        <DialogContent>
          <Typography>{warningMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLogoutModal(false)}>Cancel</Button>
          <Button
            onClick={() => {
              warningAction();
              setOpenLogoutModal(false);
            }}
            variant="contained"
            color="primary"
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminDashboard; 