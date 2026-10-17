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
  Assessment as RideCounterIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { 
  incidentsAPI,
  ridesAPI
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

const PersonnelDashboardOverview = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [overviewData, setOverviewData] = useState({
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
  });

  const loadData = async () => {
    try {
      // Fetch data from APIs
      const [ridesData, incidentsData, rideEntriesData] = await Promise.allSettled([
        ridesAPI.getAll().catch(() => []),
        incidentsAPI.getAll().catch(() => []),
        rideEntriesAPI.getAll().catch(() => [])
      ]);

      // Extract data from Promise.allSettled results
      const rides = ridesData.status === 'fulfilled' ? ridesData.value : [];
      const incidents = incidentsData.status === 'fulfilled' ? incidentsData.value : [];
      const rideEntries = normalizeRideEntriesResponse(
        rideEntriesData.status === 'fulfilled' ? rideEntriesData.value : []
      );

      // Map rides from database
      const mappedRides = rides.map(ride => ({
        ...ride,
        id: ride.id,
        name: ride.name || ride.ride_name || 'Unknown Ride',
        status: ride.status || 'operational',
        createdAt: ride.created_at || new Date().toISOString(),
      }));

      // Map incidents from database
      const mappedIncidents = incidents.map(incident => ({
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

      const getLast7Days = getLast7DayStrings;

      // Process Customers' Count (per ride) Data using ride entries
      const ridesByStatus = mappedRides.reduce((acc, ride) => {
        const status = ride.status || 'operational';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const manualRideEntries = rideEntries.filter(isManualEntry);

      const ridesByDate = getLast7Days().map(date => ({
        date,
        count: manualRideEntries.filter((entry) => isEntryOnDate(entry, date)).length,
      }));

      const today = getLocalDateString();
      const todayRideCount = countManualEntriesOnDate(manualRideEntries, today);
      const totalCustomers = manualRideEntries.reduce(
        (sum, entry) => sum + getCustomerCount(entry),
        0
      );
      const recentManualEntries = buildRecentManualEntries(manualRideEntries, 3);

      // Calculate total and operational rides
      const totalRides = mappedRides.length;
      const operationalRides = mappedRides.filter(ride => ride.status === 'operational').length;
      const malfunctionCount = mappedRides.filter(ride => 
        ride.status === 'malfunction' || 
        ride.status === 'malfunctioning' || 
        ride.status === 'out_of_order' ||
        ride.status === 'broken'
      ).length;
      const maintenanceCount = mappedRides.filter(ride => ride.status === 'maintenance' || ride.status === 'under_maintenance').length;

      // Calculate recent rides with entries
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

      const incidentsByStatus = mappedIncidents.reduce((acc, incident) => {
        acc[incident.status] = (acc[incident.status] || 0) + 1;
        return acc;
      }, {});

      const recentIncidents = [...mappedIncidents]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 3);

      setOverviewData({
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
        incidents: {
          byStatus: Object.entries(incidentsByStatus).map(([name, value]) => ({ name, value })),
          recentIncidents,
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
      icon: <WarningIcon sx={{ fontSize: 30, color: 'error.main' }} />,
      status: overviewData.incidents.byStatus,
      recentIncidents: overviewData.incidents.recentIncidents || [],
    },
  ];

  const renderBarGraph = (data) => {
    const maxValue = Math.max(1, ...data.map(item => item.count)); // Ensure max is at least 1 to avoid division by zero
    return (
      <Box sx={{ height: 80, display: 'flex', alignItems: 'flex-end', gap: 0.5, mt: 2, mb: 1 }}>
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
      case "Customers' Count (per ride)":
        navigate('/personnel-dashboard/ride-counters');
        break;
      case 'Incident Reports':
        navigate('/personnel-dashboard/incidents');
        break;
      default:
        break;
    }
  };

  const renderStatusModule = (module) => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
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
             border: 1,
             borderColor: 'divider',
             borderRadius: 1,
           }}
         >
           View All
         </Button>
       </Box>
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

          {/* Ride Entry Counts — recent manual entries (same as personnel customer count menu) */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>
              🎯 Ride Entry Counts
            </Typography>
            <RideEntryCountsList entries={module.recentManualEntries} />
          </Box>
        </>
      )}
      {module.title === 'Incident Reports' && (
        <Box sx={{ mb: 1 }}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Incident Status Overview
            </Typography>
            <Grid container spacing={0.5}>
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
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Recent Incidents
            </Typography>
            <Stack spacing={1}>
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
        </Box>
      )}
      {/* Add Maintenance Reports if needed for Personnel Dashboard */}
      {module.title !== "Customers' Count (per ride)" && module.title !== 'Incident Reports' && (
        <Box sx={{ mb: 1 }}>
          {renderBarGraph(module.byDate)}
          <Stack spacing={0.5} sx={{ mt: 1 }}>
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
        </Box>
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
                  {renderStatusModule(module)}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default PersonnelDashboardOverview;