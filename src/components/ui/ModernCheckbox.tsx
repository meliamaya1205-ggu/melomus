import React from 'react';
import { Check } from 'lucide-react';

interface ModernCheckboxProps {
  checked: boolean;
  onChange: () => void;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

export const ModernCheckbox: React.FC<ModernCheckboxProps> = ({
  checked,
  onChange,
  size = 'md',
  ariaLabel = 'Marcar como completado',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex items-center justify-center rounded-full border transition-all duration-150 cursor-pointer shrink-0 select-none ${sizeClasses} ${
        checked
          ? 'bg-[#1b382b] border-[#1b382b] text-white shadow-2xs'
          : 'border-stone-300/90 bg-white/80 hover:border-stone-400 hover:bg-stone-50'
      } ${className}`}
    >
      {checked && <Check className={`${iconSize} stroke-[2.5]`} />}
    </button>
  );
};
