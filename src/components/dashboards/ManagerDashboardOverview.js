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
  Build as BuildIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  Assessment as RideCounterIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import {
  incidentsAPI,
  sparePartsAPI,
  ridesAPI,
  maintenanceAPI,
  partDeploymentsAPI,
  partRemovalsAPI,
  rideRepairsAPI
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

const ManagerDashboardOverview = () => {
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
    incidents: {
      byStatus: [],
      recentIncidents: [],
    },
    maintenance: {
      byStatus: [],
      byDate: [],
      pendingRepairs: [],
      nextScheduledMaintenance: [],
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch data from APIs
      const [sparePartsData, incidentsData, ridesData, maintenanceData, deploymentsData, removalsData, rideEntriesData, rideRepairsData] = await Promise.allSettled([
        sparePartsAPI.getAll().catch(() => []),
        incidentsAPI.getAll().catch(() => []),
        ridesAPI.getAll().catch(() => []),
        maintenanceAPI.getAll().catch(() => []),
        partDeploymentsAPI.getAll().catch(() => []),
        partRemovalsAPI.getAll().catch(() => []),
        rideEntriesAPI.getAll().catch(() => []),
        rideRepairsAPI.getAll().catch(() => [])
      ]);

      // Extract data from Promise.allSettled results
      const sparePartsRaw = sparePartsData.status === 'fulfilled' ? sparePartsData.value : [];
      const incidentsDataRaw = incidentsData.status === 'fulfilled' ? incidentsData.value : [];
      const ridesRaw = ridesData.status === 'fulfilled' ? ridesData.value : [];
      const maintenanceRecordsRaw = maintenanceData.status === 'fulfilled' ? maintenanceData.value : [];
      const deploymentsRaw = deploymentsData.status === 'fulfilled' ? deploymentsData.value : [];
      const removalsRaw = removalsData.status === 'fulfilled' ? removalsData.value : [];
      const rideEntriesRaw = normalizeRideEntriesResponse(
        rideEntriesData.status === 'fulfilled' ? rideEntriesData.value : []
      );
      const rideRepairsRaw = rideRepairsData.status === 'fulfilled' ? rideRepairsData.value : [];

      // Map spare parts from database
      const spareParts = sparePartsRaw.map(part => ({
        ...part,
        id: part.id,
        name: part.part_name || part.name,
        ride: part.ride || '',
        quantity: part.quantity || 0,
        price: part.cost || part.price || 0,
        status: part.status || 'In Stock',
        category: part.category || '',
        lastUpdated: part.updated_at || part.created_at || new Date().toISOString(),
        threshold: 10, // Default threshold
      }));

      // Map ride repairs from database
      const rideRepairs = rideRepairsRaw.map(repair => ({
        ...repair,
        id: repair.id,
        ride: repair.ride || '',
        date: repair.date || repair.created_at,
        issue: repair.issue || '',
        status: repair.status || 'In Progress',
      }));


      // Map incidents from database
      const incidents = incidentsDataRaw.map(incident => ({
        ...incident,
        id: incident.id,
        timestamp: incident.date_reported && incident.time_reported 
          ? `${incident.date_reported}T${incident.time_reported}` 
          : (incident.date_reported || incident.created_at || new Date().toISOString()),
        reportedAt: incident.date_reported || incident.created_at,
        status: incident.status || 'pending',
        location: incident.ride_name || incident.location || 'Unknown location',
        type: incident.incident_type || incident.type || 'Incident',
      }));

      // Map maintenance from database
      const maintenanceRecords = maintenanceRecordsRaw.map(record => ({
        ...record,
        id: record.id,
        date: record.date_performed || record.date || record.created_at,
        status: record.status || 'scheduled',
        nextMaintenance: record.next_maintenance_date || record.next_maintenance || record.nextMaintenance || record.scheduled_date || record.maintenance_date || record.next_date || null,
        ride: record.ride_name || record.ride || record.rideId || 'Unknown Ride',
      }));

      // Map deployments and removals from database
      const deployments = deploymentsRaw.map(deployment => ({
        ...deployment,
        place: deployment.place || '',
        date: deployment.date || deployment.created_at,
      }));

      const removals = removalsRaw.map(removal => ({
        ...removal,
        place: removal.place || '',
        date: removal.date || removal.created_at,
      }));

      const getLast7Days = getLast7DayStrings;

      // Process Ride Parts Inventory Data
      const partsByRide = spareParts.reduce((acc, part) => {
        const key = part.ride || part.category || 'Unassigned';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      
      const partsByStockStatus = spareParts.reduce((acc, part) => {
        const status = part.quantity > 0 ? 'In Stock' : 'Out of Stock';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      const partsByDate = getLast7Days().map(date => ({
        date,
        count: spareParts.filter(part => part.lastUpdated?.split('T')[0] === date).length
      }));
      
      const lowStockParts = spareParts
        .filter(part => part.quantity <= (part.threshold || 10) && part.quantity > 0)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 5);


      // Process Incidents Data
      const incidentsByStatus = incidents.reduce((acc, incident) => {
        acc[incident.status] = (acc[incident.status] || 0) + 1;
        return acc;
      }, {});

      const recentIncidents = [...incidents]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 3);

      // Process Maintenance Data
      const maintenanceByStatus = maintenanceRecords.reduce((acc, record) => {
        const status = record.status || 'scheduled';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const maintenanceByDate = getLast7Days().map(date => ({
        date,
        count: maintenanceRecords.filter(record => {
          const recordDate = record.date?.split('T')[0];
          return recordDate === date;
        }).length
      }));

      // Process Ride Repairs Data
      const rideRepairsByDate = rideRepairs
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3)
        .map(repair => ({
          date: new Date(repair.date).toLocaleDateString(),
          ride: repair.ride,
          issue: repair.issue,
        }));

      // Get next scheduled maintenance (match maintenance reports: next_maintenance_date)
      const nextScheduledMaintenance = maintenanceRecords
        .filter(record => {
          if (!record.nextMaintenance) return false;
          const status = (record.status || '').toLowerCase();
          return status !== 'completed';
        })
        .sort((a, b) => new Date(a.nextMaintenance) - new Date(b.nextMaintenance))
        .slice(0, 2);

      // Get maintenance statistics
      const totalMaintenance = maintenanceRecords.length;
      const completedMaintenance = maintenanceRecords.filter(record => 
        (record.status || '').toLowerCase() === 'completed'
      ).length;
      const scheduledMaintenance = maintenanceRecords.filter(record => 
        (record.status || '').toLowerCase() === 'scheduled'
      ).length;
      const inProgressMaintenance = maintenanceRecords.filter(record => {
        const status = (record.status || '').toLowerCase();
        return status === 'in_progress' || status === 'in progress';
      }).length;

      // Process deployment/removal data for parts inventory info
      const getCurrentLocation = () => {
        if (deployments.length === 0) return 'No deployments recorded';
        
        // Count deployments by place to find the most common location
        const locationCounts = deployments.reduce((acc, deployment) => {
          acc[deployment.place] = (acc[deployment.place] || 0) + 1;
          return acc;
        }, {});
        
        const mostCommonLocation = Object.entries(locationCounts)
          .sort(([,a], [,b]) => b - a)[0];
        
        return mostCommonLocation ? mostCommonLocation[0] : 'No deployments recorded';
      };

      const getAssemblyDate = () => {
        if (deployments.length === 0) return 'No deployments recorded';
        
        // Get the most recent deployment date
        const sortedDeployments = deployments
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return sortedDeployments[0] ? new Date(sortedDeployments[0].date).toLocaleDateString() : 'No deployments recorded';
      };

      const getDisassemblyDate = () => {
        if (removals.length === 0) return 'No removals recorded';
        
        // Get the most recent removal date
        const sortedRemovals = removals
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return sortedRemovals[0] ? new Date(sortedRemovals[0].date).toLocaleDateString() : 'No removals recorded';
      };

      // Process Customers' Count (per ride) Data using ride entries
      const rides = ridesRaw.map(ride => ({
        ...ride,
        status: ride.status || 'operational',
        name: ride.ride_name || ride.name || 'Unknown Ride'
      }));

      const ridesByStatus = rides.reduce((acc, ride) => {
        const status = ride.status || 'operational';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const manualRideEntries = rideEntriesRaw.filter(isManualEntry);
      const today = getLocalDateString();
      const todayRideCount = countManualEntriesOnDate(manualRideEntries, today);

      const ridesByDate = getLast7Days().map((date) => ({
        date: new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        count: manualRideEntries.filter((entry) => isEntryOnDate(entry, date)).length,
      }));

      const totalCustomers = manualRideEntries.reduce(
        (sum, entry) => sum + getCustomerCount(entry),
        0
      );
      const recentManualEntries = buildRecentManualEntries(manualRideEntries, 3);

      // Calculate malfunction and maintenance counts
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

      setOverviewData({
        partsInventory: {
          stockLevels: lowStockParts.map(part => ({
            name: part.name,
            quantity: part.quantity,
            threshold: part.threshold || 10,
          })),
          byRide: Object.entries(partsByRide).map(([name, value]) => ({ name, value })),
          byStockStatus: Object.entries(partsByStockStatus).map(([name, value]) => ({ name, value })),
          byDate: partsByDate,
          totalItems: spareParts.length,
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
          totalRides: rides.length,
          operationalRides: ridesByStatus['operational'] || 0,
          malfunctionCount: malfunctionCount,
          maintenanceCount: maintenanceCount,
          totalCustomers: totalCustomers,
          recentRides: recentRides,
          recentManualEntries,
        },
        incidents: {
          byStatus: Object.entries(incidentsByStatus).map(([name, value]) => ({ name, value })),
          recentIncidents,
        },
        maintenance: {
          byStatus: Object.entries(maintenanceByStatus).map(([name, value]) => ({ name, value })),
          byDate: maintenanceByDate,
          nextScheduledMaintenance,
          totalMaintenance,
          completedMaintenance,
          scheduledMaintenance,
          inProgressMaintenance,
        },
        rideRepairs: {
          recentRepairs: rideRepairsByDate,
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
      byRide: overviewData.partsInventory.byRide,
      byDate: overviewData.partsInventory.byDate,
      recentRepairs: overviewData.rideRepairs?.recentRepairs || [],
    },
    {
      title: "Customers' Count (per ride)",
      icon: <RideCounterIcon sx={{ fontSize: 30, color: 'primary.main' }} />,
      status: overviewData.rideCounters?.byStatus || [],
      byDate: overviewData.rideCounters?.byDate || [],
      todayCount: overviewData.rideCounters?.todayCount || 0,
      totalRides: overviewData.rideCounters?.totalRides || 0,
      operationalRides: overviewData.rideCounters?.operationalRides || 0,
      malfunctionCount: overviewData.rideCounters?.malfunctionCount || 0,
      maintenanceCount: overviewData.rideCounters?.maintenanceCount || 0,
      totalCustomers: overviewData.rideCounters?.totalCustomers || 0,
      recentRides: overviewData.rideCounters?.recentRides || [],
      recentManualEntries: overviewData.rideCounters?.recentManualEntries || [],
    },
    {
      title: 'Incident Reports',
      icon: <WarningIcon sx={{ fontSize: 30, color: 'primary.main' }} />,
      status: overviewData.incidents.byStatus,
      recentIncidents: overviewData.incidents.recentIncidents || [],
    },
    {
      title: 'Maintenance Reports',
      icon: <BuildIcon sx={{ fontSize: 30, color: 'primary.main' }} />,
      status: overviewData.maintenance.byStatus,
      byDate: overviewData.maintenance.byDate,
      nextScheduledMaintenance: overviewData.maintenance.nextScheduledMaintenance,
      totalMaintenance: overviewData.maintenance.totalMaintenance,
      completedMaintenance: overviewData.maintenance.completedMaintenance,
      scheduledMaintenance: overviewData.maintenance.scheduledMaintenance,
      inProgressMaintenance: overviewData.maintenance.inProgressMaintenance,
    },
  ];

  const renderBarGraph = (data) => {
    const maxValue = Math.max(0, ...data.map(item => item.count || 0));
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
        navigate('/manager-dashboard/parts-inventory');
        break;
      case "Customers' Count (per ride)":
        navigate('/admin-dashboard/customers-count');
        break;
      case 'Incident Reports':
        navigate('/manager-dashboard/incidents');
        break;
      case 'Maintenance Reports':
        navigate('/manager-dashboard/maintenance');
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
            {module.byRide && module.byRide.slice(0, 3).map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: idx < 2 ? 1 : 0, borderColor: 'divider' }}>
                <Typography variant="caption">{item.name}</Typography>
                <Typography variant="caption" color="primary">{item.value}</Typography>
              </Box>
            ))}
            {(!module.byRide || module.byRide.length === 0) && (
              <Typography variant="caption" color="text.secondary">No parts found</Typography>
            )}
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Ride Repairs
          </Typography>
          <Box sx={{ maxHeight: 80, overflow: 'hidden' }}>
            {module.recentRepairs && module.recentRepairs.length > 0 ? (
              module.recentRepairs.slice(0, 3).map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: idx < 2 ? 1 : 0, borderColor: 'divider' }}>
                  <Typography variant="caption">{item.ride}</Typography>
                  <Typography variant="caption" color="success.main">{item.date}</Typography>
                </Box>
              ))
            ) : (
              <Typography variant="caption" color="text.secondary">No repairs recorded</Typography>
            )}
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Disassembly/Uninstallation Date
          </Typography>
          <Typography variant="body1">
            {module.disassemblyDate}
          </Typography>
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
      {module.title === 'Incident Reports' && (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Incident Status Overview
            </Typography>
            <Grid container spacing={1}>
              {module.status.map((status, index) => {
                const getStatusColor = (statusName) => {
                  const lowerStatus = statusName.toLowerCase();
                  if (lowerStatus.includes('pending')) return 'warning';
                  if (lowerStatus.includes('resolved')) return 'success';
                  if (lowerStatus.includes('investigating')) return 'info';
                  if (lowerStatus.includes('critical')) return 'error';
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
            </Grid>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Recent Incidents
            </Typography>
            <Stack spacing={1.5}>
              {module.recentIncidents && module.recentIncidents.length > 0 ? (
                module.recentIncidents.map((incident, index) => {
                  const reportedDate = new Date(incident.timestamp || incident.reportedAt);
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
                            {incident.location}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>
                            {incident.type}
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
      {module.title === 'Maintenance Reports' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Maintenance Overview
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: theme.palette.success.lighter,
                    border: `1px solid ${theme.palette.success.light}`,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Completed
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.success.main, fontSize: '1rem' }}>
                    {module.completedMaintenance || 0}
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
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Scheduled
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.warning.main, fontSize: '1rem' }}>
                    {module.scheduledMaintenance || 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: theme.palette.info.lighter,
                    border: `1px solid ${theme.palette.info.light}`,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    In Progress
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.info.main, fontSize: '1rem' }}>
                    {module.inProgressMaintenance || 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                    <Paper
                      elevation={0}
                      sx={{
                    p: 1.5,
                    bgcolor: theme.palette.primary.lighter,
                    border: `1px solid ${theme.palette.primary.light}`,
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Total
                      </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main, fontSize: '1rem' }}>
                    {module.totalMaintenance || 0}
                      </Typography>
                    </Paper>
                  </Grid>
            </Grid>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Next Scheduled Maintenance
            </Typography>
            <Stack spacing={1}>
              {module.nextScheduledMaintenance && module.nextScheduledMaintenance.length > 0 ? (
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
      {module.title !== "Customers' Count (per ride)" && module.title !== 'Incident Reports' && module.title !== 'Maintenance Reports' && (
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
                <CardContent sx={{ p: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {module.icon}
                      <Typography variant="subtitle1" sx={{ ml: 1, fontSize: '0.95rem', fontWeight: 'bold' }}>
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

export default ManagerDashboardOverview; 