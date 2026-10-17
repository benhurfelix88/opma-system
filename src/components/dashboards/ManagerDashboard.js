import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Tabs,
  Tab,
} from '@mui/material';
import { keyframes } from '@mui/system';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Report as ReportIcon,
  Build as BuildIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import ManagerPartsInventory from './ManagerPartsInventory';
import { incidentsAPI } from '../../services/api';

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

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const ManagerDashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [openIncidentDialog, setOpenIncidentDialog] = useState(false);
  const [openMaintenanceDialog, setOpenMaintenanceDialog] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [incidentData, setIncidentData] = useState({
    date: '',
    ride: '',
    description: '',
    status: 'open',
    resolution: '',
  });
  const [maintenanceData, setMaintenanceData] = useState({
    date: '',
    ride: '',
    description: '',
    status: 'pending',
    completedBy: '',
  });
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadIncidents();

    // Load maintenance records from localStorage
    const storedMaintenance = localStorage.getItem('maintenanceRecords');
    if (storedMaintenance) {
      try {
        const parsedMaintenance = JSON.parse(storedMaintenance);
        setMaintenanceRecords(Array.isArray(parsedMaintenance) ? parsedMaintenance : []);
      } catch (error) {
        console.error('Error parsing maintenance records:', error);
        setMaintenanceRecords([]);
      }
    } else {
      setMaintenanceRecords([]);
    }

    // Check authentication
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const loadIncidents = async () => {
    try {
      const allIncidents = await incidentsAPI.getAll();
      // Map database fields to component fields
      const mappedIncidents = allIncidents.map(incident => ({
        ...incident,
        id: incident.id,
        date: incident.date_reported || incident.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        ride: incident.ride_name || incident.ride || '',
        description: incident.description || '',
        status: incident.status || 'open',
        resolution: incident.resolution || '',
      }));
      setIncidents(mappedIncidents);
    } catch (error) {
      console.error('Error loading incidents:', error);
      setIncidents([]);
    }
  };

  const handleAddIncident = () => {
    setEditingIncident(null);
    setIncidentData({
      date: new Date().toISOString().split('T')[0],
      ride: '',
      description: '',
      status: 'open',
      resolution: '',
    });
    setOpenIncidentDialog(true);
  };

  const handleEditIncident = (incident) => {
    setEditingIncident(incident);
    setIncidentData(incident);
    setOpenIncidentDialog(true);
  };

  const handleDeleteIncident = async (id) => {
    try {
      await incidentsAPI.delete(id);
      await loadIncidents();
      alert('Incident deleted successfully!');
    } catch (error) {
      console.error('Error deleting incident:', error);
      alert('Failed to delete incident');
    }
  };

  const handleIncidentSubmit = async () => {
    try {
      const dateTime = new Date(incidentData.date);
      const dateStr = dateTime.toISOString().split('T')[0];
      const timeStr = dateTime.toTimeString().split(' ')[0];

      const incidentPayload = {
        incident_id: editingIncident ? editingIncident.incident_id : `INC-${Date.now()}`,
        ride_name: incidentData.ride,
        incident_type: 'accident',
        severity: 'low',
        description: incidentData.description || '',
        date_reported: dateStr,
        time_reported: timeStr,
        status: incidentData.status || 'open',
        resolution: incidentData.resolution || '',
      };

      if (editingIncident) {
        await incidentsAPI.update(editingIncident.id, incidentPayload);
      } else {
        await incidentsAPI.create(incidentPayload);
      }

      await loadIncidents();
      setOpenIncidentDialog(false);
      alert(editingIncident ? 'Incident updated successfully!' : 'Incident added successfully!');
    } catch (error) {
      console.error('Error saving incident:', error);
      alert('Failed to save incident');
    }
  };

  const handleAddMaintenance = () => {
    setEditingMaintenance(null);
    setMaintenanceData({
      date: new Date().toISOString().split('T')[0],
      ride: '',
      description: '',
      status: 'pending',
      completedBy: '',
    });
    setOpenMaintenanceDialog(true);
  };

  const handleEditMaintenance = (record) => {
    setEditingMaintenance(record);
    setMaintenanceData(record);
    setOpenMaintenanceDialog(true);
  };

  const handleDeleteMaintenance = (id) => {
    const updatedRecords = maintenanceRecords.filter((record) => record.id !== id);
    setMaintenanceRecords(updatedRecords);
    localStorage.setItem('maintenanceRecords', JSON.stringify(updatedRecords));
  };

  const handleMaintenanceSubmit = () => {
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const username = currentUser ? currentUser.username : 'Unknown User';

    if (editingMaintenance) {
      const updatedRecords = maintenanceRecords.map((record) =>
        record.id === editingMaintenance.id ? { ...maintenanceData, id: record.id, reportedBy: username } : record
      );
      setMaintenanceRecords(updatedRecords);
      localStorage.setItem('maintenanceRecords', JSON.stringify(updatedRecords));
    } else {
      const newRecord = {
        ...maintenanceData,
        id: Date.now(),
        reportedBy: username,
      };
      const updatedRecords = [...maintenanceRecords, newRecord];
      setMaintenanceRecords(updatedRecords);
      localStorage.setItem('maintenanceRecords', JSON.stringify(updatedRecords));
    }
    setOpenMaintenanceDialog(false);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={
          <Box sx={{ p: 3, animation: `${fadeIn} 0.5s ease-out` }}>
            <Typography variant="h5" gutterBottom sx={{ 
              fontWeight: 'bold',
              color: 'primary.main',
              mb: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <ReportIcon /> Manager Dashboard
            </Typography>

            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{ mb: 3 }}
            >
              <Tab icon={<ReportIcon />} label="Incidents" />
              <Tab icon={<BuildIcon />} label="Maintenance" />
              <Tab icon={<InventoryIcon />} label="Ride Parts Inventory" />
            </Tabs>

            {activeTab === 0 && (
              <Grid container spacing={3}>
                {/* Incident Reports Section */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    height: '100%',
                    animation: `${slideIn} 0.5s ease-out`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          color: 'primary.main',
                          fontWeight: 'bold'
                        }}>
                          <ReportIcon /> Incident Reports
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleAddIncident}
                          sx={{
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.05)',
                            }
                          }}
                        >
                          Add Incident
                        </Button>
                      </Box>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Ride</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {incidents.slice(0, 5).map((incident) => (
                              <TableRow key={incident.id}>
                                <TableCell>{incident.date}</TableCell>
                                <TableCell>{incident.ride}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={incident.status}
                                    color={
                                      incident.status === 'resolved' ? 'success' :
                                      incident.status === 'in_progress' ? 'warning' : 'error'
                                    }
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <IconButton onClick={() => handleEditIncident(incident)}>
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton onClick={() => handleDeleteIncident(incident.id)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Maintenance Reports Section */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    height: '100%',
                    animation: `${slideIn} 0.5s ease-out`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          color: 'primary.main',
                          fontWeight: 'bold'
                        }}>
                          <BuildIcon /> Maintenance Reports
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleAddMaintenance}
                          sx={{
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.05)',
                            }
                          }}
                        >
                          Add Maintenance
                        </Button>
                      </Box>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Ride</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {maintenanceRecords.slice(0, 5).map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>{record.date}</TableCell>
                                <TableCell>{record.ride}</TableCell>
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
                                <TableCell>
                                  <IconButton onClick={() => handleEditMaintenance(record)}>
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton onClick={() => handleDeleteMaintenance(record.id)}>
                                    <DeleteIcon />
                                  </IconButton>
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
            )}

            {activeTab === 1 && (
              <Grid container spacing={3}>
                {/* Incident Reports Section */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    height: '100%',
                    animation: `${slideIn} 0.5s ease-out`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          color: 'primary.main',
                          fontWeight: 'bold'
                        }}>
                          <ReportIcon /> Incident Reports
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleAddIncident}
                          sx={{
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.05)',
                            }
                          }}
                        >
                          Add Incident
                        </Button>
                      </Box>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Ride</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {incidents.slice(0, 5).map((incident) => (
                              <TableRow key={incident.id}>
                                <TableCell>{incident.date}</TableCell>
                                <TableCell>{incident.ride}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={incident.status}
                                    color={
                                      incident.status === 'resolved' ? 'success' :
                                      incident.status === 'in_progress' ? 'warning' : 'error'
                                    }
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <IconButton onClick={() => handleEditIncident(incident)}>
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton onClick={() => handleDeleteIncident(incident.id)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Maintenance Reports Section */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    height: '100%',
                    animation: `${slideIn} 0.5s ease-out`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          color: 'primary.main',
                          fontWeight: 'bold'
                        }}>
                          <BuildIcon /> Maintenance Reports
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleAddMaintenance}
                          sx={{
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.05)',
                            }
                          }}
                        >
                          Add Maintenance
                        </Button>
                      </Box>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Ride</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {maintenanceRecords.slice(0, 5).map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>{record.date}</TableCell>
                                <TableCell>{record.ride}</TableCell>
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
                                <TableCell>
                                  <IconButton onClick={() => handleEditMaintenance(record)}>
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton onClick={() => handleDeleteMaintenance(record.id)}>
                                    <DeleteIcon />
                                  </IconButton>
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
            )}

            {activeTab === 2 && (
              <ManagerPartsInventory />
            )}
          </Box>
        } />
      </Routes>

      {/* Incident Dialog */}
      <Dialog open={openIncidentDialog} onClose={() => setOpenIncidentDialog(false)}>
        <DialogTitle>{editingIncident ? 'Edit Incident' : 'Add Incident'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Date"
            type="date"
            value={incidentData.date}
            onChange={(e) => setIncidentData({ ...incidentData, date: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Ride"
            value={incidentData.ride}
            onChange={(e) => setIncidentData({ ...incidentData, ride: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={incidentData.description}
            onChange={(e) => setIncidentData({ ...incidentData, description: e.target.value })}
            margin="normal"
            multiline
            rows={4}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={incidentData.status}
              onChange={(e) => setIncidentData({ ...incidentData, status: e.target.value })}
              label="Status"
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Resolution"
            value={incidentData.resolution}
            onChange={(e) => setIncidentData({ ...incidentData, resolution: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenIncidentDialog(false)}>Cancel</Button>
          <Button onClick={handleIncidentSubmit} variant="contained">
            {editingIncident ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={openMaintenanceDialog} onClose={() => setOpenMaintenanceDialog(false)}>
        <DialogTitle>{editingMaintenance ? 'Edit Maintenance' : 'Add Maintenance'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Date"
            type="date"
            value={maintenanceData.date}
            onChange={(e) => setMaintenanceData({ ...maintenanceData, date: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Ride"
            value={maintenanceData.ride}
            onChange={(e) => setMaintenanceData({ ...maintenanceData, ride: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={maintenanceData.description}
            onChange={(e) => setMaintenanceData({ ...maintenanceData, description: e.target.value })}
            margin="normal"
            multiline
            rows={4}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={maintenanceData.status}
              onChange={(e) => setMaintenanceData({ ...maintenanceData, status: e.target.value })}
              label="Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Completed By"
            value={maintenanceData.completedBy}
            onChange={(e) => setMaintenanceData({ ...maintenanceData, completedBy: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMaintenanceDialog(false)}>Cancel</Button>
          <Button onClick={handleMaintenanceSubmit} variant="contained">
            {editingMaintenance ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default ManagerDashboard; 