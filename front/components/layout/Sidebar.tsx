'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  BookOpenCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  ClipboardList,
} from 'lucide-react';

export type NavTab = 'overview' | 'students' | 'attendance' | 'thesis' | 'submissions' | 'documents' | 'settings';

interface SidebarProps {
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  badgeCounts?: {
    attendanceWarning?: number;
    thesisActive?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  badgeCounts = {},
}) => {
  const pathname = usePathname();

  const navItems: {
    id: NavTab;
    label: string;
    href: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'overview',
      label: 'Tổng quan',
      href: '/teacher',
      icon: <LayoutDashboard className="w-5 h-5 flex-shrink-0" />,
    },
    {
      id: 'students',
      label: 'Sinh viên',
      href: '/teacher/students',
      icon: <Users className="w-5 h-5 flex-shrink-0" />,
    },
    {
      id: 'attendance',
      label: 'Điểm danh',
      href: '/teacher/attendance',
      icon: <CalendarCheck2 className="w-5 h-5 flex-shrink-0" />,
      badge: badgeCounts.attendanceWarning,
    },
    {
      id: 'thesis',
      label: 'Đồ án tốt nghiệp',
      href: '/teacher/projects',
      icon: <BookOpenCheck className="w-5 h-5 flex-shrink-0" />,
      badge: badgeCounts.thesisActive,
    },
    {
      id: 'submissions',
      label: 'Bài tập',
      href: '/teacher/submissions',
      icon: <ClipboardList className="w-5 h-5 flex-shrink-0" />,
    },
    {
      id: 'documents',
      label: 'Kho tài liệu',
      href: '/teacher/documents',
      icon: <BookOpenCheck className="w-5 h-5 flex-shrink-0" />,
    },
    {
      id: 'settings',
      label: 'Cài đặt',
      href: '/teacher/settings',
      icon: <Settings className="w-5 h-5 flex-shrink-0" />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen z-40 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out select-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-20' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          <Link
            href="/"
            className={`flex items-center gap-3 overflow-hidden cursor-pointer ${
              collapsed ? 'md:justify-center w-full' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-bold tracking-tight text-slate-900 leading-tight">
                  VKU ACADEMIC
                </span>
                <span className="text-[11px] font-medium text-slate-500 truncate">
                  AI Student Support
                </span>
              </div>
            )}
          </Link>
        </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
        {!collapsed && (
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Học vụ & Đào tạo
          </div>
        )}

        {navItems.map((item) => {
          const isRouteActive =
            item.href === '/'
              ? pathname === '/' && (!activeTab || activeTab === 'overview')
              : pathname.startsWith(item.href);

          const isActive = activeTab ? activeTab === item.id : isRouteActive;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => {
                if (onSelectTab) onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                collapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
              } ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    item.id === 'attendance'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer & Toggle Collapse Button */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex flex-col gap-2">
        {!collapsed && (
          <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hệ thống AI sẵn sàng</span>
            </div>
            <p className="text-[11px] text-slate-500">NestJS 12 • Gemini 2.5 • RRF</p>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors text-xs font-medium cursor-pointer"
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              <span>Thu gọn thanh điều hướng</span>
            </div>
          )}
        </button>
      </div>
    </aside>
    </>
  );
};
