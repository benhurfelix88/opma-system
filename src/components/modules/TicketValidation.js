import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { ConfirmationNumber as TicketIcon, Delete as DeleteIcon } from '@mui/icons-material';

const TicketValidation = () => {
  const [validations, setValidations] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [validationData, setValidationData] = useState({
    ticketNumber: '',
    ride: '',
    status: 'valid',
    notes: '',
  });

  useEffect(() => {
    // Load validations from localStorage
    const storedValidations = localStorage.getItem('ticketValidations');
    if (storedValidations) {
      setValidations(JSON.parse(storedValidations));
    }
  }, []);

  const handleValidate = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setValidationData({
      ticketNumber: '',
      ride: '',
      status: 'valid',
      notes: '',
    });
  };

  const handleSubmit = () => {
    if (!validationData.ticketNumber || !validationData.ride) {
      return;
    }

    const newValidation = {
      ...validationData,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };

    const updatedValidations = [newValidation, ...validations];
    setValidations(updatedValidations);
    localStorage.setItem('ticketValidations', JSON.stringify(updatedValidations));
    handleCloseDialog();
  };

  const handleDelete = (id) => {
    const updatedValidations = validations.filter((validation) => validation.id !== id);
    setValidations(updatedValidations);
    localStorage.setItem('ticketValidations', JSON.stringify(updatedValidations));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Ticket Validation
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Validate Ticket
            </Typography>
            <Button
              variant="contained"
              startIcon={<TicketIcon />}
              onClick={handleValidate}
              fullWidth
            >
              Validate Ticket
            </Button>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Validations
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket Number</TableCell>
                    <TableCell>Ride</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validations.map((validation) => (
                    <TableRow key={validation.id}>
                      <TableCell>{validation.ticketNumber}</TableCell>
                      <TableCell>{validation.ride}</TableCell>
                      <TableCell>
                        <Chip
                          label={validation.status}
                          color={validation.status === 'valid' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{new Date(validation.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleDelete(validation.id)}>
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Validate Ticket</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Ticket Number"
            value={validationData.ticketNumber}
            onChange={(e) =>
              setValidationData({ ...validationData, ticketNumber: e.target.value })
            }
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Ride"
            value={validationData.ride}
            onChange={(e) =>
              setValidationData({ ...validationData, ride: e.target.value })
            }
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={validationData.status}
              onChange={(e) =>
                setValidationData({ ...validationData, status: e.target.value })
              }
              label="Status"
            >
              <MenuItem value="valid">Valid</MenuItem>
              <MenuItem value="invalid">Invalid</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Notes"
            value={validationData.notes}
            onChange={(e) =>
              setValidationData({ ...validationData, notes: e.target.value })
            }
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TicketValidation; 