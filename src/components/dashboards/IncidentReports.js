import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  DeleteForever as ClearIcon,
} from '@mui/icons-material';
import { keyframes } from '@mui/system';
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

const IncidentReports = () => {
  const [incidents, setIncidents] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    severity: 'all',
    type: 'all',
    ride: '',
  });
  const [openClearDialog, setOpenClearDialog] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const allIncidents = await incidentsAPI.getAll();
      // Map database fields to component fields
      const mappedIncidents = allIncidents.map(incident => ({
        ...incident,
        id: incident.id,
        timestamp: incident.date_reported && incident.time_reported 
          ? `${incident.date_reported}T${incident.time_reported}` 
          : (incident.date_reported || incident.created_at || new Date().toISOString()),
        ride: incident.ride_name || incident.ride || '',
        type: incident.incident_type || incident.type || 'accident',
        description: incident.description || '',
        severity: incident.severity || 'low',
        status: incident.status || 'pending',
      }));
      setIncidents(mappedIncidents);
    } catch (error) {
      console.error('Error loading incidents:', error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(0);
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'accident':
        return 'error';
      case 'mechanical':
        return 'warning';
      case 'safety':
        return 'info';
      default:
        return 'default';
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    return (
      (filters.severity === 'all' || incident.severity === filters.severity) &&
      (filters.type === 'all' || incident.type === filters.type) &&
      (filters.ride === '' || incident.ride.toLowerCase().includes(filters.ride.toLowerCase()))
    );
  });

  const displayedIncidents = filteredIncidents
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleClearAllData = async () => {
    try {
      // Delete all incidents from database
      const allIncidents = await incidentsAPI.getAll();
      for (const incident of allIncidents) {
        await incidentsAPI.delete(incident.id);
      }
      setIncidents([]);
      setOpenClearDialog(false);
      alert('All incidents cleared successfully');
    } catch (error) {
      console.error('Error clearing incidents:', error);
      alert('Failed to clear incidents');
    }
  };

  return (
    <Box sx={{ animation: `${fadeIn} 0.5s ease-out` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Incident Reports
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<ClearIcon />}
          onClick={() => setOpenClearDialog(true)}
          disabled={incidents.length === 0}
        >
          Clear All Data
        </Button>
      </Box>

      <Card sx={{ mb: 4, bgcolor: 'background.paper' }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={filters.severity}
                label="Severity"
                onChange={(e) => handleFilterChange('severity', e.target.value)}
              >
                <MenuItem value="all">All Severities</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                label="Type"
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="accident">Accident</MenuItem>
                <MenuItem value="mechanical">Mechanical</MenuItem>
                <MenuItem value="safety">Safety</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Search Ride"
              variant="outlined"
              value={filters.ride}
              onChange={(e) => handleFilterChange('ride', e.target.value)}
              sx={{ minWidth: 200 }}
            />
          </Box>

          <TableContainer>
            <Table sx={{ minWidth: 650 }} aria-label="incident reports table">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Ride</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedIncidents.map((incident) => (
                  <TableRow
                    key={incident.id}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      '&:hover': { bgcolor: 'action.hover' },
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <TableCell>{new Date(incident.timestamp).toLocaleDateString()}</TableCell>
                    <TableCell>{incident.ride}</TableCell>
                    <TableCell>
                      <Chip 
                        label={incident.type} 
                        color={getTypeColor(incident.type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={incident.severity} 
                        color={getSeverityColor(incident.severity)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {incident.description}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={incident.status || 'Pending'} 
                        color={incident.status === 'resolved' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          sx={{
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              color: 'primary.main',
                              transform: 'scale(1.1)',
                            },
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredIncidents.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>

      {/* Clear All Data Dialog */}
      <Dialog
        open={openClearDialog}
        onClose={() => setOpenClearDialog(false)}
      >
        <DialogTitle>Clear All Data</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Are you sure you want to clear all incident report data? This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClearDialog(false)}>Cancel</Button>
          <Button onClick={handleClearAllData} color="error" variant="contained">
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncidentReports; 