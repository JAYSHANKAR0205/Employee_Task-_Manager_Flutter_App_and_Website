/**
 * @file App.tsx
 * @description Main Application Entry Component & Router Configuration.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Auth Pages
import AuthPage from './features/auth/pages/AuthPage';
import Verify from './features/auth/pages/Verify';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import CompleteProfile from './features/auth/pages/CompleteProfile';

// Protected Pages
import UserList from './features/employees/pages/UserList';
import TasksDashboard from './features/tasks/components/Dashboard';
import CreateUser from './features/dashboard/pages/CreateUser';
import ProfilePage from './features/profile/pages/ProfilePage';
import EmployeeLeaves from './features/leaves/pages/EmployeeLeaves';
import AdminLeaves from './features/leaves/pages/AdminLeaves';

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (user && user.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const EmployeeGuard = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (user && user.role === 'Admin') {
    return <Navigate to="/admin/leaves" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/register" element={<AuthPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<TasksDashboard viewMode="dashboard" />} />
                  <Route path="/tasks" element={<TasksDashboard viewMode="tasks" />} />
                  <Route path="/leaves" element={<EmployeeGuard><EmployeeLeaves /></EmployeeGuard>} />
                  <Route path="/admin/leaves" element={<AdminGuard><AdminLeaves /></AdminGuard>} />
                  <Route path="/employees" element={<UserList />} />
                  <Route path="/create-user" element={<CreateUser />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
              </Route>
              
              {/* Fallback route */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
