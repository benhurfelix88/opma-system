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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Grid,
  Alert,
  Divider,
  Card,
  CardMedia,
  CardActions,
  CardContent,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ApproveIcon,
  CloudUpload as CloudUploadIcon,
  Info as InfoIcon,
  Add as AddIconMaterial,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
  PictureAsPdf as ReportIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import ReportGenerator from '../common/ReportGenerator';
import { incidentsAPI } from '../../services/api';
import { Snackbar } from '@mui/material';
import { REVIEW_STATUS_OPTIONS, getReviewStatusChipSx, normalizeReviewStatus } from '../../utils/incidentReviewStatus';

const ManagerIncidentReports = () => {
  const [incidents, setIncidents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openPhotoViewer, setOpenPhotoViewer] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('dateTime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [incidentData, setIncidentData] = useState({
    // Incident Details
    dateTime: '',
    location: '',
    description: '',
    type: 'accident',
    
    // Involved Parties
    involvedParties: [{ name: '', contact: '', role: '' }],
    
    // Incident Impact
    injuries: '',
    propertyDamage: '',
    otherImpact: '',
    photos: [],
    
    // Response and Actions
    response: '',
    actionsTaken: '',
    followUp: '',
    
    // Reporting and Review
    reportedBy: '',
    reviewedBy: '',
    recommendations: '',
    
    // Additional fields
    status: 'Not Resolved',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    message: '',
    onConfirm: null,
  });
  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

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

  const formatDateTimeDisplay = (value) => {
    if (!value || value === 'null' || value === 'undefined' || value === '' || value === 'Invalid Date') {
      return 'N/A';
    }
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return 'N/A';
      return value.toLocaleString();
    }
    if (typeof value === 'string') {
      if (value.includes('T')) {
        const parts = value.split('T');
        if (parts.length === 2) {
          const datePart = parts[0].trim();
          let timePart = parts[1].trim();
          if (timePart) {
            timePart = timePart.split('.')[0];
            const timeParts = timePart.split(':');
            if (timeParts.length === 2) {
              timePart = timePart + ':00';
            } else if (timeParts.length === 1) {
              timePart = timePart + ':00:00';
            }
            if (!/^\d{2}:\d{2}:\d{2}$/.test(timePart)) {
              return 'N/A';
            }
            const dateStr = `${datePart}T${timePart}`;
            const date = new Date(dateStr);
            if (!Number.isNaN(date.getTime())) {
              return date.toLocaleString();
            }
          }
        }
      }
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString();
      }
      if (value.includes(' ')) {
        const dateWithT = new Date(value.replace(' ', 'T'));
        if (!Number.isNaN(dateWithT.getTime())) {
          return dateWithT.toLocaleString();
        }
      }
    }
    return 'N/A';
  };

  const getFilteredIncidents = () => {
    let filtered = [];
    switch (activeTab) {
      case 'resolved':
        filtered = incidents.filter(incident => incident.status === 'Resolved');
        break;
      case 'unresolved':
        filtered = incidents.filter(incident => incident.status === 'Not Resolved');
        break;
      default:
        filtered = incidents;
    }

    return filtered.sort((a, b) => {
      const aVal = normalizedValue(
        sortBy === 'dateTime'
          ? a.dateTime
          : sortBy === 'location'
          ? a.location
          : sortBy === 'type'
          ? a.type
          : a[sortBy]
      );
      const bVal = normalizedValue(
        sortBy === 'dateTime'
          ? b.dateTime
          : sortBy === 'location'
          ? b.location
          : sortBy === 'type'
          ? b.type
          : b[sortBy]
      );
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const allIncidents = await incidentsAPI.getAll();
      const mappedIncidents = allIncidents.map(incident => {
        const photos = (incident.photos || []).map(photo => ({
          ...photo,
          preview: photo.path || photo.preview,
        }));
        let rawDateTime = '';
        if (incident.date_reported && incident.time_reported && 
            incident.date_reported !== null && incident.time_reported !== null &&
            String(incident.date_reported) !== 'null' && String(incident.time_reported) !== 'null') {
          const candidate = `${incident.date_reported}T${incident.time_reported}`;
          const d = new Date(candidate);
          if (!Number.isNaN(d.getTime())) {
            rawDateTime = candidate;
          }
        }
        if (!rawDateTime && incident.date_reported && 
            incident.date_reported !== null && String(incident.date_reported) !== 'null') {
          const candidate = `${incident.date_reported}T00:00:00`;
          const d = new Date(candidate);
          if (!Number.isNaN(d.getTime())) {
            rawDateTime = candidate;
          }
        }
        if (!rawDateTime && (incident.created_at || incident.createdAt)) {
          const candidate = incident.created_at || incident.createdAt;
          const d = new Date(candidate);
          if (!Number.isNaN(d.getTime())) {
            rawDateTime = candidate;
          }
        }
        if (!rawDateTime) {
          rawDateTime = new Date().toISOString();
        }
        return {
          ...incident,
          id: incident.id,
          incident_id: incident.incident_id,
          dateTime: rawDateTime,
          date_reported: incident.date_reported 
            ? (typeof incident.date_reported === 'string' 
                ? incident.date_reported 
                : incident.date_reported.toISOString().split('T')[0])
            : null,
          time_reported: incident.time_reported 
            ? (typeof incident.time_reported === 'string' 
                ? incident.time_reported 
                : (incident.time_reported instanceof Date 
                    ? incident.time_reported.toTimeString().split(' ')[0]
                    : String(incident.time_reported)))
            : null,
          location: incident.ride_name || incident.location || '',
          type: incident.incident_type || incident.type || 'accident',
          description: incident.description || '',
          severity: incident.severity || 'low',
          status: incident.status || 'Not Resolved',
          photos: photos,
          involvedParties: incident.involved_parties || [{ name: '', contact: '', role: '' }],
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
    }
  };

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    const newPhotos = files.map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      type: file.type,
      size: file.size,
      preview: URL.createObjectURL(file),
      isNew: true
    }));
    setIncidentData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos]
    }));
  };

  const handleRemovePhoto = (photoId) => {
    setIncidentData(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== photoId)
    }));
  };

  const handleOpenDialog = (incident = null) => {
    if (incident) {
      setSelectedIncident(incident);
      const photos = (incident.photos || []).map(photo => ({
        ...photo,
        preview: photo.path || photo.preview,
        isNew: false
      }));
      let formattedDateTime = '';
      if (incident.date_reported && incident.time_reported) {
        try {
          let timeStr = incident.time_reported;
          if (timeStr.split(':').length === 2) {
            timeStr = timeStr.substring(0, 5);
          } else if (timeStr.split(':').length === 3) {
            timeStr = timeStr.substring(0, 5);
          }
          formattedDateTime = `${incident.date_reported}T${timeStr}`;
        } catch (e) {
          console.error('Error formatting dateTime from date_reported/time_reported:', e);
        }
      }
      if (!formattedDateTime && incident.dateTime) {
        try {
          const dateObj = new Date(incident.dateTime);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        } catch (e) {
          console.error('Error formatting dateTime:', e);
        }
      }
      if (!formattedDateTime) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
      setIncidentData({
        ...incident,
        dateTime: formattedDateTime,
        involvedParties: Array.isArray(incident.involvedParties) && incident.involvedParties.length > 0 
                          ? incident.involvedParties 
                          : (incident.involved_parties || [{ name: '', contact: '', role: '' }]),
        photos: photos,
      });
      setIsEditing(true);
    } else {
      setSelectedIncident(null);
      setIncidentData({
        dateTime: '',
        location: '',
        description: '',
        type: 'accident',
        involvedParties: [{ name: '', contact: '', role: '' }],
        injuries: '',
        propertyDamage: '',
        otherImpact: '',
        photos: [],
        response: '',
        actionsTaken: '',
        followUp: '',
        reportedBy: '',
        reviewedBy: '',
        recommendations: '',
        status: 'Not Resolved',
      });
      setIsEditing(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedIncident(null);
    setIsEditing(false);
  };

  const handleAddParty = () => {
    setIncidentData(prev => ({
      ...prev,
      involvedParties: [...prev.involvedParties, { name: '', contact: '', role: '' }]
    }));
  };

  const handleRemoveParty = (index) => {
    setIncidentData(prev => ({
      ...prev,
      involvedParties: prev.involvedParties.filter((_, i) => i !== index)
    }));
  };

  const handlePartyChange = (index, field, value) => {
    setIncidentData(prev => {
      const updatedParties = [...prev.involvedParties];
      updatedParties[index] = { ...updatedParties[index], [field]: value };
      return { ...prev, involvedParties: updatedParties };
    });
  };

  const handleSubmit = async () => {
    if (!incidentData.dateTime || !incidentData.location || !incidentData.description) {
      setWarningMessage('Please fill in all required fields');
      setOpenWarningModal(true);
      return;
    }
    try {
      let dateStr = '';
      let timeStr = '';
      if (incidentData.dateTime && incidentData.dateTime.includes('T')) {
        const [datePart, timePart] = incidentData.dateTime.split('T');
        dateStr = datePart;
        if (timePart) {
          const timeParts = timePart.split(':');
          if (timeParts.length === 2) {
            timeStr = `${timeParts[0]}:${timeParts[1]}:00`;
          } else {
            timeStr = timePart;
          }
        } else {
          timeStr = '00:00:00';
        }
      } else {
        const dateTime = new Date(incidentData.dateTime);
        if (isNaN(dateTime.getTime())) {
          throw new Error('Invalid date/time value');
        }
        dateStr = dateTime.toISOString().split('T')[0];
        timeStr = dateTime.toTimeString().split(' ')[0];
      }
      if (!dateStr || !timeStr) {
        throw new Error('Invalid date/time value');
      }
      const newPhotoFiles = (incidentData.photos || [])
        .filter(photo => photo.isNew && photo.file instanceof File)
        .map(photo => photo.file);
      const existingPhotos = (incidentData.photos || [])
        .filter(photo => !photo.isNew)
        .map(photo => ({
          id: photo.id,
          filename: photo.filename,
          originalname: photo.originalname || photo.name,
          path: photo.path,
          mimetype: photo.mimetype || photo.type,
          size: photo.size
        }));
      const incidentPayload = {
        incident_id: selectedIncident ? selectedIncident.incident_id : `INC-${Date.now()}`,
        ride_name: incidentData.location,
        incident_type: incidentData.type || 'accident',
        severity: incidentData.severity || 'low',
        description: incidentData.description,
        date_reported: dateStr,
        time_reported: timeStr,
        status: incidentData.status || 'Not Resolved',
        involved_parties: incidentData.involvedParties || [],
        injuries: incidentData.injuries || '',
        property_damage: incidentData.propertyDamage || '',
        other_impact: incidentData.otherImpact || '',
        response: incidentData.response || '',
        actions_taken: incidentData.actionsTaken || '',
        follow_up: incidentData.followUp || '',
        recommendations: incidentData.recommendations || '',
        resolution: incidentData.recommendations || '',
      };
      if (selectedIncident) {
        await incidentsAPI.update(selectedIncident.id, incidentPayload, newPhotoFiles, existingPhotos);
        setSnackbar({ open: true, message: 'Incident updated successfully', severity: 'success' });
      } else {
        await incidentsAPI.create(incidentPayload, newPhotoFiles);
        setSnackbar({ open: true, message: 'Incident reported successfully', severity: 'success' });
      }
      await loadIncidents();
      handleCloseDialog();
      setIncidentData({
        dateTime: '',
        location: '',
        description: '',
        type: 'accident',
        involvedParties: [{ name: '', contact: '', role: '' }],
        injuries: '',
        propertyDamage: '',
        otherImpact: '',
        photos: [],
        response: '',
        actionsTaken: '',
        followUp: '',
        reportedBy: '',
        reviewedBy: '',
        recommendations: '',
        status: 'Not Resolved',
      });
    } catch (error) {
      console.error('Error saving incident:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save incident report';
      setSnackbar({ open: true, message: `Failed to save incident report: ${errorMessage}`, severity: 'error' });
    }
  };

  const handleResolve = async (incident) => {
    try {
      let dateTime;
      if (incident.dateTime) {
        dateTime = new Date(incident.dateTime);
      } else if (incident.date_reported && incident.time_reported) {
        dateTime = new Date(`${incident.date_reported}T${incident.time_reported}`);
      } else {
        dateTime = new Date(incident.created_at || new Date());
      }
      
      if (isNaN(dateTime.getTime())) {
        dateTime = new Date(); // Fallback to current date
      }
      
      const dateStr = dateTime.toISOString().split('T')[0];
      const timeStr = dateTime.toTimeString().split(' ')[0];

      await incidentsAPI.update(incident.id, {
        incident_id: incident.incident_id,
        ride_name: incident.location || incident.ride_name,
        incident_type: incident.type || incident.incident_type,
        severity: incident.severity,
        description: incident.description,
        date_reported: dateStr,
        time_reported: timeStr,
        status: 'Resolved',
        resolution: incident.recommendations || incident.resolution,
      });

      await loadIncidents();
      setSnackbar({ open: true, message: 'Incident resolved successfully', severity: 'success' });
    } catch (error) {
      console.error('Error resolving incident:', error);
      setSnackbar({ open: true, message: 'Failed to resolve incident', severity: 'error' });
    }
  };

  const handleDelete = (id) => {
    const incidentToDelete = incidents.find(incident => incident.id === id);
    const incidentDate = incidentToDelete?.dateTime ? formatDateTimeDisplay(incidentToDelete.dateTime) : 'N/A';
    const message = `Are you sure you want to delete this incident report?\n\nLocation: ${incidentToDelete?.location || 'N/A'}\nDate & Time: ${incidentDate}\nType: ${incidentToDelete?.type || 'N/A'}`;

    setDeleteDialog({
      open: true,
      message,
      onConfirm: async () => {
        try {
          await incidentsAPI.delete(id);
          await loadIncidents();
          setSnackbar({ open: true, message: 'Incident deleted successfully', severity: 'success' });
        } catch (error) {
          console.error('Error deleting incident:', error);
          setSnackbar({ open: true, message: 'Failed to delete incident', severity: 'error' });
        } finally {
          setDeleteDialog(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const handleViewIncident = (incident) => {
    setSelectedIncident(incident);
    setOpenViewDialog(true);
  };

  const handleReviewStatusChange = async (id, newStatus) => {
    if (!newStatus || !REVIEW_STATUS_OPTIONS.includes(newStatus)) return;
    const incident = incidents.find((item) => String(item.id) === String(id));
    if (!incident || incident.reviewStatus === newStatus) return;
    try {
      await incidentsAPI.updateReviewStatus(incident.id, newStatus);
      setIncidents((prev) =>
        prev.map((item) => (String(item.id) === String(id) ? { ...item, reviewStatus: newStatus } : item))
      );
      if (selectedIncident && String(selectedIncident.id) === String(id)) {
        setSelectedIncident((prev) => ({ ...prev, reviewStatus: newStatus }));
      }
      setSnackbar({ open: true, message: 'Review status updated', severity: 'success' });
    } catch (error) {
      console.error('Error updating review status:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update review status';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
    setOpenPhotoViewer(true);
  };

  return (
    <DashboardLayout title="Incident Reports">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                label="Sort By"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="dateTime">Date/Time</MenuItem>
                <MenuItem value="location">Location</MenuItem>
                <MenuItem value="type">Type</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
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
                      </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<ReportIcon />}
              onClick={() => setOpenReportDialog(true)}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Report
            </Button>
          </Box>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label={`All (${incidents.length})`} value="all" />
            <Tab label={`Resolved (${incidents.filter(i => i.status === 'Resolved').length})`} value="resolved" />
            <Tab label={`Not Resolved (${incidents.filter(i => i.status === 'Not Resolved').length})`} value="unresolved" />
          </Tabs>
        </Paper>

        <Card>
          <CardContent>
            <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell align="center">Date & Time</TableCell>
                <TableCell align="center">Location</TableCell>
                <TableCell align="center">Type</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Review Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredIncidents().map((incident) => {
                // Build date/time string for display - prioritize date_reported and time_reported
                let dateTimeStr = '';
                
                if (incident.date_reported && incident.time_reported) {
                  // Clean and format the values
                  const dateStr = String(incident.date_reported).trim().split('T')[0].split(' ')[0];
                  let timeStr = String(incident.time_reported).trim().split('.')[0]; // Remove milliseconds
                  
                  // Validate date format (YYYY-MM-DD)
                  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                    // Ensure time has proper format
                    const timeParts = timeStr.split(':');
                    if (timeParts.length === 2) {
                      timeStr = timeStr + ':00'; // Add seconds
                    } else if (timeParts.length === 1) {
                      timeStr = timeStr + ':00:00';
                    }
                    
                    // Validate time format
                    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
                      dateTimeStr = `${dateStr}T${timeStr}`;
                    }
                  }
                }
                
                // Fallback to dateTime if date_reported/time_reported not available
                if (!dateTimeStr && incident.dateTime) {
                  dateTimeStr = incident.dateTime;
                }
                
                return (
                <TableRow key={incident.id}>
                  <TableCell align="center">{formatDateTimeDisplay(dateTimeStr)}</TableCell>
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
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <Select
                        value={REVIEW_STATUS_OPTIONS.includes(incident.reviewStatus) ? incident.reviewStatus : ''}
                        displayEmpty
                        renderValue={(value) => value || 'Pending'}
                        onChange={(e) => handleReviewStatusChange(incident.id, e.target.value)}
                      >
                        {REVIEW_STATUS_OPTIONS.map((status) => (
                          <MenuItem key={status} value={status}>{status}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="center">
                    {incident.status === 'Resolved' ? (
                      <Tooltip title="View Details (Resolved incidents are read-only)">
                        <IconButton 
                          size="small"
                          onClick={() => handleViewIncident(incident)}
                          sx={{
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: 'info.main',
                              color: 'white',
                              transform: 'scale(1.1)',
                            },
                          }}
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(incident)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleResolve(incident)}
                          color="success"
                        >
                          <ApproveIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(incident.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => handleViewIncident(incident)}
                            sx={{
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: 'info.main',
                                color: 'white',
                                transform: 'scale(1.1)',
                              },
                            }}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog(prev => ({ ...prev, open: false }))}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
              {deleteDialog.message}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button
              onClick={async () => {
                if (deleteDialog.onConfirm) {
                  await deleteDialog.onConfirm();
                }
              }}
              color="error"
              variant="contained"
            >
              Delete
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

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>{isEditing ? 'Edit Incident Report' : 'Report New Incident'}</DialogTitle>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Involved Parties
                </Typography>
                    <Button onClick={handleAddParty} startIcon={<AddIconMaterial />} size="small">
                    Add
                    </Button>
                </Box>
              </Grid>
              {incidentData.involvedParties.map((party, index) => (
                <React.Fragment key={index}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Name"
                      value={party.name}
                      onChange={(e) => handlePartyChange(index, 'name', e.target.value)}
                      required
                />
              </Grid>
                  <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                      label="Contact"
                      value={party.contact}
                      onChange={(e) => handlePartyChange(index, 'contact', e.target.value)}
                />
              </Grid>
                  <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={party.role || ''}
                    onChange={(e) => handlePartyChange(index, 'role', e.target.value)}
                    label="Role"
                  >
                    <MenuItem value="Guest">Guest</MenuItem>
                    <MenuItem value="Staff">Staff</MenuItem>
                    <MenuItem value="Manager">Manager</MenuItem>
                    <MenuItem value="Security">Security</MenuItem>
                    <MenuItem value="Medical Personnel">Medical Personnel</MenuItem>
                    <MenuItem value="Maintenance">Maintenance</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
                  <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {incidentData.involvedParties.length > 1 && (
                      <IconButton onClick={() => handleRemoveParty(index)} color="error" size="small">
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    )}
                  </Grid>
                </React.Fragment>
              ))}

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

              {/* Photo Upload Section */}
              <Grid item xs={12}>
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Upload Photos
                  </Typography>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="photo-upload"
                    type="file"
                    multiple
                    onChange={handlePhotoUpload}
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                    >
                      Upload Photos
                    </Button>
                  </label>
                </Box>

                {/* Photo Preview Grid */}
                <Grid container spacing={2}>
                  {incidentData.photos.map((photo) => (
                    <Grid item xs={12} sm={6} md={4} key={photo.id}>
                      <Card>
                        <CardMedia
                          component="img"
                          height="140"
                          image={photo.preview}
                          alt="Incident photo"
                        />
                        <CardActions>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemovePhoto(photo.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reported By"
                  value={incidentData.reportedBy}
                  onChange={(e) => setIncidentData({ ...incidentData, reportedBy: e.target.value })}
                  required
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
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={incidentData.status}
                    onChange={(e) => setIncidentData({ ...incidentData, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="Not Resolved">Not Resolved</MenuItem>
                    <MenuItem value="Resolved">Resolved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {isEditing ? 'Update Report' : 'Submit Report'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Incident Dialog */}
        <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>View Incident Report</DialogTitle>
          <DialogContent>
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
                    value={(() => {
                      // Build date/time string for display
                      let dateTimeStr = '';
                      
                      if (selectedIncident.date_reported && selectedIncident.time_reported) {
                        const dateStr = String(selectedIncident.date_reported).trim().split('T')[0].split(' ')[0];
                        let timeStr = String(selectedIncident.time_reported).trim().split('.')[0];
                        
                        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                          const timeParts = timeStr.split(':');
                          if (timeParts.length === 2) {
                            timeStr = timeStr + ':00';
                          } else if (timeParts.length === 1) {
                            timeStr = timeStr + ':00:00';
                          }
                          
                          if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
                            dateTimeStr = `${dateStr}T${timeStr}`;
                          }
                        }
                      }
                      
                      if (!dateTimeStr && selectedIncident.dateTime) {
                        dateTimeStr = selectedIncident.dateTime;
                      }
                      
                      return formatDateTimeDisplay(dateTimeStr);
                    })()}
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
                      <Grid item xs={12}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Party {index + 1}</Typography></Grid>
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
                          label="Contact"
                          value={party.contact || 'N/A'}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Role"
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
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Property Damage"
                    value={selectedIncident.propertyDamage}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Other Impact"
                    value={selectedIncident.otherImpact}
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
                      {selectedIncident.photos.map((photo) => (
                        <Grid item xs={12} sm={6} md={4} key={photo.id}>
                          <Card>
                            <CardMedia
                              component="img"
                              height="200"
                              image={photo.path || photo.preview || photo.data}
                              alt="Incident photo"
                              onClick={() => handlePhotoClick(photo)}
                              sx={{
                                objectFit: 'cover',
                                '&:hover': {
                                  cursor: 'pointer',
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
                    value={selectedIncident.response}
                    multiline
                    rows={3}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Actions Taken"
                    value={selectedIncident.actionsTaken}
                    multiline
                    rows={3}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Follow Up"
                    value={selectedIncident.followUp}
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
                    value={selectedIncident.reportedBy}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Recommendations"
                    value={selectedIncident.recommendations}
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
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
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
          data={getFilteredIncidents()}
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

export default ManagerIncidentReports; 