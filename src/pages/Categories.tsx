import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { AdminCategory, CategoryPayload } from '../types';
import CategoryCard from '../components/CategoryCard';
import { motion } from 'motion/react';
import { categoryService } from '../services/categoryService';

const emptyForm: CategoryPayload = {
  name: '',
  description: '',
  icon_key: '',
};

export default function Categories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<CategoryPayload>(emptyForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoading(true);
        const data = await categoryService.listCategories();
        setCategories(data.filter((item) => item.is_active !== false));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load categories.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCategoryId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.description.trim() || !form.icon_key.trim()) {
      setError('Name, description, and icon key are required.');
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      if (editingCategoryId) {
        const updatedCategory = await categoryService.updateCategory(editingCategoryId, form);
        setCategories((current) => current.map((item) => (item.id === editingCategoryId ? updatedCategory : item)));
      } else {
        const newCategory = await categoryService.createCategory(form);
        setCategories((current) => [newCategory, ...current]);
      }

      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save category.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (category: AdminCategory) => {
    setEditingCategoryId(category.id);
    setForm({
      name: category.name,
      description: category.description || '',
      icon_key: category.icon_key || '',
    });
    setError('');
  };

  const handleDelete = async (category: AdminCategory) => {
    setError('');
    setDeletingId(category.id);

    try {
      await categoryService.deleteCategory(category.id);
      setCategories((current) => current.filter((item) => item.id !== category.id));

      if (editingCategoryId === category.id) {
        resetForm();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete category.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Categories</h1>
          <p className="text-zinc-500 mt-1">Organize your templates by category</p>
        </div>

        <div className="text-sm text-zinc-500">
          {isLoading ? 'Loading categories...' : `${categories.length} categories`}
        </div>
      </header>

      <section className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            placeholder="Category name"
            className="px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
            placeholder="Description"
            className="px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <input
            type="text"
            value={form.icon_key}
            onChange={(e) => setForm((current) => ({ ...current, icon_key: e.target.value }))}
            placeholder="Icon key"
            className="px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-60 flex-1"
            >
              <Plus size={18} />
              {isSaving ? 'Saving...' : editingCategoryId ? 'Update' : 'Add'}
            </button>
            {editingCategoryId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {error && (
          <div className="mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <CategoryCard
              category={category}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deletingId === category.id}
            />
          </motion.div>
        ))}
      </div>

      {!isLoading && categories.length === 0 && (
        <div className="bg-white border border-dashed border-zinc-300 rounded-3xl p-10 text-center text-zinc-500">
          No categories found yet. Create your first one above.
        </div>
      )}
    </div>
  );
}
