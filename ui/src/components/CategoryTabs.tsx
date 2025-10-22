import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { setSelectedCategory } from '../store/slices/downloadsSlice';
import { DownloadStatus } from '../types/download';

export default function CategoryTabs() {
  const dispatch = useDispatch();
  const downloads = useSelector((state: RootState) => state.downloads.downloads);
  const categories = useSelector((state: RootState) => state.categories.categories);
  const selectedCategory = useSelector((state: RootState) => state.downloads.selectedCategory);

  // Count downloads per category
  const getCategoryCount = (categoryName: string | null) => {
    if (categoryName === null) {
      return downloads.length;
    }
    return downloads.filter(d => d.category === categoryName).length;
  };

  // Count active downloads per category
  const getActiveCategoryCount = (categoryName: string | null) => {
    const activeStatuses = [DownloadStatus.Downloading, DownloadStatus.Pending];
    if (categoryName === null) {
      return downloads.filter(d => activeStatuses.includes(d.status)).length;
    }
    return downloads.filter(d => 
      d.category === categoryName && activeStatuses.includes(d.status)
    ).length;
  };

  const handleCategoryClick = (categoryName: string | null) => {
    dispatch(setSelectedCategory(categoryName));
  };

  const getCategoryIcon = (categoryName: string) => {
    const iconMap: Record<string, string> = {
      'Video': '🎬',
      'Documents': '📄',
      'Software': '💿',
      'Archives': '📦',
      'Music': '🎵',
      'Images': '🖼️',
      'Other': '📁',
    };
    return iconMap[categoryName] || '📁';
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
        {/* All Downloads Tab */}
        <button
          onClick={() => handleCategoryClick(null)}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            selectedCategory === null
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <span className="text-lg">📥</span>
          <span>All Downloads</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            selectedCategory === null
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}>
            {getCategoryCount(null)}
          </span>
          {getActiveCategoryCount(null) > 0 && (
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* Category Tabs */}
        {categories.map((category) => {
          const count = getCategoryCount(category.name);
          const activeCount = getActiveCategoryCount(category.name);
          
          if (count === 0) return null;

          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.name)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                selectedCategory === category.name
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-lg">{getCategoryIcon(category.name)}</span>
              <span>{category.name}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                selectedCategory === category.name
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {count}
              </span>
              {activeCount > 0 && (
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
