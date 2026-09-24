'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const baseStyle =
    'inline-flex items-center justify-center font-sans font-bold transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98';

  const variantStyles = {
    primary:
      'bg-brand hover:bg-brand-dark text-white shadow-sm focus:ring-2 focus:ring-brand/50',
    secondary:
      'bg-brand-light hover:bg-brand-light/80 text-brand-dark focus:ring-2 focus:ring-brand/20 dark:bg-brand/10 dark:text-brand dark:hover:bg-brand/20',
    outline:
      'bg-white hover:bg-surface-0 border border-border text-text-secondary focus:ring-2 focus:ring-border dark:bg-transparent dark:hover:bg-surface-2 dark:text-text-primary dark:border-border',
    ghost:
      'hover:bg-surface-2 text-text-secondary hover:text-text-primary dark:hover:bg-surface-2 dark:text-text-muted dark:hover:text-text-primary',
    danger:
      'bg-danger hover:bg-danger/90 text-white shadow-sm focus:ring-2 focus:ring-danger/50',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-3 py-1.5 rounded-md gap-1.5',
    md: 'text-xs px-4.5 py-2.5 rounded-lg gap-2',
    lg: 'text-sm px-6 py-3.5 rounded-xl gap-2.5',
  };

  return (
    <button
      type={type}
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin shrink-0" size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
}
