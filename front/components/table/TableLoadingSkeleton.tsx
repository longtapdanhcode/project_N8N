import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export const TableLoadingSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 10,
  cols = 6,
}) => {
  return (
    <div role="status" aria-label="Đang tải dữ liệu" className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="p-3.5 border-b border-[var(--border)] flex items-center justify-between">
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-8 w-40 rounded-md" />
      </div>
      <div className="divide-y divide-[var(--border)] p-2">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="py-3.5 px-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton key={cIdx} className="h-4 flex-1 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
