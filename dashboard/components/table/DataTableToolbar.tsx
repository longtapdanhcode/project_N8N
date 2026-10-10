'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X, Loader2, Download } from 'lucide-react';

interface DataTableToolbarProps {
  searchPlaceholder?: string;
  classList?: string[];
  showClassFilter?: boolean;
  statusOptions?: { label: string; value: string }[];
  showStatusFilter?: boolean;
  onExport?: () => void;
  exportLabel?: string;
}

export const DataTableToolbar: React.FC<DataTableToolbarProps> = ({
  searchPlaceholder = 'Tìm kiếm...',
  classList = [],
  showClassFilter = true,
  statusOptions = [],
  showStatusFilter = false,
  onExport,
  exportLabel = 'Xuất CSV',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get('search') || '';
  const currentClass = searchParams.get('classId') || '';
  const currentStatus = searchParams.get('status') || '';

  const [searchValue, setSearchValue] = useState(currentSearch);

  // Sync internal input value with URL searchParam if URL changes from outside
  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  // Debounce search update (300ms)
  useEffect(() => {
    // Avoid triggering if value hasn't actually changed compared to URL
    if (searchValue === currentSearch) return;

    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchValue.trim()) {
        params.set('search', searchValue.trim());
      } else {
        params.delete('search');
      }
      params.set('page', '1'); // Reset to page 1 on new search

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [searchValue, currentSearch, pathname, router, searchParams]);

  const handleClassChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('classId', val);
    } else {
      params.delete('classId');
    }
    params.set('page', '1');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleStatusChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('status', val);
    } else {
      params.delete('status');
    }
    params.set('page', '1');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    setSearchValue('');
    const params = new URLSearchParams();
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(currentSearch || currentClass || currentStatus);

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl mb-4 text-xs">
      {/* Left: Search input with debounce */}
      <div className="relative w-full sm:w-80">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 placeholder:text-slate-400 text-xs rounded-lg border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 pl-9 pr-8 py-2 outline-none transition-all"
        />
        {searchValue && (
          <button
            onClick={() => setSearchValue('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            title="Xóa tìm kiếm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right: Filters & Clear */}
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
        {showClassFilter && classList.length > 0 && (
          <select
            value={currentClass}
            onChange={(e) => handleClassChange(e.target.value)}
            className="bg-slate-50 text-slate-700 text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <option value="">Tất cả lớp sinh hoạt</option>
            {classList.map((cls) => (
              <option key={cls} value={cls}>
                Lớp {cls}
              </option>
            ))}
          </select>
        )}

        {showStatusFilter && statusOptions.length > 0 && (
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-slate-50 text-slate-700 text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Xóa lọc</span>
          </button>
        )}

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            title="Xuất dữ liệu ra file CSV tương thích Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{exportLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
