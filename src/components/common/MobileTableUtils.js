// Mobile-responsive table utilities
import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Button,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

// Generic mobile card renderer
export const GenericMobileCard = ({ 
  data, 
  fields, 
  actions, 
  onAction 
}) => {
  const theme = useTheme();
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' }, fontWeight: 600 }}>
            {data[fields.primary] || 'N/A'}
          </Typography>
          {fields.secondary && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              {data[fields.secondary]}
            </Typography>
          )}
        </Box>
        {fields.status && (
          <Chip 
            label={data[fields.status]} 
            size="small" 
            color={getStatusColor(data[fields.status])}
            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
          />
        )}
      </Box>
      
      <Stack spacing={1} sx={{ mb: 2 }}>
        {fields.displayFields?.map((field, index) => (
          <Box key={index}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              {field.label}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              {field.render ? field.render(data[field.key], data) : data[field.key] || 'N/A'}
            </Typography>
          </Box>
        ))}
      </Stack>
      
      {actions && actions.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            {actions.map((action, index) => (
              <Tooltip key={index} title={action.tooltip}>
                <IconButton 
                  size="small" 
                  onClick={() => onAction(action.action, data)}
                  color={action.color || 'primary'}
                >
                  {action.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

// Helper function to get status color
const getStatusColor = (status) => {
  if (!status) return 'default';
  
  const statusLower = status.toLowerCase();
  if (statusLower.includes('success') || statusLower.includes('completed') || statusLower.includes('approved')) {
    return 'success';
  }
  if (statusLower.includes('warning') || statusLower.includes('pending') || statusLower.includes('in progress')) {
    return 'warning';
  }
  if (statusLower.includes('error') || statusLower.includes('failed') || statusLower.includes('rejected')) {
    return 'error';
  }
  if (statusLower.includes('info') || statusLower.includes('active')) {
    return 'info';
  }
  return 'default';
};

// Mobile responsive table wrapper
export const MobileResponsiveTableWrapper = ({ 
  columns, 
  data, 
  renderMobileCard, 
  sx = {},
  emptyMessage = "No data available"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile && renderMobileCard) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ...sx }}>
        {data.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          data.map((row, index) => (
            <Card key={index} sx={{ width: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                {renderMobileCard(row, index)}
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ ...sx }}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column, index) => (
              <TableCell 
                key={index} 
                align={column.align || 'left'}
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  py: { xs: 1, sm: 1.5 }
                }}
              >
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column, colIndex) => (
                  <TableCell 
                    key={colIndex} 
                    align={column.align || 'left'}
                    sx={{ 
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      py: { xs: 1, sm: 1.5 }
                    }}
                  >
                    {column.render ? column.render(row[column.field], row, index) : row[column.field]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MobileResponsiveTableWrapper;
