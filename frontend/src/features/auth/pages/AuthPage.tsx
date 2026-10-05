/**
 * @file AuthPage.tsx
 * @description Authentication Landing Page Component (Login & Register Tabs).
 * 
 * WORK OF THIS FILE:
 * - Serves as the combined container for Login and Registration forms.
 * - Handles tab switching between `/login` and `/register` based on URL location.
 * - Renders modern visual layout with side animation panel (`AnimationPanel`).
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Provides a unified, polished authentication entry page for unauthenticated visitors.
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import AnimationPanel, { ANIM_STYLE } from '../../../components/ui/AnimationPanel';
import ThemeToggle from '../../../components/ThemeToggle';

import { useAuth } from '../../../contexts/AuthContext';

const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  // Strictly determine view from browser URL
  const isRegister = location.pathname === '/register';
  const [isLogin, setIsLogin] = useState(!isRegister);

  useEffect(() => {
    const currentIsRegister = location.pathname === '/register';
    setIsLogin(!currentIsRegister);
    sessionStorage.setItem('last_auth_route', location.pathname);
  }, [location.pathname]);

  if (!loading && user && !user.isBlocked && user.isProfileComplete !== false && !location.search.includes('blocked=true')) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#0f1117] flex font-sans relative overflow-hidden text-slate-800 dark:text-slate-200">
      <style>{ANIM_STYLE}</style>

      {/* Top Right Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Left: Form */}
      <div id="auth-left-panel" className="w-full lg:w-[60%] flex flex-col justify-center items-center p-6 md:p-12 z-50 relative overflow-hidden">
        <div className="w-full max-w-md mx-auto relative flex flex-col transition-all duration-500 h-full justify-center">
          <div className="flex flex-col py-2 w-full">
            {isLogin
              ? <Login key="login-form-view" onSwitch={() => navigate('/register')} />
              : <Register key="register-form-view" onSwitch={() => navigate('/login')} />}
          </div>
        </div>
      </div>

      {/* Right: Unique Animated Panel */}
      <AnimationPanel />
    </div>
  );
};

export default AuthPage;
