import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  DateRange as DateRangeIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Visibility as ViewFullDataIcon,
  ArrowRight as ArrowRightIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const getWeekNumber = (date) => {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const dayOfMonth = date.getDate();
  return Math.ceil((firstDayOfWeek + dayOfMonth) / 7);
};

const getWeekDateRange = (date) => {
  const weekNumber = getWeekNumber(date);
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const startDay = (weekNumber - 1) * 7 - firstDayOfWeek + 1;
  const startDate = new Date(date.getFullYear(), date.getMonth(), startDay);
  const endDay = startDay + 6;
  const endDate = new Date(date.getFullYear(), date.getMonth(), endDay, 23, 59, 59);
  return { startDate, endDate, weekNumber };
};

const ReportGenerator = ({
  open,
  onClose,
  data,
  title,
  columns,
  reportType,
  onGenerateReport
}) => {
  const [dateRange, setDateRange] = useState('overall');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [fullDataDialogOpen, setFullDataDialogOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState('');
  const reportRef = useRef(null);

  const handleNavigateDate = (direction) => {
    const newDate = new Date(selectedDate);

    switch (dateRange) {
      case 'daily':
        // Navigate by day
        newDate.setDate(newDate.getDate() + direction);
        break;
      case 'weekly':
        // Navigate by week
        newDate.setDate(newDate.getDate() + (direction * 7));
        break;
      case 'monthly':
        // Navigate by month
        newDate.setMonth(newDate.getMonth() + direction);
        break;
      default:
        return;
    }

    setSelectedDate(newDate);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const truncateText = (text, wordLimit = 5) => {
    if (!text) return 'No description';
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  const handleDateRangeChange = useCallback((value) => {
    setDateRange(value);

    let start, end;

    switch (value) {
      case 'daily':
        // Use selected date for daily filtering
        start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        end = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
        break;
      case 'weekly':
        // Use selected date to determine the week
        const weekRange = getWeekDateRange(selectedDate);
        start = weekRange.startDate;
        end = weekRange.endDate;
        break;
      case 'monthly':
        // Use selected date's month/year for monthly filtering
        start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'custom':
        // Keep custom dates as-is
        return;
      default:
        start = null;
        end = null;
    }

    if (value !== 'custom') {
      setStartDate(start);
      setEndDate(end);
    }
  }, [selectedDate]);

  // Recalculate date range when selected date changes
  useEffect(() => {
    if (dateRange !== 'overall' && dateRange !== 'custom') {
      handleDateRangeChange(dateRange);
    }
  }, [selectedDate, dateRange, handleDateRangeChange]);

  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    
    if (dateRange === 'overall') return data;
    
    const start = dateRange === 'custom' ? customStartDate : startDate;
    const end = dateRange === 'custom' ? customEndDate : endDate;
    
    if (!start && !end) return data;
    
    return data.filter(item => {
      let itemDate;
      
      // Try different date fields based on report type
      if (reportType === 'parts') {
        itemDate = item.lastUpdated || item.updated_at || item.created_at;
      } else if (reportType === 'incidents') {
        itemDate = item.dateTime || item.date_reported || item.created_at;
      } else if (reportType === 'maintenance') {
        itemDate = item.date || item.date_performed || item.created_at;
      } else if (reportType === 'customers') {
        itemDate = item.entry_date || item.entry_timestamp || item.created_at;
      } else {
        itemDate = item.created_at || item.date;
      }
      
      if (!itemDate) return true;
      
      const itemDateTime = new Date(itemDate);
      
      if (start && itemDateTime < start) return false;
      if (end && itemDateTime > end) return false;
      
      return true;
    });
  };

  const handlePrint = () => {
    const printContent = reportRef.current;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
              color: #333;
            }
            h1 { 
              color: #1976d2; 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #1976d2;
              padding-bottom: 10px;
            }
            h2 { 
              color: #333; 
              margin-top: 20px; 
              margin-bottom: 10px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left; 
              vertical-align: top;
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold; 
              color: #333;
              text-align: center;
            }
            tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
            .summary-section {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
              border-left: 4px solid #1976d2;
            }
            .summary-item {
              display: inline-block;
              margin: 5px 15px 5px 0;
              font-weight: bold;
            }
            .date-info {
              text-align: center;
              margin-bottom: 20px;
              font-style: italic;
              color: #666;
            }
            @media print {
              body { margin: 10px; }
              table { page-break-inside: avoid; }
              h1 { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    const filteredData = getFilteredData();
    const csvContent = generateCSV(filteredData);
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_report.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSV = (data) => {
    if (data.length === 0) return 'No data available';
    
    const headers = columns.map(col => col.header).join(',');
    const rows = data.map(item => 
      columns.map(col => {
        let value = item[col.field] || '';
        
        // Format date fields for CSV export
        if (col.field === 'entryDate' || col.field === 'entry_date' || col.field === 'date' || col.field === 'date_reported') {
          if (value && typeof value === 'string' && value.includes('T')) {
            value = value.split('T')[0]; // Extract just the date part
          } else if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          }
        }
        
        // Format updated_at field to show date and time with AM/PM
        if (col.field === 'updated_at') {
          if (value && typeof value === 'string') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              value = date.toLocaleString('en-US', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              });
            }
          } else if (value instanceof Date) {
            value = value.toLocaleString('en-US', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit',
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });
          }
        }
        
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ).join('\n');
    
    return headers + '\n' + rows;
  };

  const getFilteredDataStats = () => {
    const filteredData = getFilteredData();
    let dateRangeDisplay;

    if (dateRange === 'custom') {
      dateRangeDisplay = `${customStartDate?.toLocaleDateString()} - ${customEndDate?.toLocaleDateString()}`;
    } else if (dateRange === 'overall') {
      dateRangeDisplay = 'All Time';
    } else if (dateRange === 'daily') {
      dateRangeDisplay = `${selectedDate.toLocaleDateString()} (Daily)`;
    } else if (dateRange === 'weekly') {
      const weekRange = getWeekDateRange(selectedDate);
      const startDate = weekRange.startDate.toLocaleDateString();
      const endDate = weekRange.endDate.toLocaleDateString();
      dateRangeDisplay = `Week ${weekRange.weekNumber} (${startDate} to ${endDate})`;
    } else if (dateRange === 'monthly') {
      const monthName = months[selectedDate.getMonth()];
      dateRangeDisplay = `${monthName} ${selectedDate.getFullYear()} (Monthly)`;
    }

    return {
      total: filteredData.length,
      dateRange: dateRangeDisplay
    };
  };

  const filteredData = getFilteredData();
  const stats = getFilteredDataStats();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Export - {title}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pb: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DateRangeIcon />
              Report Period
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Time Range</InputLabel>
                  <Select
                    value={dateRange}
                    onChange={(e) => handleDateRangeChange(e.target.value)}
                  >
                    <MenuItem value="overall">Overall</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="custom">Custom Range</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {dateRange !== 'overall' && dateRange !== 'custom' && (
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                      onClick={() => handleNavigateDate(-1)}
                      size="small"
                      sx={{ border: '1px solid #ddd' }}
                    >
                      <NavigateBeforeIcon />
                    </IconButton>
                    <DatePicker
                      label={dateRange === 'daily' ? 'Select Date' : dateRange === 'weekly' ? 'Select Date (for Week)' : 'Select Date (for Month)'}
                      value={selectedDate}
                      onChange={setSelectedDate}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                      views={dateRange === 'daily' ? ['day', 'month', 'year'] : dateRange === 'weekly' ? ['day', 'month', 'year'] : ['month', 'year']}
                    />
                    <IconButton
                      onClick={() => handleNavigateDate(1)}
                      size="small"
                      sx={{ border: '1px solid #ddd' }}
                    >
                      <NavigateNextIcon />
                    </IconButton>
                  </Box>
                </Grid>
              )}

              {dateRange === 'custom' && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <DatePicker
                      label="Start Date"
                      value={customStartDate}
                      onChange={setCustomStartDate}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <DatePicker
                      label="End Date"
                      value={customEndDate}
                      onChange={setCustomEndDate}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Report Summary</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Total Records
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {stats.total}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Date Range
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {stats.dateRange}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
                    <Tooltip title="Download CSV">
                      <IconButton
                        variant="outlined"
                        onClick={handleDownload}
                        disabled={filteredData.length === 0}
                        sx={{ 
                          border: '1px solid rgba(0, 0, 0, 0.23)',
                          '&:hover': {
                            border: '1px solid rgba(0, 0, 0, 0.87)',
                            backgroundColor: 'action.hover'
                          },
                          '&.Mui-disabled': {
                            border: '1px solid rgba(0, 0, 0, 0.12)',
                            opacity: 0.5
                          }
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Full Data">
                      <Button
                        variant="outlined"
                        startIcon={<ViewFullDataIcon />}
                        onClick={() => setFullDataDialogOpen(true)}
                      >
                        View
                      </Button>
                    </Tooltip>
                    <Tooltip title="Print Report">
                      <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={handlePrint}
                        disabled={filteredData.length === 0}
                      >
                        Print
                      </Button>
                    </Tooltip>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>Preview</Typography>
            <Box 
              ref={reportRef}
              sx={{ 
                maxHeight: 400, 
                overflow: 'auto',
                border: '1px solid #ddd',
                borderRadius: 1,
                bgcolor: 'white'
              }}
            >
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {columns.map((column, index) => (
                        <TableCell 
                          key={index}
                          align="center"
                          sx={{ 
                            fontWeight: 'bold', 
                            bgcolor: 'grey.100',
                            position: 'sticky',
                            top: 0,
                            zIndex: 1
                          }}
                        >
                          {column.header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No data available for the selected period
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.slice(0, 8).map((item, index) => (
                        <TableRow key={index} hover>
                          {columns.map((column, colIndex) => (
                            <TableCell key={colIndex} align="center">
                              {column.render ? 
                                column.render(item) : 
                                (column.field === 'description' || column.header?.toLowerCase().includes('description')) ?
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {truncateText(item[column.field] || 'N/A')}
                                    </Typography>
                                    {item[column.field] && item[column.field].split(' ').length > 5 && (
                                      <IconButton 
                                        size="small" 
                                        onClick={() => {
                                          setSelectedDescription(item[column.field] || 'No description available');
                                          setDescriptionDialogOpen(true);
                                        }}
                                        sx={{ 
                                          p: 0.5,
                                          '&:hover': {
                                            backgroundColor: 'action.hover'
                                          }
                                        }}
                                      >
                                        <ArrowRightIcon fontSize="small" color="primary" />
                                      </IconButton>
                                    )}
                                  </Box>
                                  :
                                  // Format date fields for table display
                                  (column.field === 'entryDate' || column.field === 'entry_date' || column.field === 'date' || column.field === 'date_reported') ?
                                    (() => {
                                      let value = item[column.field] || '';
                                      if (value && typeof value === 'string' && value.includes('T')) {
                                        value = value.split('T')[0];
                                      } else if (value instanceof Date) {
                                        value = value.toISOString().split('T')[0];
                                      }
                                      return value || 'N/A';
                                    })() :
                                  // Format updated_at field to show date and time with AM/PM
                                  (column.field === 'updated_at') ?
                                    (() => {
                                      let value = item[column.field] || '';
                                      if (value && typeof value === 'string') {
                                        const date = new Date(value);
                                        if (!isNaN(date.getTime())) {
                                          value = date.toLocaleString('en-US', { 
                                            year: 'numeric', 
                                            month: '2-digit', 
                                            day: '2-digit',
                                            hour: 'numeric', 
                                            minute: '2-digit',
                                            hour12: true 
                                          });
                                        }
                                      } else if (value instanceof Date) {
                                        value = value.toLocaleString('en-US', { 
                                          year: 'numeric', 
                                          month: '2-digit', 
                                          day: '2-digit',
                                          hour: 'numeric', 
                                          minute: '2-digit',
                                          hour12: true 
                                        });
                                      }
                                      return value || 'N/A';
                                    })() :
                                  item[column.field] || 'N/A'
                              }
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredData.length > 8 && (
                <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing first 8 of {filteredData.length} records
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Full Data Dialog */}
      <Dialog 
        open={fullDataDialogOpen} 
        onClose={() => setFullDataDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Full Data View - {title}</Typography>
            <IconButton onClick={() => setFullDataDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Total Records: {filteredData.length}
            </Typography>
          </Box>

          <TableContainer 
            component={Paper} 
            sx={{ 
              maxHeight: '60vh',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#c1c1c1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: '#a8a8a8',
              }
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map((column, index) => (
                    <TableCell 
                      key={index}
                      sx={{ 
                        fontWeight: 'bold', 
                        bgcolor: 'grey.100',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      {column.header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                      <Typography color="text.secondary">
                        No data available
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <TableRow key={index} hover>
                      {columns.map((column, colIndex) => (
                        <TableCell key={colIndex}>
                          {column.render ? 
                            column.render(item) : 
                            (column.field === 'description' || column.header?.toLowerCase().includes('description')) ?
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {truncateText(item[column.field] || 'N/A', 10)}
                                </Typography>
                                {item[column.field] && item[column.field].split(' ').length > 10 && (
                                  <IconButton 
                                    size="small" 
                                    onClick={() => {
                                      setSelectedDescription(item[column.field] || 'No description available');
                                      setDescriptionDialogOpen(true);
                                    }}
                                    sx={{ 
                                      p: 0.5,
                                      '&:hover': {
                                        backgroundColor: 'action.hover'
                                      }
                                    }}
                                  >
                                    <ArrowRightIcon fontSize="small" color="primary" />
                                  </IconButton>
                                )}
                              </Box>
                              :
                              // Format date fields for table display
                              (column.field === 'entryDate' || column.field === 'entry_date' || column.field === 'date' || column.field === 'date_reported') ?
                                (() => {
                                  let value = item[column.field] || '';
                                  if (value && typeof value === 'string' && value.includes('T')) {
                                    value = value.split('T')[0];
                                  } else if (value instanceof Date) {
                                    value = value.toISOString().split('T')[0];
                                  }
                                  return value || 'N/A';
                                })() :
                              // Format updated_at field to show date and time with AM/PM
                              (column.field === 'updated_at') ?
                                (() => {
                                  let value = item[column.field] || '';
                                  if (value && typeof value === 'string') {
                                    const date = new Date(value);
                                    if (!isNaN(date.getTime())) {
                                      value = date.toLocaleString('en-US', { 
                                        year: 'numeric', 
                                        month: '2-digit', 
                                        day: '2-digit',
                                        hour: 'numeric', 
                                        minute: '2-digit',
                                        hour12: true 
                                      });
                                    }
                                  } else if (value instanceof Date) {
                                    value = value.toLocaleString('en-US', { 
                                      year: 'numeric', 
                                      month: '2-digit', 
                                      day: '2-digit',
                                      hour: 'numeric', 
                                      minute: '2-digit',
                                      hour12: true 
                                    });
                                  }
                                  return value || 'N/A';
                                })() :
                              item[column.field] || 'N/A'
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFullDataDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Description Dialog */}
      <Dialog 
        open={descriptionDialogOpen} 
        onClose={() => setDescriptionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Full Description</Typography>
            <IconButton onClick={() => setDescriptionDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {selectedDescription}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDescriptionDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ReportGenerator;
