import type { Category } from '../types/category';

interface CategoryListProps {
  categories: Category[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const CategoryList = ({ categories, onEdit, onDelete }: CategoryListProps) => {
  const parseJsonArray = (jsonString?: string): string[] => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  return (
    <div className="grid gap-4">
      {categories.map((category) => {
        const extensions = parseJsonArray(category.fileExtensions);
        const mimeTypes = parseJsonArray(category.mimeTypes);

        return (
          <div
            key={category.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: category.color || '#6b7280' }}
                  />
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  {category.isSystem && (
                    <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                      System
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 mb-2">
                  <strong>Folder:</strong> {category.folderPath}
                </div>

                {extensions.length > 0 && (
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>Extensions:</strong>{' '}
                    <span className="font-mono">{extensions.join(', ')}</span>
                  </div>
                )}

                {mimeTypes.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <strong>MIME Types:</strong>{' '}
                    <span className="font-mono text-xs">{mimeTypes.join(', ')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(category.id)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Edit
                </button>
                {!category.isSystem && (
                  <button
                    onClick={() => onDelete(category.id)}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {categories.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No categories found. Create your first category!
        </div>
      )}
    </div>
  );
};

export default CategoryList;
