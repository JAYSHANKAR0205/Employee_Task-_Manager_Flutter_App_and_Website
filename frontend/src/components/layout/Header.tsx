/**
 * @file Header.tsx
 * @description Enterprise Top Navigation Bar Component.
 */

import { useState, useRef, useEffect } from "react";
import { Menu, User as UserIcon, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../ThemeToggle";
import NotificationDropdown from "../NotificationDropdown";
import { useAuth } from "../../contexts/AuthContext";

interface HeaderProps {
  onMenuClick?: () => void;
}

const formatHeaderName = (rawName?: string, maxChars: number = 10): string => {
  if (!rawName) return 'User';
  const trimmed = rawName.trim();
  if (!trimmed) return 'User';
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return trimmed.slice(0, maxChars) + '...';
};

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getInitials = () => {
    if (!user) return 'AU';
    const first = user.firstName ? user.firstName.trim().charAt(0).toUpperCase() : '';
    const last = user.lastName ? user.lastName.trim().charAt(0).toUpperCase() : '';
    return (first + last) || 'AU';
  };

  const getHeaderDisplayName = () => {
    if (!user) return 'User';
    let nameStr = '';
    if (user.firstName || user.lastName) {
      nameStr = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    } else if (user.email) {
      nameStr = user.email.split('@')[0];
    } else {
      nameStr = 'User';
    }
    return formatHeaderName(nameStr, 10);
  };

  return (
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b border-gray-200 bg-white px-6 shadow-xs transition-colors duration-300 dark:border-gray-800 dark:bg-slate-900 shrink-0">
      {/* Left Side: Top-Left ET Logo & Brand Title */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition lg:hidden cursor-pointer"
            aria-label="Toggle menu"
            title="Toggle menu"
          >
            <Menu size={22} />
          </button>
        )}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-lg font-bold text-white shadow-md">
          ET
        </div>

        <div className="flex flex-col">
          <h1 className="text-[17px] font-bold text-gray-900 dark:text-white leading-tight">
            Employee Task Manager
          </h1>
        </div>
      </div>

      <div className="hidden flex-1 lg:block"></div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        
        {/* Inline Theme Toggle Component */}
        <ThemeToggle />

        {/* Real-time Notification Dropdown */}
        <NotificationDropdown />

        {/* User Profile Dropdown */}
        <div className="flex items-center gap-3 ml-2" ref={dropdownRef}>
          {/* User Name & Role Display (always visible to the left of the avatar) */}
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="hidden sm:flex flex-col text-right hover:opacity-80 transition-opacity focus:outline-none cursor-pointer group"
            aria-label="Toggle profile menu"
          >
            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight group-hover:text-[#ea4c89] transition-colors max-w-[200px] truncate">
              {getHeaderDisplayName()}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 capitalize">
              {user?.role || 'Employee'}
            </span>
          </button>

          {/* Profile Avatar & Dropdown Anchor */}
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
              aria-label="User Profile"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-[#ea4c89] to-[#a855f7] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-slate-800 overflow-hidden shrink-0">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  getInitials()
                )}
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-56 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 transform origin-top-right transition-all">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                    {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'User'}
                  </h3>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role || 'Employee'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-2 cursor-pointer"
                >
                  <UserIcon size={16} />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
