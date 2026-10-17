import React, { useState, useEffect } from 'react';
import {
  Box,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { maintenanceAPI } from '../../services/api';

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

const MaintenanceReports = () => {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    ride: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await maintenanceAPI.getAll();
        // Normalize field names if needed
        const mapped = (rows || []).map(r => ({
          ...r,
          ride: r.ride_name || r.ride || '',
          type: r.maintenance_type || r.type || '',
          status: r.status || '',
          date: r.date_performed || r.date || '',
          description: r.description || '',
          completedBy: r.performed_by || r.completed_by || '',
        }));
        setMaintenanceRecords(mapped);
      } catch (e) {
        console.error('Error loading maintenance records:', e);
      }
    };
    load();
  }, []);

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

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in progress':
      case 'in_progress':
        return 'warning';
      case 'scheduled':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'emergency':
        return 'error';
      case 'preventive':
        return 'warning';
      case 'routine':
        return 'info';
      default:
        return 'default';
    }
  };

  const filteredRecords = maintenanceRecords.filter(record => (
    (filters.status === 'all' || (record.status || '').toLowerCase() === filters.status) &&
    (filters.type === 'all' || (record.type || '').toLowerCase() === filters.type) &&
    (filters.ride === '' || (record.ride || '').toLowerCase().includes(filters.ride.toLowerCase()))
  ));

  const displayedRecords = filteredRecords
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ animation: `${fadeIn} 0.5s ease-out` }}>
      <Card sx={{ mb: 4, bgcolor: 'background.paper' }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="in progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
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
                <MenuItem value="routine">Routine</MenuItem>
                <MenuItem value="preventive">Preventive</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
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
            <Table sx={{ minWidth: 650 }} aria-label="maintenance reports table">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Ride</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Completed By</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedRecords.map((record) => (
                  <TableRow
                    key={record.id}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      '&:hover': { bgcolor: 'action.hover' },
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <TableCell>{record.date ? new Date(record.date).toLocaleDateString() : ''}</TableCell>
                    <TableCell>{record.ride}</TableCell>
                    <TableCell>
                      <Chip 
                        label={record.type} 
                        color={getTypeColor(record.type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={record.status} 
                        color={getStatusColor(record.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {record.description}
                    </TableCell>
                    <TableCell>{record.completedBy}</TableCell>
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
            count={filteredRecords.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default MaintenanceReports; 