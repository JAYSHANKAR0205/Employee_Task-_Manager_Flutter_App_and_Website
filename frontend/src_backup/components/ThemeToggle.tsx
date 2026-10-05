import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="absolute top-4 right-4 z-[100] flex items-center bg-gray-100 dark:bg-black/20 backdrop-blur-md rounded-full p-1 border border-gray-300 dark:border-white/20 shadow-lg">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`p-2 rounded-full transition-all ${
          theme === 'light'
            ? 'bg-white shadow text-white dark:text-forest'
            : 'text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
        }`}
        title="Light Mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      
      <button
        type="button"
        onClick={() => setTheme('system')}
        className={`p-2 rounded-full transition-all ${
          theme === 'system'
            ? 'bg-white shadow text-white dark:text-forest dark:bg-gray-900'
            : 'text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
        }`}
        title="Auto (System) Mode"
      >
        <Monitor className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-full transition-all ${
          theme === 'dark'
            ? 'bg-white dark:bg-forest shadow text-forest dark:text-sand border border-white/10'
            : 'text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
        }`}
        title="Dark Mode"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}
