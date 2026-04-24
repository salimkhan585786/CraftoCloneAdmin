import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Film, Image as ImageIcon, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminCategory, AdminTemplateSummary, CategoryPayload } from '../types';
import CategoryCard from '../components/CategoryCard';
import { motion } from 'motion/react';
import { categoryService } from '../services/categoryService';
import { templateService } from '../services/templateService';

const emptyForm: CategoryPayload = {
  name: '',
  description: '',
  icon_key: '',
};

export default function Categories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<AdminTemplateSummary[]>([]);
  const [form, setForm] = useState<CategoryPayload>(emptyForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [templateError, setTemplateError] = useState('');
  const formSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoading(true);
        const data = await categoryService.listCategories();
        const activeCategories = data.filter((item) => item.is_active !== false);
        setCategories(activeCategories);
        setSelectedCategoryId((current) => current || activeCategories[0]?.id || null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load categories.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) {
      setTemplates([]);
      return;
    }

    const loadTemplates = async () => {
      try {
        setIsTemplateLoading(true);
        setTemplateError('');
        const response = await templateService.listTemplates({
          category_id: selectedCategoryId,
          page: 1,
          limit: 50,
        });
        setTemplates(response.data);
      } catch (loadError) {
        setTemplateError(loadError instanceof Error ? loadError.message : 'Unable to load templates.');
      } finally {
        setIsTemplateLoading(false);
      }
    };

    loadTemplates();
  }, [selectedCategoryId]);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    formSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const handleDelete = async (category: AdminCategory) => {
    setError('');
    setDeletingId(category.id);

    try {
      await categoryService.deleteCategory(category.id);
      setCategories((current) => {
        const nextCategories = current.filter((item) => item.id !== category.id);

        setSelectedCategoryId((currentSelected) => {
          if (currentSelected !== category.id) {
            return currentSelected;
          }

          return nextCategories[0]?.id || null;
        });

        return nextCategories;
      });

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

      <section ref={formSectionRef} className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
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

      {categories.length > 0 && (
        <section className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">Templates By Category</h2>
              <p className="text-zinc-500 mt-1">Select a category to browse, preview, and edit its templates.</p>
            </div>

            {selectedCategoryId && (
              <Link
                to={`/editor?categoryId=${selectedCategoryId}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-zinc-800 transition-colors"
              >
                <Plus size={18} />
                Add Template
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                  selectedCategoryId === category.id
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {templateError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
              {templateError}
            </div>
          )}

          {isTemplateLoading ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
              No templates found for this category yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <div className="flex items-start gap-4">
                    {template.thumbnail_url ? (
                      <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="h-24 w-24 rounded-2xl object-cover border border-zinc-200 bg-white"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-400">
                        {template.type === 'VIDEO' ? <Film size={28} /> : <ImageIcon size={28} />}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-zinc-900 truncate">{template.name}</h3>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-500 border border-zinc-200">
                          {template.type}
                        </span>
                        {template.is_premium && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Premium
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        Language: {template.language || 'N/A'}
                      </p>
                      <p className="text-sm text-zinc-500">
                        Usage: {template.usage_count ?? 0}
                      </p>
                      {template.updatedAt && (
                        <p className="text-xs text-zinc-400 mt-1">
                          Updated {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(template.updatedAt))}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          to={`/editor?categoryId=${selectedCategoryId}&templateId=${template.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                        >
                          <ExternalLink size={16} />
                          Edit Template
                        </Link>
                        {template.template_url && (
                          <a
                            href={template.template_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors"
                          >
                            Preview Asset
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
