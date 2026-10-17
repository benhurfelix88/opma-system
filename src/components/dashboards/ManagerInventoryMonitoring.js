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
  Grid,
} from '@mui/material';
import DashboardLayout from '../layout/DashboardLayout';

const ManagerInventoryMonitoring = () => {
  const [inventory, setInventory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    minimumStock: 0,
    location: '',
    status: '',
    lastUpdated: new Date().toISOString(),
  });

  useEffect(() => {
    // Load inventory from localStorage
    const storedInventory = localStorage.getItem('inventory');
    if (storedInventory) {
      setInventory(JSON.parse(storedInventory));
    }
  }, []);

  const handleOpenDialog = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        ...item,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      setFormData({
        name: '',
        category: '',
        quantity: 0,
        minimumStock: 0,
        location: '',
        status: '',
        lastUpdated: new Date().toISOString(),
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
  };

  const handleSubmit = () => {
    const newItem = {
      ...formData,
      id: selectedItem ? selectedItem.id : Date.now(),
    };

    let updatedInventory;
    if (selectedItem) {
      updatedInventory = inventory.map((item) =>
        item.id === selectedItem.id ? newItem : item
      );
    } else {
      updatedInventory = [...inventory, newItem];
    }

    setInventory(updatedInventory);
    localStorage.setItem('inventory', JSON.stringify(updatedInventory));
    handleCloseDialog();
  };

  const getStatusColor = (quantity, minimumStock) => {
    if (quantity <= 0) return 'error';
    if (quantity <= minimumStock) return 'warning';
    return 'success';
  };

  const handleQuantityChange = (itemId, change) => {
    const updatedInventory = inventory.map((item) => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, item.quantity + change);
        return {
          ...item,
          quantity: newQuantity,
          lastUpdated: new Date().toISOString(),
        };
      }
      return item;
    });

    setInventory(updatedInventory);
    localStorage.setItem('inventory', JSON.stringify(updatedInventory));
  };

  return (
    <DashboardLayout title="Inventory Monitoring">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5">Inventory Management</Typography>
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            Add New Item
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Minimum Stock</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.minimumStock}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        item.quantity <= 0
                          ? 'Out of Stock'
                          : item.quantity <= item.minimumStock
                          ? 'Low Stock'
                          : 'In Stock'
                      }
                      color={getStatusColor(item.quantity, item.minimumStock)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(item.lastUpdated).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleOpenDialog(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="success"
                        onClick={() => handleQuantityChange(item.id, 1)}
                      >
                        +1
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => handleQuantityChange(item.id, -1)}
                      >
                        -1
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Item Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    label="Category"
                  >
                    <MenuItem value="Spare Parts">Spare Parts</MenuItem>
                    <MenuItem value="Maintenance Tools">Maintenance Tools</MenuItem>
                    <MenuItem value="Safety Equipment">Safety Equipment</MenuItem>
                    <MenuItem value="Consumables">Consumables</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Minimum Stock"
                  type="number"
                  value={formData.minimumStock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minimumStock: parseInt(e.target.value),
                    })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {selectedItem ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default ManagerInventoryMonitoring; 