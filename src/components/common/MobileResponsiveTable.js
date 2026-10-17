// Mobile-responsive table component
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
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const MobileResponsiveTable = ({ 
  columns, 
  data, 
  renderMobileCard, 
  sx = {} 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile && renderMobileCard) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ...sx }}>
        {data.map((row, index) => (
          <Card key={index} sx={{ width: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              {renderMobileCard(row, index)}
            </CardContent>
          </Card>
        ))}
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
          {data.map((row, index) => (
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
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Mobile card renderer for user management
export const UserManagementMobileCard = ({ user, onView, onEdit, onDelete, isFirstITAdmin, users }) => {
  const theme = useTheme();
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' }, fontWeight: 600 }}>
            {user.fullName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            @{user.username}
          </Typography>
        </Box>
        <Chip 
          label={user.role} 
          size="small" 
          color="primary" 
          sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
        />
      </Box>
      
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            Email
          </Typography>
          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            {user.email}
          </Typography>
        </Box>
        
        {user.assignedRide && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              Assigned Ride
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip 
                label={user.assignedRide.name}
                color="primary"
                size="small"
                variant="outlined"
                sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
              />
            </Box>
          </Box>
        )}
        
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            Last Updated
          </Typography>
          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            {user.lastUpdated ? new Date(user.lastUpdated).toLocaleDateString() : 'N/A'}
          </Typography>
        </Box>
      </Stack>
      
      <Divider sx={{ my: 1 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Tooltip title="View">
          <IconButton size="small" onClick={() => onView(user)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(user)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {user.role === 'IT Admin' ? (
          isFirstITAdmin(user) ? (
            users.length === 1 && (
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => onDelete(user.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )
          ) : (
            <Tooltip title="Delete">
              <IconButton size="small" onClick={() => onDelete(user.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )
        ) : (
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(user.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default MobileResponsiveTable;
