import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
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
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import { Report as ReportIcon, Delete as DeleteIcon } from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import { incidentsAPI } from '../../services/api';

const PersonnelDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [incidents, setIncidents] = useState([]);
  const [openIncidentDialog, setOpenIncidentDialog] = useState(false);
  const [incidentData, setIncidentData] = useState({
    ride: '',
    type: 'accident',
    description: '',
    severity: 'low',
    timestamp: '',
  });
  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Load incidents from API
  React.useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const allIncidents = await incidentsAPI.getAll();
      // Map database fields to component fields
      const mappedIncidents = allIncidents.map(incident => ({
        ...incident,
        id: incident.id,
        ride: incident.ride_name || incident.ride || '',
        type: incident.incident_type || incident.type || 'accident',
        description: incident.description || '',
        severity: incident.severity || 'low',
        timestamp: incident.date_reported && incident.time_reported 
          ? `${incident.date_reported}T${incident.time_reported}` 
          : (incident.date_reported || incident.created_at || new Date().toISOString()),
      }));
      setIncidents(mappedIncidents);
    } catch (error) {
      console.error('Error loading incidents:', error);
      setIncidents([]);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Incident Report Functions
  const handleReport = () => setOpenIncidentDialog(true);
  const handleCloseIncidentDialog = () => {
    setOpenIncidentDialog(false);
    setIncidentData({
      ride: '',
      type: 'accident',
      description: '',
      severity: 'low',
      timestamp: '',
    });
  };
  const handleIncidentSubmit = async () => {
    if (!incidentData.ride || !incidentData.description) {
      setWarningMessage('Please fill in all required fields');
      setOpenWarningModal(true);
      return;
    }

    try {
      const dateTime = new Date();
      const dateStr = dateTime.toISOString().split('T')[0];
      const timeStr = dateTime.toTimeString().split(' ')[0];

      const incidentPayload = {
        incident_id: `INC-${Date.now()}`,
        ride_name: incidentData.ride,
        incident_type: incidentData.type || 'accident',
        severity: incidentData.severity || 'low',
        description: incidentData.description,
        date_reported: dateStr,
        time_reported: timeStr,
        status: 'Open',
      };

      await incidentsAPI.create(incidentPayload);
      await loadIncidents();
      handleCloseIncidentDialog();
      alert('Incident reported successfully!');
    } catch (error) {
      console.error('Error saving incident:', error);
      alert('Failed to save incident report');
    }
  };

  // Delete Functions
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

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Personnel Dashboard
        </Typography>

        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Customers' Count (per ride)" />
          <Tab label="Incident Reports" />
        </Tabs>

        {/* Customers' Count (per ride) Tab */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Your Assigned Ride Customer Count
            </Typography>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="body1" color="text.secondary">
                Navigate to the "Customers' Count (per ride)" section from the menu to manage your assigned ride's customer counts and manual entries.
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Incident Reports Tab */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Report Incident
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<ReportIcon />}
                  onClick={handleReport}
                  fullWidth
                >
                  Report Incident
                </Button>
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Incidents
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Ride</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {incidents.map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell>{incident.ride}</TableCell>
                          <TableCell>{incident.type}</TableCell>
                          <TableCell>
                            <Chip
                              label={incident.severity}
                              color={
                                incident.severity === 'low'
                                  ? 'success'
                                  : incident.severity === 'medium'
                                  ? 'warning'
                                  : 'error'
                              }
                            />
                          </TableCell>
                          <TableCell>{new Date(incident.timestamp).toLocaleString()}</TableCell>
                          <TableCell>
                            <IconButton onClick={() => handleDeleteIncident(incident.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Incident Dialog */}
        <Dialog open={openIncidentDialog} onClose={handleCloseIncidentDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Report Incident</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Ride"
              value={incidentData.ride}
              onChange={(e) => setIncidentData({ ...incidentData, ride: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Type</InputLabel>
              <Select
                value={incidentData.type}
                onChange={(e) => setIncidentData({ ...incidentData, type: e.target.value })}
                label="Type"
              >
                <MenuItem value="accident">Accident</MenuItem>
                <MenuItem value="mechanical">Mechanical Issue</MenuItem>
                <MenuItem value="safety">Safety Concern</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Severity</InputLabel>
              <Select
                value={incidentData.severity}
                onChange={(e) => setIncidentData({ ...incidentData, severity: e.target.value })}
                label="Severity"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description"
              value={incidentData.description}
              onChange={(e) => setIncidentData({ ...incidentData, description: e.target.value })}
              margin="normal"
              multiline
              rows={4}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseIncidentDialog}>Cancel</Button>
            <Button onClick={handleIncidentSubmit} variant="contained">
              Submit
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
            <Button onClick={() => setOpenWarningModal(false)} variant="contained">
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default PersonnelDashboard; 