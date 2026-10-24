import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider,
  Alert,
} from '@mui/material';
import { Report as ReportIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { incidentsAPI } from '../../services/api';

const IncidentReport = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [incidentData, setIncidentData] = useState({
    // Incident Details
    dateTime: '',
    location: '',
    description: '',
    type: 'accident',
    
    // Involved Parties
    involvedName: '',
    involvedContact: '',
    involvedRole: '',
    
    // Incident Impact
    injuries: '',
    propertyDamage: '',
    otherImpact: '',
    
    // Response and Actions
    response: '',
    actionsTaken: '',
    followUp: '',
    
    // Reporting and Review
    reportedBy: '',
    reviewedBy: '',
    recommendations: '',
    
    // Additional fields
    severity: 'Minor',
    status: 'Pending Review',
  });

  useEffect(() => {
    // Check authentication
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) {
      navigate('/login');
      return;
    }

    loadIncidents();
  }, [navigate]);

  const loadIncidents = async () => {
    try {
      const allIncidents = await incidentsAPI.getAll();
      // Map database fields to component fields
      const mappedIncidents = allIncidents.map(incident => ({
        ...incident,
        id: incident.id,
        dateTime: incident.date_reported && incident.time_reported 
          ? `${incident.date_reported}T${incident.time_reported}` 
          : (incident.date_reported || incident.created_at || new Date().toISOString()),
        location: incident.ride_name || incident.location || '',
        type: incident.incident_type || incident.type || 'accident',
        description: incident.description || '',
        severity: incident.severity || 'Minor',
        status: incident.status || 'Pending Review',
        reportedBy: '',
        reviewedBy: '',
        recommendations: incident.recommendations || incident.resolution || '',
        injuries: incident.injuries || '',
        propertyDamage: incident.property_damage || '',
        otherImpact: incident.other_impact || '',
        response: incident.response || '',
        actionsTaken: incident.actions_taken || '',
        followUp: incident.follow_up || '',
        involvedName: incident.involved_parties && incident.involved_parties.length > 0 
          ? incident.involved_parties[0].name : '',
        involvedContact: incident.involved_parties && incident.involved_parties.length > 0 
          ? incident.involved_parties[0].contact : '',
        involvedRole: incident.involved_parties && incident.involved_parties.length > 0 
          ? incident.involved_parties[0].role : '',
      }));
      setIncidents(mappedIncidents);
    } catch (error) {
      console.error('Error loading incidents:', error);
    }
  };

  const handleReport = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIncidentData({
      dateTime: '',
      location: '',
      description: '',
      type: 'accident',
      involvedName: '',
      involvedContact: '',
      involvedRole: '',
      injuries: '',
      propertyDamage: '',
      otherImpact: '',
      response: '',
      actionsTaken: '',
      followUp: '',
      reportedBy: '',
      reviewedBy: '',
      recommendations: '',
      severity: 'Minor',
      status: 'Pending Review',
    });
  };

  const handleSubmit = async () => {
    if (!incidentData.dateTime || !incidentData.location || !incidentData.description) {
      setWarningMessage('Please fill in all required fields');
      setOpenWarningModal(true);
      return;
    }

    try {
      const dateTime = new Date(incidentData.dateTime);
      const dateStr = dateTime.toISOString().split('T')[0];
      const timeStr = dateTime.toTimeString().split(' ')[0];

      const incidentPayload = {
        incident_id: `INC-${Date.now()}`,
        ride_name: incidentData.location,
        incident_type: incidentData.type || 'accident',
        severity: incidentData.severity || 'Minor',
        description: incidentData.description,
        date_reported: dateStr,
        time_reported: timeStr,
        status: incidentData.status || 'Pending Review',
        injuries: incidentData.injuries || '',
        property_damage: incidentData.propertyDamage || '',
        other_impact: incidentData.otherImpact || '',
        response: incidentData.response || '',
        actions_taken: incidentData.actionsTaken || '',
        follow_up: incidentData.followUp || '',
        recommendations: incidentData.recommendations || '',
        involved_parties: [{
          name: incidentData.involvedName || '',
          contact: incidentData.involvedContact || '',
          role: incidentData.involvedRole || ''
        }],
      };

      await incidentsAPI.create(incidentPayload);
      await loadIncidents();
      handleCloseDialog();
      alert('Incident reported successfully!');
    } catch (error) {
      console.error('Error saving incident:', error);
      alert('Failed to save incident report');
    }
  };

  const handleDelete = async (id) => {
    try {
      await incidentsAPI.delete(id);
      await loadIncidents();
      alert('Incident deleted successfully!');
    } catch (error) {
      console.error('Error deleting incident:', error);
      alert('Failed to delete incident');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Minor':
        return 'success';
      case 'Moderate':
        return 'warning';
      case 'Major':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending Review':
        return 'warning';
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Incident Reports
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Report Incident
              </Typography>
              <Button
                variant="contained"
                startIcon={<ReportIcon />}
                onClick={handleReport}
              >
                Report Incident
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell>{new Date(incident.dateTime).toLocaleString()}</TableCell>
                      <TableCell>{incident.location}</TableCell>
                      <TableCell>{incident.type}</TableCell>
                      <TableCell>{incident.description}</TableCell>
                      <TableCell>
                        <Chip
                          label={incident.severity}
                          color={getSeverityColor(incident.severity)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={incident.status}
                          color={getStatusColor(incident.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(incident.id)}
                          color="error"
                        >
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Report Incident</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Incident Details Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Incident Details
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date and Time"
                type="datetime-local"
                value={incidentData.dateTime}
                onChange={(e) => setIncidentData({ ...incidentData, dateTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                value={incidentData.location}
                onChange={(e) => setIncidentData({ ...incidentData, location: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type of Incident</InputLabel>
                <Select
                  value={incidentData.type}
                  onChange={(e) => setIncidentData({ ...incidentData, type: e.target.value })}
                  label="Type of Incident"
                >
                  <MenuItem value="accident">Accident</MenuItem>
                  <MenuItem value="injury">Injury</MenuItem>
                  <MenuItem value="property">Property Damage</MenuItem>
                  <MenuItem value="safety">Safety Concern</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Incident Description"
                value={incidentData.description}
                onChange={(e) => setIncidentData({ ...incidentData, description: e.target.value })}
                multiline
                rows={4}
                required
              />
            </Grid>

            {/* Involved Parties Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Involved Parties
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Name"
                value={incidentData.involvedName}
                onChange={(e) => setIncidentData({ ...incidentData, involvedName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Contact Information"
                value={incidentData.involvedContact}
                onChange={(e) => setIncidentData({ ...incidentData, involvedContact: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Role/Position"
                value={incidentData.involvedRole}
                onChange={(e) => setIncidentData({ ...incidentData, involvedRole: e.target.value })}
              />
            </Grid>

            {/* Incident Impact Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Incident Impact
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Injuries"
                value={incidentData.injuries}
                onChange={(e) => setIncidentData({ ...incidentData, injuries: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Property Damage"
                value={incidentData.propertyDamage}
                onChange={(e) => setIncidentData({ ...incidentData, propertyDamage: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Other Impact"
                value={incidentData.otherImpact}
                onChange={(e) => setIncidentData({ ...incidentData, otherImpact: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>

            {/* Response and Actions Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Response and Actions
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Response"
                value={incidentData.response}
                onChange={(e) => setIncidentData({ ...incidentData, response: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Actions Taken"
                value={incidentData.actionsTaken}
                onChange={(e) => setIncidentData({ ...incidentData, actionsTaken: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Follow-up Actions"
                value={incidentData.followUp}
                onChange={(e) => setIncidentData({ ...incidentData, followUp: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>

            {/* Reporting and Review Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Reporting and Review
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Reported By"
                value={incidentData.reportedBy}
                onChange={(e) => setIncidentData({ ...incidentData, reportedBy: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Reviewed By"
                value={incidentData.reviewedBy}
                onChange={(e) => setIncidentData({ ...incidentData, reviewedBy: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recommendations"
                value={incidentData.recommendations}
                onChange={(e) => setIncidentData({ ...incidentData, recommendations: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>

            {/* Additional Fields */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Additional Information
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Severity Level</InputLabel>
                <Select
                  value={incidentData.severity}
                  onChange={(e) => setIncidentData({ ...incidentData, severity: e.target.value })}
                  label="Severity Level"
                >
                  <MenuItem value="Minor">Minor</MenuItem>
                  <MenuItem value="Moderate">Moderate</MenuItem>
                  <MenuItem value="Major">Major</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={incidentData.status}
                  onChange={(e) => setIncidentData({ ...incidentData, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="Pending Review">Pending Review</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Submit Report
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
  );
};

export default IncidentReport; 