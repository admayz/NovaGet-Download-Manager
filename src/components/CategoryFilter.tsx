'use client';

import { useMemo } from 'react';
import {
  FilmIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  PhotoIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

export type FileCategory =
  | 'Video'
  | 'Müzik'
  | 'Yazılım'
  | 'Belge'
  | 'Arşiv'
  | 'Resim'
  | 'Diğer'
  | 'all';

interface CategoryFilterProps {
  selectedCategory: FileCategory;
  onCategoryChange: (category: FileCategory) => void;
  categoryCounts?: Record<string, number>;
  className?: string;
  variant?: 'tabs' | 'chips';
}

interface CategoryConfig {
  key: FileCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  hoverColor: string;
  activeColor: string;
}

const categoryConfigs: CategoryConfig[] = [
  {
    key: 'all',
    label: 'Tümü',
    icon: DocumentIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    hoverColor: 'hover:bg-gray-200',
    activeColor: 'bg-gray-600 text-white',
  },
  {
    key: 'Video',
    label: 'Video',
    icon: FilmIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    hoverColor: 'hover:bg-red-200',
    activeColor: 'bg-red-600 text-white',
  },
  {
    key: 'Müzik',
    label: 'Müzik',
    icon: MusicalNoteIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    hoverColor: 'hover:bg-purple-200',
    activeColor: 'bg-purple-600 text-white',
  },
  {
    key: 'Yazılım',
    label: 'Yazılım',
    icon: CodeBracketIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    hoverColor: 'hover:bg-blue-200',
    activeColor: 'bg-blue-600 text-white',
  },
  {
    key: 'Belge',
    label: 'Belge',
    icon: DocumentTextIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    hoverColor: 'hover:bg-green-200',
    activeColor: 'bg-green-600 text-white',
  },
  {
    key: 'Arşiv',
    label: 'Arşiv',
    icon: ArchiveBoxIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    hoverColor: 'hover:bg-yellow-200',
    activeColor: 'bg-yellow-600 text-white',
  },
  {
    key: 'Resim',
    label: 'Resim',
    icon: PhotoIcon,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    hoverColor: 'hover:bg-pink-200',
    activeColor: 'bg-pink-600 text-white',
  },
  {
    key: 'Diğer',
    label: 'Diğer',
    icon: DocumentIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    hoverColor: 'hover:bg-gray-200',
    activeColor: 'bg-gray-600 text-white',
  },
];

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  categoryCounts = {},
  className = '',
  variant = 'tabs',
}: CategoryFilterProps) {
  // Filter out categories with zero counts (except 'all')
  const visibleCategories = useMemo(() => {
    return categoryConfigs.filter(
      (config) =>
        config.key === 'all' ||
        !categoryCounts ||
        Object.keys(categoryCounts).length === 0 ||
        (categoryCounts[config.key] ?? 0) > 0
    );
  }, [categoryCounts]);

  if (variant === 'chips') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {visibleCategories.map((config) => {
          const Icon = config.icon;
          const count = config.key === 'all' 
            ? Object.values(categoryCounts).reduce((sum, c) => sum + c, 0)
            : categoryCounts[config.key] ?? 0;
          const isActive = selectedCategory === config.key;

          return (
            <button
              key={config.key}
              onClick={() => onCategoryChange(config.key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                transition-all duration-200 transform hover:scale-105
                ${
                  isActive
                    ? config.activeColor
                    : `${config.bgColor} ${config.color} ${config.hoverColor}`
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{config.label}</span>
              {count > 0 && (
                <span
                  className={`
                    ml-1 px-2 py-0.5 rounded-full text-xs font-semibold
                    ${isActive ? 'bg-white/20' : 'bg-white/50'}
                  `}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Tabs variant
  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <nav className="flex space-x-1 overflow-x-auto" aria-label="Category tabs">
        {visibleCategories.map((config) => {
          const Icon = config.icon;
          const count = config.key === 'all'
            ? Object.values(categoryCounts).reduce((sum, c) => sum + c, 0)
            : categoryCounts[config.key] ?? 0;
          const isActive = selectedCategory === config.key;

          return (
            <button
              key={config.key}
              onClick={() => onCategoryChange(config.key)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium
                border-b-2 transition-colors whitespace-nowrap
                ${
                  isActive
                    ? `${config.color} border-current`
                    : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{config.label}</span>
              {count > 0 && (
                <span
                  className={`
                    ml-1 px-2 py-0.5 rounded-full text-xs font-semibold
                    ${
                      isActive
                        ? `${config.bgColor} ${config.color}`
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }
                  `}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Get category icon component by category name
 */
export function getCategoryIcon(category: FileCategory): React.ComponentType<{ className?: string }> {
  const config = categoryConfigs.find((c) => c.key === category);
  return config?.icon || DocumentIcon;
}

/**
 * Get category color classes by category name
 */
export function getCategoryColors(category: FileCategory): {
  text: string;
  bg: string;
  hover: string;
  active: string;
} {
  const config = categoryConfigs.find((c) => c.key === category);
  return {
    text: config?.color || 'text-gray-600',
    bg: config?.bgColor || 'bg-gray-100',
    hover: config?.hoverColor || 'hover:bg-gray-200',
    active: config?.activeColor || 'bg-gray-600 text-white',
  };
}
