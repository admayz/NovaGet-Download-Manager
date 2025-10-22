import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  clearError,
} from '../store/slices/categorySlice';
import type { CategoryFormData } from '../types/category';
import CategoryForm from './CategoryForm.tsx';
import CategoryList from './CategoryList.tsx';

const CategoryManager = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { categories, loading, error } = useSelector((state: RootState) => state.categories);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleCreate = async (data: CategoryFormData) => {
    try {
      await dispatch(createCategory(data)).unwrap();
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  const handleUpdate = async (id: number, data: CategoryFormData) => {
    try {
      await dispatch(updateCategory({ id, data })).unwrap();
      setEditingId(null);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await dispatch(deleteCategory(id)).unwrap();
      } catch (err) {
        console.error('Failed to delete category:', err);
      }
    }
  };

  const handleEdit = (id: number) => {
    setEditingId(id);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  const editingCategory = editingId
    ? categories.find((c) => c.id === editingId)
    : null;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Category Management</h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Category
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={handleClearError}
            className="text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {loading && <div className="text-center py-4">Loading...</div>}

      <CategoryList
        categories={categories}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {isFormOpen && (
        <CategoryForm
          category={editingCategory}
          onSubmit={editingId ? (data: CategoryFormData) => handleUpdate(editingId, data) : handleCreate}
          onCancel={handleCloseForm}
        />
      )}
    </div>
  );
};

export default CategoryManager;
