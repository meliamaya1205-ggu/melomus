import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 mb-3.5 ${className}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-stone-100/80 text-stone-700 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-stone-900 tracking-tight truncate">
              {title}
            </h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-[11px] text-stone-500 font-medium truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1 group"
        >
          <span>{actionText}</span>
          <span className="text-stone-400 group-hover:text-stone-700 transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>
      )}
    </div>
  );
};
