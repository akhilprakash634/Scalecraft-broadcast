'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  className?: string;
}

export default function Stat({
  label,
  value,
  icon,
  description,
  trend,
  className = '',
}: StatProps) {
  return (
    <div
      className={`bg-white border border-border dark:bg-surface-1 dark:border-border p-5 rounded-xl shadow-xs flex flex-col justify-between hover:shadow-sm transition-all ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-text-muted dark:text-text-subtle uppercase tracking-wider font-sans">
            {label}
          </p>
          <h3 className="text-2xl font-black text-text-primary dark:text-text-primary tracking-tight font-sans">
            {value}
          </h3>
        </div>
        {icon && (
          <div className="p-2.5 rounded-lg bg-brand-light text-brand dark:bg-brand-light/10 shrink-0">
            {icon}
          </div>
        )}
      </div>
      {(trend || description) && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-text-muted dark:text-text-subtle">
          {trend && (
            <span
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                trend.isPositive
                  ? 'bg-success-bg text-success dark:bg-success-bg/10'
                  : 'bg-danger-bg text-danger dark:bg-danger-bg/10'
              }`}
            >
              {trend.isPositive ? (
                <ArrowUpRight size={10} />
              ) : (
                <ArrowDownRight size={10} />
              )}
              {trend.value}
            </span>
          )}
          {description && <span className="truncate">{description}</span>}
        </div>
      )}
    </div>
  );
}
