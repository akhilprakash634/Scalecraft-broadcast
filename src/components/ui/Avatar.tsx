'use client';

import React from 'react';
import { User } from 'lucide-react';


interface AvatarProps {
  name?: string;
  phone?: string;
  intent?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  statusOnline?: boolean;
  className?: string;
}

export default function Avatar({
  name = '',
  phone = '',
  intent = '',
  size = 'md',
  showStatus = false,
  statusOnline = false,
  className = '',
}: AvatarProps) {
  // Get initials
  let initials = 'SC';
  if (name && name !== '~' && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts[0]) {
      initials = parts[0].slice(0, 2).toUpperCase();
    }
  } else if (phone) {
    const cleaned = phone.replace(/\D/g, '');
    initials = cleaned.slice(-2);
  }

  // Intent colors (bg & text)
  let colorClass = 'bg-surface-2 text-text-secondary border border-border-strong';
  if (intent) {
    switch (intent.toLowerCase()) {
      case 'hot':
        colorClass = 'bg-red-50 text-danger border border-red-200 dark:bg-danger-bg dark:text-red-400 dark:border-red-900/50';
        break;
      case 'warm':
        colorClass = 'bg-amber-50 text-warning border border-amber-250 dark:bg-warning-bg dark:text-warning dark:border-warning/30';
        break;
      case 'converted':
        colorClass = 'bg-success-bg text-success border border-green-200 dark:bg-success-bg dark:text-success dark:border-success/30';
        break;
      case 'follow_up':
      case 'followup':
        colorClass = 'bg-info-bg text-info border border-blue-200 dark:bg-info-bg dark:text-info dark:border-info/30';
        break;
      case 'spam':
        colorClass = 'bg-gray-100 text-text-subtle border border-border dark:bg-surface-2 dark:text-text-subtle dark:border-border';
        break;
      default:
        colorClass = 'bg-surface-2 text-text-secondary border border-border-strong dark:bg-surface-2 dark:text-text-secondary dark:border-border';
    }
  }

  // Size classes
  const sizeClasses = {
    sm: 'w-8 h-8 text-[11px] font-bold',
    md: 'w-10 h-10 text-[13px] font-bold',
    lg: 'w-12 h-12 text-[15px] font-bold',
    xl: 'w-[60px] h-[60px] text-[18px] font-extrabold',
  };

  const isNumeric = !initials || /^\d+$/.test(initials) || initials === 'SC' || initials === 'WA';

  return (
    <div className={className ? className : 'relative shrink-0'}>
      <div
        className={`flex items-center justify-center rounded-full select-none ${colorClass} ${sizeClasses[size]}`}
      >
        {isNumeric ? (
          <User size={size === 'xl' ? 24 : size === 'lg' ? 20 : 16} className="shrink-0 opacity-80" />
        ) : (
          initials
        )}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-background ${
            statusOnline ? 'bg-success' : 'bg-text-subtle'
          }`}
        />
      )}
    </div>
  );
}
