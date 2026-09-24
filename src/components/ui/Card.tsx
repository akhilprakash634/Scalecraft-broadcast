'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'ghost' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const variantStyles = {
    default: 'bg-white border border-border dark:bg-surface-1 dark:border-border rounded-xl shadow-xs',
    ghost: 'bg-transparent border border-transparent rounded-xl',
    elevated: 'bg-white border border-border dark:bg-surface-1 dark:border-border rounded-xl shadow-md',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
