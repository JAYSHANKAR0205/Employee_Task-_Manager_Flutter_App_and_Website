/**
 * @file AuthContext.tsx
 * @description Global React Authentication Context Provider & User Session State.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import api from '../services/api';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  qualification?: string;
  bio?: string;
  isVerified: boolean;
  googleId?: string;
  role: 'Admin' | 'Employee';
  isBlocked: boolean;
  profilePicture?: string;
  isProfileComplete?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser: React.Dispatch<React.SetStateAction<User | null>> = (value) => {
    setUserState(value);
  };

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data) {
        if (response.data.isBlocked) {
          setUser(null);
          try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?blocked=true';
          }
          return;
        }
        setUser(response.data);
      }
    } catch (error: any) {
      setUser(null);
      if (error.response?.status === 403 || error.response?.data?.code === 'USER_BLOCKED') {
        try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?blocked=true';
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try { localStorage.clear(); } catch (e) {}
    // Ensure cookies contain ONLY auth tokens (token, accessToken, refreshToken)
    const allCookies = Cookies.get();
    const allowedAuthCookies = ['token', 'accessToken', 'refreshToken'];
    for (const cookieName of Object.keys(allCookies)) {
      if (!allowedAuthCookies.includes(cookieName)) {
        Cookies.remove(cookieName, { path: '/' });
      }
    }
    checkAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setLoading(false);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setUser(null);
      try { 
        localStorage.clear(); 
        sessionStorage.clear();
      } catch (e) {}
      const allCookies = Cookies.get();
      for (const cookieName of Object.keys(allCookies)) {
        if (cookieName !== 'token') {
          Cookies.remove(cookieName, { path: '/' });
        }
      }
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
