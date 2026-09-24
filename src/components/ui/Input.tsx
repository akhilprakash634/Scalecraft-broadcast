'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({
  label,
  error,
  className = '',
  id,
  type = 'text',
  ...props
}: InputProps) {
  const inputId = id || React.useId();

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[10px] font-black text-text-muted dark:text-text-subtle uppercase tracking-wider font-sans"
        >
          {label}
        </label>
      )}
      <input
        type={type}
        id={inputId}
        className={`w-full text-xs font-semibold px-3 py-2.5 bg-white dark:bg-surface-0 border border-border dark:border-border rounded-lg outline-none text-text-primary placeholder-text-subtle focus:border-brand focus:ring-1 focus:ring-brand/35 transition-all ${
          error ? 'border-danger focus:border-danger focus:ring-danger/25' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-[10px] font-semibold text-danger">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  className?: string;
}

export function Textarea({
  label,
  error,
  className = '',
  id,
  rows = 3,
  ...props
}: TextareaProps) {
  const textareaId = id || React.useId();

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-[10px] font-black text-text-muted dark:text-text-subtle uppercase tracking-wider font-sans"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`w-full text-xs font-semibold px-3 py-2.5 bg-white dark:bg-surface-0 border border-border dark:border-border rounded-lg outline-none text-text-primary placeholder-text-subtle focus:border-brand focus:ring-1 focus:ring-brand/35 transition-all resize-y ${
          error ? 'border-danger focus:border-danger focus:ring-danger/25' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-[10px] font-semibold text-danger">{error}</p>
      )}
    </div>
  );
}
