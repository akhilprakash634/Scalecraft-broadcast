'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export default function Skeleton({
  className = '',
  variant = 'rect',
}: SkeletonProps) {
  const baseClass = 'animate-pulse bg-surface-2 dark:bg-surface-2';
  const variantClasses = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'h-3 rounded w-3/4',
  };

  return (
    <div
      className={`${baseClass} ${variantClasses[variant]} ${className}`}
    />
  );
}

// Composite skeleton states for different elements
export function LeadListSkeleton() {
  return (
    <div className="divide-y divide-border dark:divide-border">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-4 flex items-center space-x-3">
          <Skeleton variant="circle" className="w-12 h-12 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatBubblesSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-start">
        <div className="bg-surface-1 border border-border rounded-[2px_12px_12px_12px] p-4 max-w-[60%] w-64 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-2 w-12 self-end" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="bg-brand-light border border-brand/10 dark:bg-brand/10 rounded-[12px_2px_12px_12px] p-4 max-w-[60%] w-64 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-2 w-12 self-end" />
        </div>
      </div>
      <div className="flex justify-start">
        <div className="bg-surface-1 border border-border rounded-[2px_12px_12px_12px] p-4 max-w-[60%] w-48 space-y-2">
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-2 w-12 self-end" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="bg-brand-light border border-brand/10 dark:bg-brand/10 rounded-[12px_2px_12px_12px] p-4 max-w-[60%] w-56 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-2 w-12 self-end" />
        </div>
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-5 space-y-3 dark:bg-surface-1">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-border rounded-xl p-6 space-y-4 dark:bg-surface-1">
          <Skeleton className="h-5 w-40" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border dark:border-border last:border-0">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-border rounded-xl p-6 space-y-4 dark:bg-surface-1">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
