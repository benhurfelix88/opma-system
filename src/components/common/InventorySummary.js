import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';

const InventorySummary = ({ items, type }) => {
  const totalItems = items ? items.length : 0;
  const inStockItems = items ? items.filter(item => item.status === 'In Stock').length : 0;
  const lowStockItems = items ? items.filter(item => item.status === 'Low Stock').length : 0;
  const outOfStockItems = items ? items.filter(item => item.status === 'Out of Stock').length : 0;

  return (
    <Card sx={{ minWidth: 275, ml: 2 }}>
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          {type} Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Total Items
            </Typography>
            <Typography variant="h5" component="div">
              {totalItems}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              In Stock
            </Typography>
            <Chip 
              label={inStockItems} 
              color="success" 
              size="small" 
              sx={{ fontWeight: 'bold' }}
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Low Stock
            </Typography>
            <Chip 
              label={lowStockItems} 
              color="warning" 
              size="small" 
              sx={{ fontWeight: 'bold' }}
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Out of Stock
            </Typography>
            <Chip 
              label={outOfStockItems} 
              color="error" 
              size="small" 
              sx={{ fontWeight: 'bold' }}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default InventorySummary; 