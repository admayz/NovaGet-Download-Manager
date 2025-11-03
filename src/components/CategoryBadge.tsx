'use client';

import { getCategoryIcon, getCategoryColors, FileCategory } from './CategoryFilter';

interface CategoryBadgeProps {
  category: FileCategory;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function CategoryBadge({
  category,
  size = 'md',
  showLabel = true,
  className = '',
}: CategoryBadgeProps) {
  const Icon = getCategoryIcon(category);
  const colors = getCategoryColors(category);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (!showLabel) {
    return (
      <div
        className={`
          inline-flex items-center justify-center rounded-full
          ${colors.bg} ${colors.text}
          ${sizeClasses[size]}
          ${className}
        `}
        title={category}
      >
        <Icon className={iconSizes[size]} />
      </div>
    );
  }

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${colors.bg} ${colors.text}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <Icon className={iconSizes[size]} />
      <span>{category}</span>
    </div>
  );
}
