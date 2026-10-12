import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export const TableLoadingSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 10,
  cols = 6,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden space-y-0">
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>
      <div className="divide-y divide-slate-100 p-2">
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
