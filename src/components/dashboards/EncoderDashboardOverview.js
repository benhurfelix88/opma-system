import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  LinearProgress,
  Button,
  useTheme,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Assessment as RideCounterIcon,
  Build as BuildIcon,
  Visibility as VisibilityIcon,
  Warning as IncidentIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import {
  sparePartsAPI,
  ridesAPI,
  maintenanceAPI,
  partDeploymentsAPI,
  partRemovalsAPI,
  incidentsAPI,
} from '../../services/api';
import rideEntriesAPI from '../../services/rideEntriesAPI';
import RideEntryCountsList from './RideEntryCountsList';
import {
  buildRecentManualEntries,
  countManualEntriesOnDate,
  getCustomerCount,
  getEntrySortTimestamp,
  getLast7DayStrings,
  getLocalDateString,
  isManualEntry,
  isEntryOnDate,
  normalizeRideEntriesResponse,
} from '../../utils/rideEntryHelpers';

const EncoderDashboardOverview = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [overviewData, setOverviewData] = useState({
    partsInventory: {
      stockLevels: [],
      byCategory: [],
      byStockStatus: [],
      byDate: [],
      totalItems: 0,
      lowStockCount: 0,
      inStockCount: 0,
      outOfStockCount: 0,
      currentLocation: '',
      assemblyDate: '',
      disassemblyDate: '',
    },
    rideCounters: {
      byStatus: [],
      byDate: [],
      todayCount: 0,
      totalRides: 0,
      operationalRides: 0,
      malfunctionCount: 0,
      maintenanceCount: 0,
      totalCustomers: 0,
      recentRides: [],
      recentManualEntries: [],
    },
    maintenance: {
      byStatus: [],
      byDate: [],
      nextScheduledMaintenance: [],
    },
    incidents: {
      byStatus: [],
      recentIncidents: [],
      totalIncidents: 0,
      resolvedCount: 0,
      notResolvedCount: 0,
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch data from APIs
      const [sparePartsData, ridesData, maintenanceData, rideEntriesData, deploymentsData, removalsData, incidentsData] = await Promise.allSettled([
        sparePartsAPI.getAll().catch(() => []),
        ridesAPI.getAll().catch(() => []),
        maintenanceAPI.getAll().catch(() => []),
        rideEntriesAPI.getAll().catch(() => []),
        partDeploymentsAPI.getAll().catch(() => []),
        partRemovalsAPI.getAll().catch(() => []),
        incidentsAPI.getAll().catch(() => [])
      ]);

      // Extract data from Promise.allSettled results
      const spareParts = sparePartsData.status === 'fulfilled' ? sparePartsData.value : [];
      const rides = ridesData.status === 'fulfilled' ? ridesData.value : [];
      const rideEntries = normalizeRideEntriesResponse(
        rideEntriesData.status === 'fulfilled' ? rideEntriesData.value : []
      );
      const maintenanceRecords = maintenanceData.status === 'fulfilled' ? maintenanceData.value : [];
      const deployments = deploymentsData.status === 'fulfilled' ? deploymentsData.value : [];
      const removals = removalsData.status === 'fulfilled' ? removalsData.value : [];
      const incidents = incidentsData.status === 'fulfilled' ? incidentsData.value : [];

      // Map spare parts from database
      const mappedSpareParts = spareParts.map(part => ({
        ...part,
        id: part.id,
        name: part.part_name || part.name,
        quantity: part.quantity || 0,
        price: part.cost || part.price || 0,
        status: part.status || 'In Stock',
        category: part.category || '',
        lastUpdated: part.updated_at || part.created_at || new Date().toISOString(),
        threshold: 10, // Default threshold
      }));

      // Map maintenance records from database
      const mappedMaintenance = maintenanceRecords.map(record => ({
        ...record,
        id: record.id,
        status: record.status || 'Scheduled',
        datePerformed: record.date_performed || record.date || new Date().toISOString(),
        createdAt: record.created_at || new Date().toISOString(),
        nextMaintenance: record.next_maintenance_date || record.next_maintenance || record.nextMaintenance || record.scheduled_date || record.maintenance_date || record.next_date || null,
        ride: record.ride_name || record.ride || record.rideId || 'Unknown Ride',
      }));

      const getLast7Days = getLast7DayStrings;

      // Process Parts Inventory Data
      const partsByCategory = mappedSpareParts.reduce((acc, part) => {
        acc[part.category] = (acc[part.category] || 0) + 1;
        return acc;
      }, {});
      
      const partsByStockStatus = mappedSpareParts.reduce((acc, part) => {
        const status = part.quantity > 0 ? 'In Stock' : 'Out of Stock';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      const partsByDate = getLast7Days().map(date => ({
        date,
        count: mappedSpareParts.filter(part => part.lastUpdated?.split('T')[0] === date).length
      }));
      
      const lowStockParts = mappedSpareParts
        .filter(part => part.quantity <= (part.threshold || 10) && part.quantity > 0)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 5);


      // Process Customers' Count (per ride) Data using ride entries
      const ridesByStatus = rides.reduce((acc, ride) => {
        const status = ride.status || 'operational';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Calculate ride entries by date (last 7 days)
      const manualRideEntries = (Array.isArray(rideEntries) ? rideEntries : []).filter(isManualEntry);

      const ridesByDate = getLast7Days().map(date => ({
        date,
        count: manualRideEntries.filter((entry) => isEntryOnDate(entry, date)).length,
      }));

      const today = getLocalDateString();
      const todayRideCount = countManualEntriesOnDate(manualRideEntries, today);

      const totalCustomers = manualRideEntries.reduce((sum, entry) => sum + getCustomerCount(entry), 0);
      const recentManualEntries = buildRecentManualEntries(manualRideEntries, 3);

      // Calculate total and operational rides
      const totalRides = rides.length;
      const operationalRides = rides.filter(ride => ride.status === 'operational').length;
      const malfunctionCount = rides.filter(ride => 
        ride.status === 'malfunction' || 
        ride.status === 'malfunctioning' || 
        ride.status === 'out_of_order' ||
        ride.status === 'broken'
      ).length;
      const maintenanceCount = rides.filter(ride => ride.status === 'maintenance' || ride.status === 'under_maintenance').length;

      const ridesWithEntries = manualRideEntries.reduce((acc, entry) => {
        const rideName = entry.ride_name || entry.rideName || 'Unknown Ride';
        const sortTime = getEntrySortTimestamp(entry);
        if (!acc[rideName]) {
          acc[rideName] = {
            rideName,
            totalCustomers: 0,
            lastEntryTime: sortTime,
            entries: [],
          };
        }
        acc[rideName].totalCustomers += getCustomerCount(entry);
        acc[rideName].entries.push(entry);
        if (sortTime > acc[rideName].lastEntryTime) {
          acc[rideName].lastEntryTime = sortTime;
        }
        return acc;
      }, {});

      const recentRides = Object.values(ridesWithEntries).sort(
        (a, b) => b.lastEntryTime - a.lastEntryTime
      );

      // Process Maintenance Data
      const maintenanceByStatus = mappedMaintenance.reduce((acc, record) => {
        const status = record.status || 'Scheduled';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const maintenanceByDate = getLast7Days().map(date => ({
        date,
        count: mappedMaintenance.filter(record => record.datePerformed?.split('T')[0] === date).length
      }));

      // Get next scheduled maintenance (match maintenance reports: next_maintenance_date)
      const nextScheduledMaintenance = mappedMaintenance
        .filter(record => {
          if (!record.nextMaintenance) return false;
          const status = (record.status || '').toLowerCase();
          return status !== 'completed';
        })
        .sort((a, b) => new Date(a.nextMaintenance) - new Date(b.nextMaintenance))
        .slice(0, 2);

      // Process Incident Data
      const mappedIncidents = incidents.map(incident => ({
        ...incident,
        id: incident.id,
        dateTime: incident.date_reported && incident.time_reported 
          ? `${incident.date_reported}T${incident.time_reported}` 
          : (incident.date_reported || incident.created_at || new Date().toISOString()),
        location: incident.ride_name || incident.location || '',
        type: incident.incident_type || incident.type || '',
        status: incident.status || 'Open',
      }));

      const incidentsByStatus = mappedIncidents.reduce((acc, incident) => {
        const status = incident.status || 'Open';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const recentIncidents = [...mappedIncidents]
        .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
        .slice(0, 3);

      const totalIncidents = mappedIncidents.length;
      const resolvedCount = mappedIncidents.filter(incident => incident.status === 'Resolved').length;
      const notResolvedCount = mappedIncidents.filter(incident => incident.status === 'Not Resolved').length;

      // Process deployment/removal data for parts inventory info
      // Map deployments and removals from database
      const mappedDeployments = deployments.map(deployment => ({
        ...deployment,
        place: deployment.place,
        date: deployment.date,
      }));

      const mappedRemovals = removals.map(removal => ({
        ...removal,
        place: removal.place,
        date: removal.date,
      }));

      const getCurrentLocation = () => {
        if (mappedDeployments.length === 0) return 'No deployments recorded';
        
        // Count deployments by place to find the most common location
        const locationCounts = mappedDeployments.reduce((acc, deployment) => {
          const place = deployment.place || '';
          if (place) {
            acc[place] = (acc[place] || 0) + 1;
          }
          return acc;
        }, {});
        
        const mostCommonLocation = Object.entries(locationCounts)
          .sort(([,a], [,b]) => b - a)[0];
        
        return mostCommonLocation ? mostCommonLocation[0] : 'No deployments recorded';
      };

      const getAssemblyDate = () => {
        if (mappedDeployments.length === 0) return 'No deployments recorded';
        
        // Get the most recent deployment date
        const sortedDeployments = mappedDeployments
          .filter(d => d.date)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return sortedDeployments[0] ? new Date(sortedDeployments[0].date).toLocaleDateString() : 'No deployments recorded';
      };

      const getDisassemblyDate = () => {
        if (mappedRemovals.length === 0) return 'No removals recorded';
        
        // Get the most recent removal date
        const sortedRemovals = mappedRemovals
          .filter(r => r.date)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return sortedRemovals[0] ? new Date(sortedRemovals[0].date).toLocaleDateString() : 'No removals recorded';
      };

      setOverviewData({
        partsInventory: {
          stockLevels: lowStockParts.map(part => ({
            name: part.name,
            quantity: part.quantity,
            threshold: part.threshold || 10,
          })),
          byCategory: Object.entries(partsByCategory).map(([name, value]) => ({ name, value })),
          byStockStatus: Object.entries(partsByStockStatus).map(([name, value]) => ({ name, value })),
          byDate: partsByDate,
          totalItems: mappedSpareParts.length,
          lowStockCount: lowStockParts.length,
          inStockCount: partsByStockStatus['In Stock'] || 0,
          outOfStockCount: partsByStockStatus['Out of Stock'] || 0,
          currentLocation: getCurrentLocation(),
          assemblyDate: getAssemblyDate(),
          disassemblyDate: getDisassemblyDate(),
        },
        rideCounters: {
          byStatus: Object.entries(ridesByStatus).map(([name, value]) => ({ name, value })),
          byDate: ridesByDate,
          todayCount: todayRideCount,
          totalRides: totalRides,
          operationalRides: operationalRides,
          malfunctionCount: malfunctionCount,
          maintenanceCount: maintenanceCount,
          totalCustomers: totalCustomers,
          recentRides: recentRides,
          recentManualEntries,
        },
        maintenance: {
          byStatus: Object.entries(maintenanceByStatus).map(([name, value]) => ({ name, value })),
          byDate: maintenanceByDate,
          nextScheduledMaintenance: nextScheduledMaintenance,
        },
        incidents: {
          byStatus: Object.entries(incidentsByStatus).map(([name, value]) => ({ name, value })),
          recentIncidents,
          totalIncidents: totalIncidents,
          resolvedCount: resolvedCount,
          notResolvedCount: notResolvedCount,
        },
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, []);

  const modules = [
    {
      title: 'Ride Parts Inventory',
      icon: <InventoryIcon sx={{ fontSize: 30, color: 'primary.main' }} />,
      stats: {
        total: overviewData.partsInventory.totalItems,
        lowStock: overviewData.partsInventory.lowStockCount,
        inStock: overviewData.partsInventory.inStockCount,
        outOfStock: overviewData.partsInventory.outOfStockCount,
      },
      currentLocation: overviewData.partsInventory.currentLocation,
      assemblyDate: overviewData.partsInventory.assemblyDate,
      disassemblyDate: overviewData.partsInventory.disassemblyDate,
      lowStockItems: overviewData.partsInventory.stockLevels,
      categories: overviewData.partsInventory.byCategory,
      byDate: overviewData.partsInventory.byDate,
    },
    {
      title: "Customers' Count (per ride)",
      icon: <RideCounterIcon sx={{ fontSize: 30, color: 'primary.main' }} />,
      status: overviewData.rideCounters.byStatus,
      byDate: overviewData.rideCounters.byDate,
      todayCount: overviewData.rideCounters.todayCount,
      totalRides: overviewData.rideCounters.totalRides,
      operationalRides: overviewData.rideCounters.operationalRides,
      malfunctionCount: overviewData.rideCounters.malfunctionCount || 0,
      maintenanceCount: overviewData.rideCounters.maintenanceCount || 0,
      totalCustomers: overviewData.rideCounters.totalCustomers,
      recentRides: overviewData.rideCounters.recentRides,
      recentManualEntries: overviewData.rideCounters.recentManualEntries || [],
    },
    {
      title: 'Incident Reports',
      icon: <IncidentIcon sx={{ fontSize: 30, color: 'primary.main' }} />,
      status: overviewData.incidents.byStatus,
      recentIncidents: overviewData.incidents.recentIncidents || [],
      totalIncidents: overviewData.incidents.totalIncidents,
      resolvedCount: overviewData.incidents.resolvedCount,
      notResolvedCount: overviewData.incidents.notResolvedCount,
    },
    {
      title: 'Maintenance Reports',
      icon: <BuildIcon sx={{ fontSize: 30, color: 'primary.main' }} />,
      status: overviewData.maintenance.byStatus,
      byDate: overviewData.maintenance.byDate,
      nextScheduledMaintenance: overviewData.maintenance.nextScheduledMaintenance,
    },
  ];

  const renderBarGraph = (data) => {
    if (!data || data.length === 0) return null;
    const maxValue = Math.max(...data.map(item => item.count || 0), 1);
    return (
      <Box sx={{ height: 100, display: 'flex', alignItems: 'flex-end', gap: 1, mt: 4, mb: 3 }}>
        {data.map((item, index) => (
          <Box key={index} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ mb: 0.5, fontSize: '0.7rem', color: 'text.secondary' }}>
              {item.count}
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: maxValue === 0 ? 0 : `${(item.count / maxValue) * 80}px`,
                bgcolor: 'primary.main',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.3s ease',
                opacity: item.count === 0 ? 0.3 : 1,
              }}
            />
            <Typography variant="caption" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
              {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  const handleViewAll = (module) => {
    switch(module) {
      case 'Ride Parts Inventory':
        navigate('/encoder-dashboard/parts-inventory');
        break;
      case "Customers' Count (per ride)":
        navigate('/admin-dashboard/customers-count');
        break;
      case 'Maintenance Reports':
        navigate('/encoder-dashboard/maintenance');
        break;
      case 'Incident Reports':
        navigate('/encoder-dashboard/incidents');
        break;
      default:
        break;
    }
  };

  const renderInventoryModule = (module) => (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Ride Parts Inventory
          </Typography>
          <Box sx={{ maxHeight: 80, overflow: 'hidden' }}>
            {module.categories && module.categories.slice(0, 3).map((cat, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: idx < 2 ? 1 : 0, borderColor: 'divider' }}>
                <Typography variant="caption">{cat.name}</Typography>
                <Typography variant="caption" color="primary">{cat.value}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Ride Repairs
          </Typography>
          <Box sx={{ maxHeight: 80, overflow: 'hidden' }}>
            {module.byDate && module.byDate.slice(0, 3).map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: idx < 2 ? 1 : 0, borderColor: 'divider' }}>
                <Typography variant="caption">{item.date}</Typography>
                <Typography variant="caption" color="success.main">{item.count}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    </>
  );

  const renderStatusModule = (module) => (
    <>
      {module.title === "Customers' Count (per ride)" && (
        <>
          {/* Compact Hero Section */}
          <Box 
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
              borderRadius: 2,
              p: 2,
              mb: 2,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                opacity: 0.3,
              }
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', mb: 1.5 }}>
                🎢 Ride Operations Hub
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                      {module.malfunctionCount || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.7rem' }}>
                      Malfunction
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                      {module.operationalRides}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.7rem' }}>
                      Operational
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                      {module.maintenanceCount || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.7rem' }}>
                      Maintenance
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Box>

          {/* Ride Entry Counts — recent manual entries (same source as personnel customer count) */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>
              🎯 Ride Entry Counts
            </Typography>
            <RideEntryCountsList entries={module.recentManualEntries} />
          </Box>
        </>
      )}
      {module.title === 'Maintenance Reports' && (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Maintenance Status Overview
            </Typography>
            <Grid container spacing={1}>
              {module.status.map((status, index) => {
                const getStatusColor = (statusName) => {
                  const lowerStatus = statusName.toLowerCase();
                  if (lowerStatus.includes('scheduled')) return 'info';
                  if (lowerStatus.includes('progress')) return 'warning';
                  if (lowerStatus.includes('completed')) return 'success';
                  if (lowerStatus.includes('overdue')) return 'error';
                  return 'primary';
                };
                
                return (
                  <Grid item xs={6} key={index}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        bgcolor: theme.palette[getStatusColor(status.name)].lighter,
                        border: `1px solid ${theme.palette[getStatusColor(status.name)].light}`,
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {status.name}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette[getStatusColor(status.name)].main }}>
                        {status.value}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
              <Grid item xs={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: theme.palette.primary.lighter,
                    border: `1px solid ${theme.palette.primary.light}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Total
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                    {module.status.reduce((sum, status) => sum + status.value, 0)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Next Scheduled Maintenance
            </Typography>
            <Stack spacing={1}>
              {module.nextScheduledMaintenance && Array.isArray(module.nextScheduledMaintenance) && module.nextScheduledMaintenance.length > 0 ? (
                module.nextScheduledMaintenance.map((maintenance, index) => {
                  const scheduledDate = new Date(maintenance.nextMaintenance);
                  scheduledDate.setHours(0, 0, 0, 0);
                  const todayStart = new Date();
                  todayStart.setHours(0, 0, 0, 0);
                  const weekEnd = new Date(todayStart);
                  weekEnd.setDate(weekEnd.getDate() + 7);
                  const isToday = scheduledDate.getTime() === todayStart.getTime();
                  const isOverdue = scheduledDate < todayStart;
                  const isUpcoming = !isOverdue && !isToday && scheduledDate <= weekEnd;
                
                return (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 1,
                      bgcolor: isToday 
                        ? theme.palette.primary.lighter 
                        : isUpcoming 
                          ? theme.palette.warning.lighter 
                          : isOverdue 
                            ? theme.palette.error.lighter 
                            : 'background.paper',
                      border: `1px solid ${
                        isToday 
                          ? theme.palette.primary.light 
                          : isUpcoming 
                            ? theme.palette.warning.light 
                            : isOverdue 
                              ? theme.palette.error.light 
                              : theme.palette.divider
                      }`,
                      borderRadius: 1,
                    }}
                  >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 600,
                              color: isToday 
                                ? 'primary.main' 
                                : isUpcoming 
                                  ? 'warning.main' 
                                  : isOverdue 
                                    ? 'error.main' 
                                    : 'text.primary',
                              fontSize: '0.875rem'
                            }}
                          >
                            {maintenance.ride || 'Unnamed Ride'}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={maintenance.status || 'Scheduled'}
                          color={isToday ? "primary" : isUpcoming ? "warning" : isOverdue ? "error" : "info"}
                          variant="filled"
                          sx={{ height: 24 }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Typography>
                        <Typography variant="caption" color={isOverdue ? "error.main" : isUpcoming ? "warning.main" : "text.secondary"}>
                          {isOverdue 
                            ? `${Math.abs(Math.ceil((scheduledDate - new Date()) / (1000 * 60 * 60 * 24)))} days overdue`
                            : isUpcoming 
                              ? `${Math.ceil((scheduledDate - new Date()) / (1000 * 60 * 60 * 24))} days remaining`
                              : isToday 
                                ? 'Today'
                                : ''
                          }
                        </Typography>
                      </Box>
                  </Paper>
                );
                })
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1,
                    bgcolor: 'background.paper',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block' }}>
                    No scheduled maintenance
                  </Typography>
                </Paper>
              )}
            </Stack>
          </Box>
        </>
      )}
      {module.title === 'Incident Reports' && (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Incident Status Overview
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: theme.palette.success.lighter,
                    border: `1px solid ${theme.palette.success.light}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Resolved
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                    {module.resolvedCount}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: theme.palette.warning.lighter,
                    border: `1px solid ${theme.palette.warning.light}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Not Resolved
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
                    {module.notResolvedCount}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Recent Incidents
            </Typography>
            <Stack spacing={1.5}>
              {module.recentIncidents && module.recentIncidents.length > 0 ? (
                module.recentIncidents.map((incident, index) => {
                  const reportedDate = new Date(incident.dateTime);
                  const getIncidentStatusColor = (statusName) => {
                    const lowerStatus = (statusName || '').toLowerCase();
                    if (lowerStatus.includes('resolved')) return 'success';
                    if (lowerStatus.includes('not resolved') || lowerStatus.includes('pending')) return 'warning';
                    if (lowerStatus.includes('investigating')) return 'info';
                    if (lowerStatus.includes('critical')) return 'error';
                    return 'default';
                  };
                  const statusColor = getIncidentStatusColor(incident.status);

                  return (
                    <Paper
                      key={incident.id || index}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        bgcolor: 'background.paper',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }} noWrap>
                            {incident.location || 'Unknown location'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>
                            {incident.type || 'Incident'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {reportedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={incident.status || 'Unknown'}
                          color={statusColor}
                          variant="outlined"
                          sx={{ flexShrink: 0 }}
                        />
                      </Box>
                    </Paper>
                  );
                })
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No recent incidents
                </Typography>
              )}
            </Stack>
          </Box>
        </>
      )}
      {module.title !== "Customers' Count (per ride)" && module.title !== 'Maintenance Reports' && module.title !== 'Incident Reports' && (
        <>
          <Box sx={{ mb: 3 }}>
            {renderBarGraph(module.byDate)}
          </Box>
          <Stack spacing={1}>
            {module.status.map((status, index) => (
              <Box key={index}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">{status.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {status.value}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={100}
                  color={
                    status.name.toLowerCase().includes('pending') ? 'warning' :
                    status.name.toLowerCase().includes('active') ? 'info' :
                    status.name.toLowerCase().includes('completed') ? 'success' :
                    'primary'
                  }
                />
              </Box>
            ))}
          </Stack>
        </>
      )}
    </>
  );

  return (
    <DashboardLayout title="Dashboard">
      <Box sx={{ p: 1 }}>
        <Grid container spacing={2} justifyContent="center">
          {modules.map((module, index) => (
            <Grid item xs={12} sm={6} md={5} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {module.icon}
                      <Typography variant="subtitle1" sx={{ ml: 1, fontSize: '0.9rem', fontWeight: 'bold' }}>
                        {module.title}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewAll(module.title)}
                      sx={{ 
                        textTransform: 'none',
                        minWidth: 'auto',
                        p: 0.5,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      View All
                    </Button>
                  </Box>
                  {module.stats 
                    ? renderInventoryModule(module) 
                    : renderStatusModule(module)
                  }
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default EncoderDashboardOverview; 