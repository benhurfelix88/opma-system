import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './components/dashboards/AdminDashboard';
import ManagerDashboardOverview from './components/dashboards/ManagerDashboardOverview';
import ManagerIncidentReports from './components/dashboards/ManagerIncidentReports';
import ManagerMaintenanceReports from './components/dashboards/ManagerMaintenanceReports';
import EncoderMaintenanceReports from './components/dashboards/EncoderMaintenanceReports';
import EncoderIncidentReports from './components/dashboards/EncoderIncidentReports';
import ManagerPartsInventory from './components/dashboards/ManagerPartsInventory';
import ManagerRideStatus from './components/dashboards/ManagerRideStatus';
import UserManagement from './components/dashboards/UserManagement';
import IncidentReport from './components/modules/IncidentReport';
import AdminIncidentReports from './components/dashboards/AdminIncidentReports';
import AdminPartsInventory from './components/dashboards/AdminPartsInventory';
import EncoderPartsInventory from './components/dashboards/EncoderPartsInventory';
import ManageUsers from './components/dashboards/ManageUsers';
import PrivateRoute from './components/auth/PrivateRoute';
import theme from './theme';
import PersonnelIncidentReport from './components/modules/PersonnelIncidentReport';
import PersonnelDashboardOverview from './components/dashboards/PersonnelDashboardOverview';
import AdminDashboardOverview from './components/dashboards/AdminDashboardOverview';
import EncoderDashboardOverview from './components/dashboards/EncoderDashboardOverview';
import AdminMaintenanceReports from './components/dashboards/AdminMaintenanceReports';
import PersonnelRideCounters from './components/modules/PersonnelRideCounters';
import AdminCustomersCount from './components/modules/AdminCustomersCount';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            <Route
              path="/admin-dashboard/*"
              element={
                <PrivateRoute allowedRoles={['IT Admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />

            <Route
              path="/admin-dashboard/user-management"
              element={
                <PrivateRoute allowedRoles={['IT Admin']}>
                  <UserManagement />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/admin-dashboard/incidents"
              element={
                <PrivateRoute allowedRoles={['IT Admin']}>
                  <AdminIncidentReports />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/admin-dashboard/parts-inventory"
              element={
                <PrivateRoute allowedRoles={['IT Admin']}>
                  <AdminPartsInventory />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/admin-dashboard/manage-users"
              element={
                <PrivateRoute allowedRoles={['IT Admin']}>
                  <ManageUsers />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/admin-dashboard"
              element={
                <PrivateRoute allowedRoles={['IT Admin']}>
                  <AdminDashboardOverview />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/admin-dashboard/maintenance"
              element={
                <PrivateRoute allowedRoles={['IT Admin']}>
                  <AdminMaintenanceReports />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/encoder-dashboard/*"
              element={
                <PrivateRoute allowedRoles={['IT Encoder']}>
                  <EncoderDashboardOverview />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/encoder-dashboard/parts-inventory"
              element={
                <PrivateRoute allowedRoles={['IT Encoder']}>
                  <EncoderPartsInventory />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/encoder-dashboard/maintenance"
              element={
                <PrivateRoute allowedRoles={['IT Encoder']}>
                  <EncoderMaintenanceReports />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/encoder-dashboard/incidents"
              element={
                <PrivateRoute allowedRoles={['IT Encoder']}>
                  <EncoderIncidentReports />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/manager-dashboard"
              element={
                <PrivateRoute allowedRoles={['Operations Manager']}>
                  <ManagerDashboardOverview />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/manager-dashboard/incidents"
              element={
                <PrivateRoute allowedRoles={['Operations Manager']}>
                  <ManagerIncidentReports />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/manager-dashboard/maintenance"
              element={
                <PrivateRoute allowedRoles={['Operations Manager']}>
                  <ManagerMaintenanceReports />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/manager-dashboard/ride-status"
              element={
                <PrivateRoute allowedRoles={['Operations Manager']}>
                  <ManagerRideStatus />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/manager-dashboard/parts-inventory"
              element={
                <PrivateRoute allowedRoles={['Operations Manager']}>
                  <ManagerPartsInventory />
                </PrivateRoute>
              }
            />
            
            
            <Route
              path="/personnel-dashboard/*"
              element={
                <PrivateRoute allowedRoles={['Amusement Park Personnel']}>
                  <PersonnelDashboardOverview />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/personnel-dashboard/incidents"
              element={
                <PrivateRoute allowedRoles={['Amusement Park Personnel']}>
                  <PersonnelIncidentReport />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/personnel-dashboard/ride-counters"
              element={
                <PrivateRoute allowedRoles={['Amusement Park Personnel']}>
                  <DashboardLayout title="Customers' Count (per ride)">
                    <PersonnelRideCounters />
                  </DashboardLayout>
                </PrivateRoute>
              }
            />
            
            <Route
              path="/dashboard/incidents"
              element={
                <PrivateRoute allowedRoles={['IT Admin', 'Operations Manager', 'Amusement Park Personnel']}>
                  <DashboardLayout title="Incident Reports">
                    <IncidentReport />
                  </DashboardLayout>
                </PrivateRoute>
              }
            />
            
            <Route
              path="/admin-dashboard/customers-count"
              element={
                <PrivateRoute allowedRoles={['IT Admin', 'IT Encoder', 'Operations Manager']}>
                  <DashboardLayout title="Customers' Count (per ride)">
                    <AdminCustomersCount />
                  </DashboardLayout>
                </PrivateRoute>
              }
            />
            
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App; 