import React from 'react';

interface LifestyleCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'white' | 'muted' | 'subtle';
}

export const LifestyleCard: React.FC<LifestyleCardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'white',
}) => {
  const variantStyles = {
    white: 'bg-white border-stone-200/70 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)]',
    muted: 'bg-[#f7f5ef] border-[#e8e2d5] shadow-none',
    subtle: 'bg-white/70 backdrop-blur-xs border-stone-200/50 shadow-none',
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`rounded-3xl p-4 sm:p-5 border transition-all duration-150 ${variantStyles} ${
        onClick ? 'cursor-pointer hover:border-stone-300' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
