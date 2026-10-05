import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center bg-gray-200/80 dark:bg-black/40 backdrop-blur-md rounded-full p-1 border border-gray-300 dark:border-white/20 shadow-sm">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`p-2 rounded-full transition-all ${
          theme === 'light'
            ? 'bg-white dark:bg-gray-700 shadow text-forest dark:text-white'
            : 'text-gray-500 dark:text-white/60 hover:text-forest dark:hover:text-white hover:bg-gray-300/50 dark:hover:bg-white/10'
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
            ? 'bg-white dark:bg-gray-700 shadow text-forest dark:text-white'
            : 'text-gray-500 dark:text-white/60 hover:text-forest dark:hover:text-white hover:bg-gray-300/50 dark:hover:bg-white/10'
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
            ? 'bg-white dark:bg-gray-700 shadow text-forest dark:text-white border-transparent'
            : 'text-gray-500 dark:text-white/60 hover:text-forest dark:hover:text-white hover:bg-gray-300/50 dark:hover:bg-white/10'
        }`}
        title="Dark Mode"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}
