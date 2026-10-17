import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Alert,
  Grid,
  Divider,
  TextField,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardMedia,
} from '@mui/material';
import { 
  Info as InfoIcon,
  Search as SearchIcon,
  PictureAsPdf as ReportIcon
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import ReportGenerator from '../common/ReportGenerator';
import { incidentsAPI } from '../../services/api';
import { getReviewStatusChipSx, normalizeReviewStatus } from '../../utils/incidentReviewStatus';

const AdminIncidentReports = () => {
  const [incidents, setIncidents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openPhotoViewer, setOpenPhotoViewer] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [openReportDialog, setOpenReportDialog] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const allIncidents = await incidentsAPI.getAll();
      // Map database fields to component fields
      const mappedIncidents = allIncidents.map(incident => {
        // Handle photos: use server-provided URLs
        const photos = (incident.photos || []).map(photo => ({
          ...photo,
          preview: photo.path || photo.preview, // Use server path for preview
        }));

        return {
          ...incident,
          id: incident.id,
          incident_id: incident.incident_id,
          dateTime: incident.date_reported && incident.time_reported 
            ? `${incident.date_reported}T${incident.time_reported}` 
            : (incident.date_reported || incident.created_at || new Date().toISOString()),
          location: incident.ride_name || incident.location || '',
          type: incident.incident_type || incident.type || '',
          description: incident.description || '',
          severity: incident.severity || 'Minor',
          status: incident.status || 'Open',
          reportedBy: incident.reported_by || '', // Will get from user lookup if needed
          photos: photos,
          involvedParties: Array.isArray(incident.involved_parties) && incident.involved_parties.length > 0
            ? incident.involved_parties
            : [{
                name: '',
                contact: '',
                role: ''
              }],
          injuries: incident.injuries || '',
          propertyDamage: incident.property_damage || '',
          otherImpact: incident.other_impact || '',
          response: incident.response || '',
          actionsTaken: incident.actions_taken || '',
          followUp: incident.follow_up || '',
          recommendations: incident.recommendations || incident.resolution || '',
          reviewStatus: normalizeReviewStatus(incident.review_status),
        };
      });
      setIncidents(mappedIncidents);
    } catch (error) {
      console.error('Error loading incidents:', error);
      setError('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (incident) => {
      setSelectedIncident(incident);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedIncident(null);
    setError('');
  };

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
    setOpenPhotoViewer(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Not Resolved':
        return 'warning';
      case 'Resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const normalizedValue = (value) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') return value;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.getTime();
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
    return String(value).toLowerCase();
  };

  const filteredAndSortedIncidents = incidents
    .filter((incident) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return Object.values(incident)
        .map((v) => (v || '').toString().toLowerCase())
        .some((v) => v.includes(q));
    })
    .filter((incident) => {
      // Status filter
      if (statusFilter === 'all') return true;
      return incident.status === statusFilter;
    })
    .sort((a, b) => {
      // Always sort by dateTime since we removed sortBy option
      const aVal = normalizedValue(a.dateTime);
      const bVal = normalizedValue(b.dateTime);
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) {
    return (
      <DashboardLayout title="Incident Reports">
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Loading incidents...</Typography>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Incident Reports">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search incidents..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Order</InputLabel>
              <Select
                label="Order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="Resolved">Resolved</MenuItem>
                <MenuItem value="Not Resolved">Not Resolved</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="contained"
            startIcon={<ReportIcon />}
            onClick={() => setOpenReportDialog(true)}
            sx={{ ml: 2 }}
          >
            Export
          </Button>
        </Box>

        <Card>
          <CardContent>
            <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        align="center"
                        sx={{ 
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          py: 2,
                          borderBottom: '2px solid #e0e0e0'
                        }}
                      >
                        Date & Time
                      </TableCell>
                <TableCell 
                  align="center"
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    py: 2,
                    borderBottom: '2px solid #e0e0e0'
                  }}
                >
                  Location
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    py: 2,
                    borderBottom: '2px solid #e0e0e0'
                  }}
                >
                  Type
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    py: 2,
                    borderBottom: '2px solid #e0e0e0'
                  }}
                >
                  Status
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    py: 2,
                    borderBottom: '2px solid #e0e0e0'
                  }}
                >
                  Review Status
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    py: 2,
                    borderBottom: '2px solid #e0e0e0'
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body1" color="text.secondary">
                      No incidents found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedIncidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell align="center">{new Date(incident.dateTime).toLocaleString()}</TableCell>
                  <TableCell align="center">{incident.location}</TableCell>
                  <TableCell align="center">{incident.type}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={incident.status}
                      variant="outlined"
                      size="small"
                      sx={{ 
                        color: getStatusColor(incident.status) === 'success' ? 'green' : 
                              getStatusColor(incident.status) === 'warning' ? 'orange' : 
                              getStatusColor(incident.status) === 'error' ? 'red' : 'blue',
                        borderColor: getStatusColor(incident.status) === 'success' ? 'green' : 
                                     getStatusColor(incident.status) === 'warning' ? 'orange' : 
                                     getStatusColor(incident.status) === 'error' ? 'red' : 'blue',
                        backgroundColor: 'transparent'
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={incident.reviewStatus || 'Pending'}
                      variant="outlined"
                      size="small"
                      sx={getReviewStatusChipSx(incident.reviewStatus)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(incident)}
                        sx={{
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: 'info.main',
                            color: 'white',
                            transform: 'scale(1.1)',
                          }
                        }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
            </Box>
          </CardContent>
        </Card>

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>Incident Report Details</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {selectedIncident && (
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
                    value={new Date(selectedIncident.dateTime).toLocaleString()}
                    InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location"
                    value={selectedIncident.location}
                    InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Type"
                    value={selectedIncident.type}
                    InputProps={{ readOnly: true }}
                  />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                    label="Description"
                    value={selectedIncident.description}
                  multiline
                  rows={4}
                    InputProps={{ readOnly: true }}
                />
              </Grid>

              {/* Involved Parties Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Involved Parties
                </Typography>
              </Grid>
              {selectedIncident.involvedParties && selectedIncident.involvedParties.length > 0 ? (
                selectedIncident.involvedParties.map((party, index) => (
                  <React.Fragment key={index}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Party {index + 1}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Name"
                        value={party.name || 'N/A'}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Contact Information"
                        value={party.contact || 'N/A'}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Role/Position"
                        value={party.role || 'N/A'}
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                  </React.Fragment>
                ))
              ) : (
                <Grid item xs={12}>
                  <Typography color="text.secondary">No involved parties recorded.</Typography>
                </Grid>
              )}

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
                    value={selectedIncident.injuries}
                  multiline
                    rows={3}
                    InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Property Damage"
                    value={selectedIncident.propertyDamage}
                  multiline
                    rows={3}
                    InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Other Impact"
                    value={selectedIncident.otherImpact || ''}
                  multiline
                    rows={3}
                    InputProps={{ readOnly: true }}
                />
              </Grid>

              {/* Photos within Incident Impact */}
              {selectedIncident.photos && selectedIncident.photos.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Photos
                  </Typography>
                  <Grid container spacing={2}>
                    {selectedIncident.photos.map((photo, index) => (
                      <Grid item xs={12} sm={6} md={4} key={photo.id || index}>
                        <Card>
                          <CardMedia
                            component="img"
                            height="200"
                            image={photo.path || photo.preview || photo.data}
                            alt="Incident photo"
                            onClick={() => handlePhotoClick(photo)}
                            sx={{
                              objectFit: 'cover',
                              cursor: 'pointer',
                              '&:hover': {
                                opacity: 0.9,
                              },
                            }}
                          />
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}

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
                    value={selectedIncident.response || ''}
                  multiline
                    rows={3}
                    InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Actions Taken"
                    value={selectedIncident.actionsTaken || ''}
                  multiline
                    rows={3}
                    InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                    label="Follow Up"
                    value={selectedIncident.followUp || ''}
                  multiline
                    rows={3}
                    InputProps={{ readOnly: true }}
                />
              </Grid>

              {/* Reporting and Review Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Reporting and Review
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reported By"
                    value={selectedIncident.reportedBy || 'N/A'}
                    InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Recommendations"
                    value={selectedIncident.recommendations || ''}
                  multiline
                  rows={3}
                    InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Review Status
                </Typography>
                <Chip
                  label={selectedIncident.reviewStatus || 'Pending'}
                  variant="outlined"
                  size="small"
                  sx={getReviewStatusChipSx(selectedIncident.reviewStatus)}
                />
              </Grid>

                {/* Status */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                    Status
                </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Chip
                    label={selectedIncident.status}
                    variant="outlined"
                    size="small"
                    sx={{ 
                      color: getStatusColor(selectedIncident.status) === 'success' ? 'green' : 
                            getStatusColor(selectedIncident.status) === 'warning' ? 'orange' : 
                            getStatusColor(selectedIncident.status) === 'error' ? 'red' : 'blue',
                      borderColor: getStatusColor(selectedIncident.status) === 'success' ? 'green' : 
                                   getStatusColor(selectedIncident.status) === 'warning' ? 'orange' : 
                                   getStatusColor(selectedIncident.status) === 'error' ? 'red' : 'blue',
                      backgroundColor: 'transparent'
                    }}
                  />
                  </Box>
              </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Photo Viewer Dialog */}
        <Dialog
          open={openPhotoViewer}
          onClose={() => setOpenPhotoViewer(false)}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(0, 0, 0, 0.9)',
              boxShadow: 'none',
            },
          }}
        >
          <DialogContent sx={{ p: 0, position: 'relative', height: '90vh' }}>
            {selectedPhoto && (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'auto',
                }}
              >
                <img
                  src={selectedPhoto.path || selectedPhoto.preview || selectedPhoto.data}
                  alt="Full size"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ bgcolor: 'rgba(0, 0, 0, 0.9)' }}>
            <Button onClick={() => setOpenPhotoViewer(false)} sx={{ color: 'white' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <ReportGenerator
          open={openReportDialog}
          onClose={() => setOpenReportDialog(false)}
          data={filteredAndSortedIncidents}
          title="Incident Reports"
          reportType="incidents"
          columns={[
            { header: 'Date & Time', field: 'dateTime', render: (item) => new Date(item.dateTime).toLocaleString() },
            { header: 'Location', field: 'location' },
            { header: 'Type', field: 'type' },
            { header: 'Status', field: 'status' },
            { header: 'Description', field: 'description' }
          ]}
        />
      </Box>
    </DashboardLayout>
  );
};

export default AdminIncidentReports; 