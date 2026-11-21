import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    // Phẳng, không khung lồng trong bảng hay card.
    <div
      className={`flex flex-col items-center justify-center px-4 py-10 text-center ${className}`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)]">
        {icon || <Inbox className="h-5 w-5" strokeWidth={1.5} />}
      </div>
      <h3 className="mb-1 text-sm font-semibold text-[var(--text)]">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-xs leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};
