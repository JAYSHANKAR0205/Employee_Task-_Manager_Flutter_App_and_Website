/**
 * @file DashboardLayout.tsx
 * @description Main Enterprise Dashboard Shell & Layout Wrapper Component.
 */

import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
  const toggleMobile = () => setIsMobileOpen(prev => !prev);
  const closeMobile = () => setIsMobileOpen(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200 font-sans">
      {/* Top Navigation Header Bar */}
      <Header onMenuClick={toggleMobile} />

      {/* Main Body Shell (Sidebar + Content View) */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          isMobileOpen={isMobileOpen}
          onMobileClose={closeMobile}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar relative z-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
