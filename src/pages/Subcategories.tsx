import React, { useState, useEffect, useRef } from 'react';
import { ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { AdminCategory, Subcategory, SubcategoryPayload } from '../types';
import { motion } from 'motion/react';
import { categoryService } from '../services/categoryService';
import { subcategoryService } from '../services/subcategoryService';
import { templateService } from '../services/templateService';

const emptyForm: SubcategoryPayload = {
  name: '',
  category_id: '',
  description: '',
  icon_key: '',
  image_key: '',
};

export default function Subcategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [form, setForm] = useState<SubcategoryPayload>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const formSectionRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoryService.listCategories();
        setCategories(data.filter((item) => item.is_active !== false));
      } catch {
        setError('Unable to load categories.');
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadSubcategories = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await subcategoryService.listSubcategories(filterCategoryId || undefined);
        setSubcategories(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load subcategories.');
      } finally {
        setIsLoading(false);
      }
    };
    loadSubcategories();
  }, [filterCategoryId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      const localPreview = URL.createObjectURL(file);
      setImagePreview(localPreview);

      const asset = await templateService.uploadAsset(file);
      setForm((current) => ({ ...current, image_key: asset.key }));

      if (asset.url) {
        setImagePreview(asset.url);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload image.');
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImageUpload(file);
    }
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setForm((current) => ({ ...current, image_key: '' }));
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.category_id.trim() || !form.description.trim()) {
      setError('Name, category, and description are required.');
      return;
    }

    if (!form.image_key.trim() && !form.icon_key.trim()) {
      setError('Either an image or icon key is required.');
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      if (editingId) {
        const updated = await subcategoryService.updateSubcategory(editingId, form);
        setSubcategories((current) => current.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await subcategoryService.createSubcategory(form);
        setSubcategories((current) => [created, ...current]);
      }
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save subcategory.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (sub: Subcategory) => {
    setEditingId(sub.id);
    setForm({
      name: sub.name,
      category_id: sub.category_id,
      description: sub.description || '',
      icon_key: sub.icon_key || '',
      image_key: sub.image_key || '',
    });
    setImagePreview(sub.image_url || null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    formSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const handleDelete = async (sub: Subcategory) => {
    if (!window.confirm(`Delete subcategory "${sub.name}"?`)) return;

    setError('');
    setDeletingId(sub.id);

    try {
      await subcategoryService.deleteSubcategory(sub.id);
      setSubcategories((current) => current.filter((item) => item.id !== sub.id));
      if (editingId === sub.id) resetForm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete subcategory.');
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Subcategories</h1>
          <p className="text-zinc-500 mt-1">Manage subcategories under each category</p>
        </div>
        <div className="text-sm text-zinc-500">
          {isLoading ? 'Loading...' : `${subcategories.length} subcategories`}
        </div>
      </header>

      <section ref={formSectionRef} className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={form.category_id}
              onChange={(e) => setForm((current) => ({ ...current, category_id: e.target.value }))}
              className="px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="Subcategory name"
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
              placeholder="Icon key (optional if image uploaded)"
              className="px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="subcategory-image-upload"
            />
            <label
              htmlFor="subcategory-image-upload"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <ImagePlus size={18} />
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </label>

            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-16 w-16 rounded-xl object-cover border border-zinc-200"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex-1" />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-60"
              >
                <Plus size={18} />
                {isSaving ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
        {error && (
          <div className="mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}
      </section>

      <section className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-zinc-900">All Subcategories</h2>
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
            Loading subcategories...
          </div>
        ) : subcategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
            No subcategories found. Create one above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subcategories.map((sub, index) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-5"
              >
                <div className="flex items-start gap-3">
                  {sub.image_url ? (
                    <img
                      src={sub.image_url}
                      alt={sub.name}
                      className="h-14 w-14 rounded-xl object-cover border border-zinc-200 bg-white flex-shrink-0"
                    />
                  ) : sub.icon_key ? (
                    <div className="h-14 w-14 rounded-xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 flex-shrink-0 text-xs font-medium">
                      {sub.icon_key}
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-xl border border-dashed border-zinc-300 bg-white flex items-center justify-center text-zinc-300 flex-shrink-0">
                      <ImagePlus size={20} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-zinc-900 truncate">{sub.name}</h3>
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{sub.description || 'No description'}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {getCategoryName(sub.category_id)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(sub)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sub)}
                      disabled={deletingId === sub.id}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
