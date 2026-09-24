import React from 'react';

interface AvatarProps {
  name: string;
  emoji?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  emoji,
  color = '#f59e0b',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-3xl',
  };

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl font-bold text-white shadow-sm flex-shrink-0 transition-transform select-none ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {emoji ? <span>{emoji}</span> : <span>{initial}</span>}
    </div>
  );
};
