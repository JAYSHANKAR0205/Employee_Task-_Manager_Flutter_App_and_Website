/**
 * App.tsx
 * The main application router. 
 * Connects all the page components to their respective URL paths.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthPage from './pages/AuthPage';
import Verify from './pages/Verify';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import UserList from './pages/UserList';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Authentication Routes - Combined into Sliding AuthPage */}
          <Route path="/register" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          
          <Route path="/verify" element={<Verify />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Dashboard Route */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* User Directory Route */}
          <Route path="/users" element={<UserList />} />
          
          {/* Fallback route: redirects any unknown path directly to the login page */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
