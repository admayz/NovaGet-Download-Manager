import type { Category, CategoryFormData } from '../types/category';

const API_BASE_URL = 'http://localhost:5000/api';

export const categoryService = {
    async getAll(): Promise<Category[]> {
        const response = await fetch(`${API_BASE_URL}/categories`);
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        return response.json();
    },

    async getById(id: number): Promise<Category> {
        const response = await fetch(`${API_BASE_URL}/categories/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch category');
        }
        return response.json();
    },

    async create(data: CategoryFormData): Promise<Category> {
        const category = {
            name: data.name,
            folderPath: data.folderPath,
            fileExtensions: JSON.stringify(data.fileExtensions),
            mimeTypes: JSON.stringify(data.mimeTypes),
            color: data.color,
            icon: data.icon,
            isSystem: false
        };

        const response = await fetch(`${API_BASE_URL}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(category),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create category');
        }

        return response.json();
    },

    async update(id: number, data: CategoryFormData): Promise<Category> {
        const category = {
            id,
            name: data.name,
            folderPath: data.folderPath,
            fileExtensions: JSON.stringify(data.fileExtensions),
            mimeTypes: JSON.stringify(data.mimeTypes),
            color: data.color,
            icon: data.icon,
            isSystem: false
        };

        const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(category),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update category');
        }

        return response.json();
    },

    async delete(id: number): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete category');
        }
    },

    async detectCategory(fileName: string, mimeType?: string): Promise<string> {
        const response = await fetch(`${API_BASE_URL}/categories/detect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileName, mimeType }),
        });

        if (!response.ok) {
            throw new Error('Failed to detect category');
        }

        const result = await response.json();
        return result.category;
    },
};
