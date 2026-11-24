import React from 'react';
import { CheckCircle2, TriangleAlert } from 'lucide-react';

/** Thông báo ngắn góc dưới phải; lỗi dùng màu đỏ và role="alert". */
export function Toast({ message, tone = 'success' }: { message: string; tone?: 'success' | 'error' }) {
  const error = tone === 'error';
  const Icon = error ? TriangleAlert : CheckCircle2;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-lg border bg-[var(--surface)] px-4 py-3 text-xs ${
        error ? 'border-[#59323e] text-[var(--danger)]' : 'border-[var(--border)] text-[var(--text)]'
      }`}
    >
      <Icon className={`mt-px h-4 w-4 shrink-0 ${error ? '' : 'text-[var(--primary)]'}`} strokeWidth={1.5} />
      <span>{message}</span>
    </div>
  );
}
