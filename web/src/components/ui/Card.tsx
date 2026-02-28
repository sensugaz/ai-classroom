'use client';

import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'gradient' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  accent?: 'indigo' | 'pink' | 'emerald' | 'amber' | 'violet';
}

const accentBorders: Record<string, string> = {
  indigo: 'border-t-4 border-t-indigo-400',
  pink: 'border-t-4 border-t-pink-400',
  emerald: 'border-t-4 border-t-emerald-400',
  amber: 'border-t-4 border-t-amber-400',
  violet: 'border-t-4 border-t-violet-400',
};

const variantClasses: Record<string, string> = {
  default: 'bg-white shadow-lg shadow-indigo-100/50',
  elevated: 'bg-white shadow-xl shadow-indigo-100/60',
  gradient: 'bg-gradient-to-br from-white to-indigo-50 shadow-lg shadow-indigo-100/50',
  outlined: 'bg-white border-2 border-indigo-100',
};

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  accent,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-3xl
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${accent ? accentBorders[accent] : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
