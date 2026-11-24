'use client';

import React, { useTransition } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTablePagination } from './DataTablePagination';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  total,
  page,
  pageSize,
  totalPages,
  isLoading = false,
  error = null,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription = 'Không tìm thấy bản ghi nào phù hợp với bộ lọc tìm kiếm hiện tại.',
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSort = searchParams.get('sort') || '';
  const currentOrder = (searchParams.get('order') || 'asc') as 'asc' | 'desc';

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  const handleSort = (columnId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (currentSort === columnId) {
      if (currentOrder === 'asc') {
        params.set('order', 'desc');
      } else {
        // Clear sort
        params.delete('sort');
        params.delete('order');
      }
    } else {
      params.set('sort', columnId);
      params.set('order', 'asc');
    }

    params.set('page', '1');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Error State Banner */}
      {error && (
        <div className="p-4 bg-[#301e28] border-b border-[#59323e] text-xs text-[var(--danger)] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container with Sticky Header */}
      <div className="overflow-x-auto relative max-h-[calc(100vh-260px)]">
        <table className="w-full text-left text-xs border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-[var(--bg)] border-b border-[var(--border)] select-none">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.columnDef.enableSorting !== false;
                  const columnId = header.column.id;
                  const isSorted = currentSort === columnId;

                  return (
                    <th
                      key={header.id}
                      className="py-3 px-4 font-semibold text-[var(--text)] whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : isSortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(columnId)}
                          disabled={isPending}
                          className="group inline-flex items-center gap-1.5 hover:text-[var(--primary)] transition-colors cursor-pointer"
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          <span className="text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors">
                            {isSorted ? (
                              currentOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-[var(--primary)]" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-[var(--primary)]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                            )}
                          </span>
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[var(--border)]">
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: pageSize || 10 }).map((_, rIdx) => (
                <tr key={rIdx} className="border-b border-[var(--border)]">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="py-3.5 px-4">
                      <Skeleton className="h-4 w-4/5" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={`hover:bg-[var(--primary-soft)] transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-3 px-4 text-[var(--text)]">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              // Empty State Row
              <tr>
                <td colSpan={columns.length} className="p-0 text-center">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && (
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}
