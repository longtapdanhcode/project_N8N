import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  dot?: boolean;
  size?: 'sm' | 'md';
}

/*
 * Màu theo quy tắc thiết kế: cyan cho trạng thái tốt/đang chọn, đỏ cho lỗi và cấm thi,
 * vàng nhạt chỉ cho cảnh báo điểm danh. Chữ trong badge luôn nói rõ trạng thái,
 * nên không phụ thuộc vào màu.
 */
const variantStyles = {
  primary: 'border-[#25515c] bg-[var(--primary-soft)] text-[var(--primary)]',
  success: 'border-[#25515c] bg-[var(--primary-soft)] text-[var(--primary)]',
  warning: 'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'border-[#59323e] bg-[#301e28] text-[var(--danger)]',
  neutral: 'border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]',
};

const dotStyles = {
  primary: 'bg-[var(--primary)]',
  success: 'bg-[var(--primary)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
  neutral: 'bg-[var(--muted)]',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border font-medium ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dotStyles[variant]}`} />}
      {children}
    </span>
  );
};
