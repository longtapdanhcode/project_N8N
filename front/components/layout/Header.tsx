'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  User,
  LogOut,
  HelpCircle,
  Sparkles,
  Command,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  activeTitle,
}) => {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 flex items-center justify-between transition-all">
      {/* Left: Hamburger & Breadcrumb Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Đóng / mở thanh điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">
            Học vụ & Đào tạo /
          </span>
          <h1 className="text-base font-bold text-slate-900">{activeTitle}</h1>
        </div>
      </div>

      {/* Middle: Quick Search Input */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                router.push(`/students?search=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            placeholder="Tìm theo MSSV, Họ tên, Lớp học... (Nhấn Enter)"
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-lg border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 pl-9 pr-14 py-2 transition-all outline-none"
          />
          <div className="absolute right-2.5 flex items-center gap-0.5 pointer-events-none text-[11px] font-semibold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right: Semester Badge, Notifications, User Menu */}
      <div className="flex items-center gap-3" ref={menuRef}>
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200/80">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span>Học kỳ 1 (2026 - 2027)</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationOpen(!notificationOpen);
              setUserMenuOpen(false);
            }}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Thông báo học vụ"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 font-bold text-slate-900 border-b border-slate-100 flex items-center justify-between">
                <span>Thông báo tự động (n8n & AI)</span>
                <span className="text-[10px] text-blue-600 font-semibold cursor-pointer">
                  Đánh dấu đã đọc
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                <div className="p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    Cảnh báo cấm thi điểm danh
                  </div>
                  <p className="text-slate-600 mt-1">
                    Sinh viên <strong>22GIT045</strong> đã vắng quá 21% số tiết học phần Hệ thống
                    phân tán.
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">15 phút trước</span>
                </div>
                <div className="p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-1.5 text-blue-600 font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Đánh giá đồ án tự động
                  </div>
                  <p className="text-slate-600 mt-1">
                    Worker BullMQ đã hoàn thành phân tích Milestone 2 đề tài Trợ lý RAG AI.
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">1 giờ trước</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Account Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotificationOpen(false);
            }}
            className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              NH
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                TS. Nguyễn Văn Hùng
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Khoa Khoa học Máy tính
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-bold text-slate-900">TS. Nguyễn Văn Hùng</p>
                <p className="text-[11px] text-slate-500">hungnv@vku.udn.vn</p>
                <span className="mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  Cố vấn học vụ & Giảng viên
                </span>
              </div>

              <div className="py-1">
                <button className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hồ sơ giảng viên</span>
                </button>
                <button className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Quy chế học vụ VKU</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium">
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
