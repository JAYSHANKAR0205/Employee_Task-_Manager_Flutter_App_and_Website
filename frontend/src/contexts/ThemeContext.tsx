/**
 * @file ThemeContext.tsx
 * @description Application-Wide Dark / Light Theme Context Provider.
 * 
 * WORK OF THIS FILE:
 * - Toggles and persists the active UI theme ('dark' | 'light' | 'system') using `js-cookie`.
 * - Applies/removes the `.dark` Tailwind CSS class on the root `<html>` element to instantly update styling across all components.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Provides seamless light/dark mode theme switching across the entire dashboard using non-sensitive cookies instead of `localStorage`.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  resolvedTheme: 'dark',
};

const ThemeContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (sessionStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;

    if (theme !== 'system') {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      setResolvedTheme(theme);
      return;
    }

    const checkTimeTheme = () => {
      const hour = new Date().getHours();
      const timeTheme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
      
      if (!root.classList.contains(timeTheme)) {
        root.classList.remove('light', 'dark');
        root.classList.add(timeTheme);
        setResolvedTheme(timeTheme);
      }
    };

    checkTimeTheme();
    
    // Check periodically in case the user leaves the tab open across 6 AM or 6 PM
    const interval = setInterval(checkTimeTheme, 60000);
    return () => clearInterval(interval);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      sessionStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    resolvedTheme,
  };

  return (
    <ThemeContext.Provider {...props} value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
