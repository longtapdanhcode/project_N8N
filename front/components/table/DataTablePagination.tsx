'use client';

import React, { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  page,
  pageSize,
  total,
  totalPages,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const startRecord = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(page * pageSize, total);

  // Generate page numbers window around current page
  const pageNumbers = [];
  const delta = 1;
  const rangeStart = Math.max(1, page - delta);
  const rangeEnd = Math.min(totalPages, page + delta);

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs">
      {/* Information string with tabular nums */}
      <div className="text-slate-500 tabular-nums">
        Hiển thị <strong className="text-slate-800">{startRecord}</strong> -{' '}
        <strong className="text-slate-800">{endRecord}</strong> trên tổng số{' '}
        <strong className="text-slate-800">{total}</strong> bản ghi (Trang {page}/{totalPages || 1})
      </div>

      {/* Pagination button group */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <button
          onClick={() => handlePageChange(1)}
          disabled={page <= 1 || isPending}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang đầu"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous page */}
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1 || isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Trước</span>
        </button>

        {/* Page numbers */}
        {rangeStart > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 tabular-nums font-medium cursor-pointer"
            >
              1
            </button>
            {rangeStart > 2 && <span className="px-1 text-slate-400">...</span>}
          </>
        )}

        {pageNumbers.map((num) => (
          <button
            key={num}
            onClick={() => handlePageChange(num)}
            disabled={isPending}
            className={`w-8 h-8 rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
              num === page
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {num}
          </button>
        ))}

        {rangeEnd < totalPages && (
          <>
            {rangeEnd < totalPages - 1 && <span className="px-1 text-slate-400">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 tabular-nums font-medium cursor-pointer"
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next page */}
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages || isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
        >
          <span>Sau</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last page */}
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={page >= totalPages || isPending}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang cuối"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
