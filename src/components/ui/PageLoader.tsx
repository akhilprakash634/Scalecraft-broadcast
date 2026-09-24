import React from 'react';

/** Pulsing skeleton block */
export function SkeletonBlock({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gradient-to-r from-[#F0F0EE] via-[#E8E8E5] to-[#F0F0EE] bg-[length:400%_100%] ${className}`}
      style={{ animation: 'shimmer 1.6s ease-in-out infinite' }}
    />
  );
}

/** Full-page spinner overlay used on the login redirect */
export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F8FBF8]">
      <span className="relative flex h-12 w-12">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1B5E20] opacity-20" />
        <span className="relative inline-flex rounded-full h-12 w-12 items-center justify-center border-4 border-[#E0E0E0] border-t-[#1B5E20] animate-spin" />
      </span>
      <p className="text-sm font-semibold text-[#757575] tracking-wide">{label}</p>
    </div>
  );
}

/** Dashboard-page skeleton: header + 4 stat cards + two panels */
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page heading */}
      <div className="space-y-2">
        <SkeletonBlock className="h-7 w-48" />
        <SkeletonBlock className="h-4 w-72" />
      </div>

      {/* 4-column stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E0E0E0] p-6 space-y-3">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-8 w-32" />
            <SkeletonBlock className="h-3 w-40" />
          </div>
        ))}
      </div>

      {/* Two-column lower panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E0E0E0] p-6 space-y-4">
          <SkeletonBlock className="h-5 w-36" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-[#F0F0EE] last:border-0">
              <div className="space-y-1.5">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-3 w-56" />
              </div>
              <SkeletonBlock className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 space-y-4">
          <SkeletonBlock className="h-5 w-28" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <SkeletonBlock key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Simple list-page skeleton: header + table rows */
export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="h-4 w-60" />
        </div>
        <SkeletonBlock className="h-10 w-28 rounded-lg" />
      </div>
      <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F0F0EE]">
          <SkeletonBlock className="h-4 w-48" />
        </div>
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-[#F0F0EE] last:border-0 flex items-center justify-between">
            <div className="space-y-1.5 flex-1">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="h-3 w-52" />
            </div>
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Form-page skeleton: header + big textarea card */
export function FormPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <SkeletonBlock className="h-7 w-44" />
        <SkeletonBlock className="h-4 w-64" />
      </div>
      <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 space-y-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-28 rounded-lg" />
          </div>
        ))}
        <SkeletonBlock className="h-11 w-40 rounded-lg" />
      </div>
    </div>
  );
}
