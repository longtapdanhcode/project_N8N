'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardShellProps {
  children: React.ReactNode;
  activeTitle: string;
  badgeCounts?: {
    attendanceWarning?: number;
    thesisActive?: number;
  };
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  children,
  activeTitle,
  badgeCounts,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleSidebar = () => {
    // If mobile screen, toggle mobile drawer; else toggle collapse
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        badgeCounts={badgeCounts}
      />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out pl-0 ${
          sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <Header
          onToggleSidebar={handleToggleSidebar}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTitle={activeTitle}
        />
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-4">
          {children}
        </main>
      </div>
    </div>
  );
};
