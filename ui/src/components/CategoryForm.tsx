import { useState, useEffect } from 'react';
import type { Category, CategoryFormData } from '../types/category';

interface CategoryFormProps {
  category?: Category | null;
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
}

const CategoryForm = ({ category, onSubmit, onCancel }: CategoryFormProps) => {
  const parseJsonArray = (jsonString?: string): string[] => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  const [formData, setFormData] = useState<CategoryFormData>({
    name: category?.name || '',
    folderPath: category?.folderPath || '',
    fileExtensions: parseJsonArray(category?.fileExtensions),
    mimeTypes: parseJsonArray(category?.mimeTypes),
    color: category?.color || '#6b7280',
    icon: category?.icon || 'file',
  });

  const [extensionInput, setExtensionInput] = useState('');
  const [mimeTypeInput, setMimeTypeInput] = useState('');

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        folderPath: category.folderPath,
        fileExtensions: parseJsonArray(category.fileExtensions),
        mimeTypes: parseJsonArray(category.mimeTypes),
        color: category.color || '#6b7280',
        icon: category.icon || 'file',
      });
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addExtension = () => {
    if (extensionInput.trim()) {
      const ext = extensionInput.trim().toLowerCase().replace(/^\./, '');
      if (!formData.fileExtensions.includes(ext)) {
        setFormData({
          ...formData,
          fileExtensions: [...formData.fileExtensions, ext],
        });
      }
      setExtensionInput('');
    }
  };

  const removeExtension = (ext: string) => {
    setFormData({
      ...formData,
      fileExtensions: formData.fileExtensions.filter(e => e !== ext),
    });
  };

  const addMimeType = () => {
    if (mimeTypeInput.trim()) {
      const mime = mimeTypeInput.trim().toLowerCase();
      if (!formData.mimeTypes.includes(mime)) {
        setFormData({
          ...formData,
          mimeTypes: [...formData.mimeTypes, mime],
        });
      }
      setMimeTypeInput('');
    }
  };

  const removeMimeType = (mime: string) => {
    setFormData({
      ...formData,
      mimeTypes: formData.mimeTypes.filter(m => m !== mime),
    });
  };

  const selectFolder = async () => {
    // In Electron, you would use IPC to open a folder dialog
    // For now, we'll just use a prompt
    const path = prompt('Enter folder path:', formData.folderPath);
    if (path) {
      setFormData({ ...formData, folderPath: path });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {category ? 'Edit Category' : 'Create Category'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={category?.isSystem}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Folder Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.folderPath}
                onChange={(e) => setFormData({ ...formData, folderPath: e.target.value })}
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={selectFolder}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Browse
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-20 h-10 border rounded cursor-pointer"
            />
          </div>

          {!category?.isSystem && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">File Extensions</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={extensionInput}
                    onChange={(e) => setExtensionInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExtension())}
                    placeholder="e.g., pdf, doc, txt"
                    className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addExtension}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.fileExtensions.map((ext) => (
                    <span
                      key={ext}
                      className="px-2 py-1 bg-gray-200 rounded text-sm flex items-center gap-1"
                    >
                      .{ext}
                      <button
                        type="button"
                        onClick={() => removeExtension(ext)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">MIME Types</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={mimeTypeInput}
                    onChange={(e) => setMimeTypeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMimeType())}
                    placeholder="e.g., application/pdf"
                    className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addMimeType}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.mimeTypes.map((mime) => (
                    <span
                      key={mime}
                      className="px-2 py-1 bg-gray-200 rounded text-sm flex items-center gap-1"
                    >
                      {mime}
                      <button
                        type="button"
                        onClick={() => removeMimeType(mime)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;
