import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'white';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-md border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs min-h-8 px-3 gap-1.5',
    md: 'text-sm min-h-10 px-4 gap-2',
    lg: 'text-base min-h-11 px-5 gap-2.5',
  };

  // Một màu nhấn (cyan); đỏ chỉ cho thao tác xóa/nguy hiểm.
  const variantStyles = {
    primary:
      'border-[var(--primary)] bg-[var(--primary)] text-[#071216] hover:border-[var(--primary-hover)] hover:bg-[var(--primary-hover)]',
    secondary:
      'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]',
    outline:
      'border-[var(--border)] bg-transparent text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]',
    ghost:
      'border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]',
    danger:
      'border-[#59323e] bg-[#301e28] text-[var(--danger)] hover:border-[var(--danger)]',
    white:
      'border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-0.5 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
