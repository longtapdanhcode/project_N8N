import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-[var(--text)] select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[var(--muted)] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted)] text-sm rounded-md border transition-colors duration-150 py-2 ${
              leftIcon ? 'pl-9' : 'pl-3.5'
            } ${rightIcon ? 'pr-9' : 'pr-3.5'} ${
              error
                ? 'border-[var(--danger)]'
                : 'border-[var(--border)] focus:border-[var(--primary)]'
            } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            aria-invalid={error ? true : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[var(--muted)] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <span className="text-xs font-medium text-[var(--danger)]">{error}</span>}
        {!error && helperText && <span className="text-xs text-[var(--muted)]">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
