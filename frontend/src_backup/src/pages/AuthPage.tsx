import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import ThemeToggle from '../components/ThemeToggle';

const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(location.pathname !== '/register');

  // Sync state if URL changes dynamically
  useEffect(() => {
    setIsLogin(location.pathname !== '/register');
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-mint flex items-center justify-center p-4 font-sans relative">
      <ThemeToggle />
      <div className={`w-full ${isLogin ? 'max-w-lg' : 'max-w-3xl'} bg-white dark:bg-forest md:rounded-[2.5rem] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col transition-all duration-500`}>
        <div className="flex flex-col p-6 md:p-10 custom-scrollbar max-h-[90vh] overflow-y-auto">
          {isLogin ? <Login onSwitch={() => navigate('/register')} /> : <Register onSwitch={() => navigate('/login')} />}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
