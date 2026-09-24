'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'default';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-surface-2 text-text-secondary border border-border dark:bg-surface-2 dark:text-text-secondary dark:border-border',
    success: 'bg-success-bg text-success border border-green-200 dark:bg-success-bg/30 dark:text-success dark:border-success/30',
    warning: 'bg-warning-bg text-warning border border-amber-200 dark:bg-warning-bg/30 dark:text-warning dark:border-warning/30',
    danger: 'bg-danger-bg text-danger border border-red-200 dark:bg-danger-bg/30 dark:text-danger dark:border-danger/30',
    info: 'bg-info-bg text-info border border-blue-200 dark:bg-info-bg/30 dark:text-info dark:border-info/30',
    brand: 'bg-brand-light text-brand-dark border border-brand/20 dark:bg-brand-light/10 dark:text-brand dark:border-brand/30',
  };

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider',
    md: 'text-[10px] px-2.5 py-1 font-bold uppercase tracking-wider',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md font-sans transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}
