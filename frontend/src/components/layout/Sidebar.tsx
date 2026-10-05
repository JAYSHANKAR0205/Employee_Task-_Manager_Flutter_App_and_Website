/**
 * @file Sidebar.tsx
 * @description Enterprise Collapsible Side Navigation Component.
 */

import { NavLink } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Users, User, CalendarDays, ShieldCheck, ChevronLeft, ChevronRight, X, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar = ({ isCollapsed, onToggle, isMobileOpen = false, onMobileClose }: SidebarProps) => {
  const { user, logout } = useAuth();

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Tasks",
      path: "/tasks",
      icon: ClipboardList,
    },
    ...(user?.role === 'Admin' ? [
      {
        name: "Leave Portal",
        path: "/admin/leaves",
        icon: ShieldCheck,
      },
      {
        name: "All Users",
        path: "/employees",
        icon: Users,
      }
    ] : [
      {
        name: "My Leaves",
        path: "/leaves",
        icon: CalendarDays,
      }
    ]),
    {
      name: "Profile",
      path: "/profile",
      icon: User,
    }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay & Sidebar */}
      {isMobileOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
            onClick={onMobileClose}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-left-5 lg:hidden"
          >
            {/* Drawer Header */}
            <div className="flex h-20 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-sm font-bold text-white shadow-xs">
                  ET
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-base">Task Manager</span>
              </div>
              <button
                onClick={onMobileClose}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-2 px-4 py-6 flex-1 overflow-y-auto custom-scrollbar">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      `flex items-center rounded-xl px-4 py-3.5 transition-all font-semibold text-sm ${
                        isActive
                          ? "bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white shadow-md shadow-[#ea4c89]/20"
                          : "text-gray-700 hover:bg-[#ea4c89]/10 hover:text-[#ea4c89] dark:text-gray-300 dark:hover:bg-slate-800/50 dark:hover:text-[#ea4c89]"
                      }`
                    }
                  >
                    <IconComponent size={20} className="shrink-0" />
                    <span className="ml-3.5">{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Mobile Bottom Logout */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 shrink-0 mt-auto">
              <button
                onClick={() => {
                  if (onMobileClose) onMobileClose();
                  logout();
                }}
                className="flex items-center w-full px-4 py-3.5 rounded-xl font-semibold text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
              >
                <LogOut size={20} className="shrink-0" />
                <span className="ml-3.5">Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 shrink-0 z-30 transition-all duration-300 ease-in-out h-[calc(100vh-80px)] ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-200/80 dark:border-gray-800/80 shrink-0">
          {!isCollapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 pl-2 transition-opacity duration-200">
              Menu
            </span>
          )}
          <button
            onClick={onToggle}
            className={`p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-[#ea4c89] dark:hover:text-[#ea4c89] bg-gray-100/80 dark:bg-slate-800/80 hover:bg-[#ea4c89]/10 transition-all duration-300 cursor-pointer flex items-center justify-center ${
              isCollapsed ? 'w-full' : ''
            }`}
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Item Links */}
        <nav className="flex flex-col gap-2.5 py-4 px-3 flex-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group relative flex items-center rounded-xl transition-all duration-200 ${
                    isCollapsed ? 'justify-center h-12 w-full px-0' : 'px-4 py-3 w-full'
                  } ${
                    isActive
                      ? "bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white shadow-md shadow-[#ea4c89]/20 font-bold"
                      : "text-gray-700 hover:bg-[#ea4c89]/10 hover:text-[#ea4c89] dark:text-gray-300 dark:hover:bg-slate-800/60 dark:hover:text-[#ea4c89] font-semibold"
                  }`
                }
              >
                <IconComponent size={20} className="shrink-0" />
                
                {!isCollapsed && (
                  <span className="ml-3.5 text-sm truncate whitespace-nowrap transition-opacity duration-200">
                    {item.name}
                  </span>
                )}
                
                {isCollapsed && (
                  <div className="absolute left-16 z-50 hidden group-hover:flex items-center pointer-events-none">
                    <div className="bg-gray-900 dark:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-gray-800 dark:border-gray-700 animate-in fade-in zoom-in-95">
                      {item.name}
                    </div>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Dedicated Logout Button Section */}
        <div className="p-3 border-t border-gray-200/80 dark:border-gray-800/80 shrink-0 mt-auto">
          <button
            onClick={logout}
            className={`group relative flex items-center rounded-xl transition-all duration-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200/60 dark:hover:border-red-900/40 font-semibold cursor-pointer ${
              isCollapsed ? 'justify-center h-12 w-full px-0' : 'px-4 py-3 w-full'
            }`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && (
              <span className="ml-3.5 text-sm truncate whitespace-nowrap">
                Logout
              </span>
            )}
            {isCollapsed && (
              <div className="absolute left-16 z-50 hidden group-hover:flex items-center pointer-events-none">
                <div className="bg-gray-900 dark:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-gray-800 dark:border-gray-700 animate-in fade-in zoom-in-95">
                  Logout
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
