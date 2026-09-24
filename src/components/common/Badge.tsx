import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  color?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  color,
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 rounded-full font-medium',
    md: 'text-sm px-3 py-1 rounded-full font-medium',
  };

  const variantClasses = {
    primary: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    secondary: 'bg-purple-50 text-purple-700 border border-purple-200/60',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    danger: 'bg-red-50 text-red-700 border border-red-200/60',
    info: 'bg-sky-50 text-sky-700 border border-sky-200/60',
    neutral: 'bg-stone-100 text-stone-700 border border-stone-200/60',
  };

  const customStyle = color
    ? {
        backgroundColor: `${color}18`,
        color: color,
        borderColor: `${color}35`,
      }
    : undefined;

  return (
    <span
      style={customStyle}
      className={`inline-flex items-center gap-1 leading-none ${sizeClasses[size]} ${
        color ? 'border' : variantClasses[variant]
      } ${className}`}
    >
      {children}
    </span>
  );
};
