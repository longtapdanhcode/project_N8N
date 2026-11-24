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
  // (adjust state during render instead of an effect).
  const [prevSearch, setPrevSearch] = useState(currentSearch);
  if (currentSearch !== prevSearch) {
    setPrevSearch(currentSearch);
    setSearchValue(currentSearch);
  }

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
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(currentSearch || currentClass || currentStatus);

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg mb-4 text-xs">
      {/* Left: Search input with debounce */}
      <div className="relative w-full sm:w-80">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-[var(--bg)] hover:border-[var(--primary)] text-[var(--text)] placeholder:text-[var(--muted)] text-xs rounded-md border border-[var(--border)] hover:border-[var(--primary)] focus:border-[var(--primary)] pl-9 pr-8 py-2 outline-none transition-colors"
        />
        {searchValue && (
          <button
            onClick={() => setSearchValue('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--primary)] cursor-pointer"
            aria-label="Xóa tìm kiếm"
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
            className="bg-[var(--bg)] text-[var(--text)] text-xs border border-[var(--border)] rounded-md px-3 py-2 outline-none focus:border-[var(--primary)] hover:border-[var(--primary)] transition-colors cursor-pointer"
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
            className="bg-[var(--bg)] text-[var(--text)] text-xs border border-[var(--border)] rounded-md px-3 py-2 outline-none focus:border-[var(--primary)] hover:border-[var(--primary)] transition-colors cursor-pointer"
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
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] border border-[var(--border)] text-xs font-medium transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Xóa lọc</span>
          </button>
        )}

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--primary-soft)] text-[var(--text)] hover:text-[var(--primary)] border border-[var(--border)] text-xs font-medium transition-colors cursor-pointer"
            title="Xuất dữ liệu ra file CSV tương thích Excel"
          >
            <Download className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span>{exportLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
