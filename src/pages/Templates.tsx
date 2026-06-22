import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Film, Image as ImageIcon, Pause, Play, Plus, Search, Star, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminCategory, AdminTemplateSummary } from '../types';
import { categoryService } from '../services/categoryService';
import { templateService } from '../services/templateService';

export default function Templates() {
  const [templates, setTemplates] = useState<AdminTemplateSummary[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('');
  const [trendingFilter, setTrendingFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedCategoryForAdd = categoryId || categories[0]?.id || '';

  const query = useMemo(
    () => ({
      category_id: categoryId || undefined,
      type: type ? (type as 'IMAGE' | 'VIDEO') : undefined,
      search: search || undefined,
      page: 1,
      limit: 100,
    }),
    [categoryId, search, type],
  );

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [templateResponse, categoryResponse] = await Promise.all([
        templateService.listTemplates(query),
        categories.length ? Promise.resolve(categories) : categoryService.listCategories(),
      ]);

      setTemplates(templateResponse.data);
      setCategories(categoryResponse.filter((item) => item.is_active !== false));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load templates.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [query]);

  const handleDelete = async (template: AdminTemplateSummary) => {
    if (!window.confirm(`Delete "${template.name}"?`)) {
      return;
    }

    try {
      setBusyId(template.id);
      setError('');
      await templateService.deleteTemplate(template.id);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete template.');
    } finally {
      setBusyId(null);
    }
  };

  const handlePauseToggle = async (template: AdminTemplateSummary) => {
    const nextActive = template.is_active === false;
    const action = nextActive ? 'resume' : 'pause';

    if (!window.confirm(`${action === 'pause' ? 'Pause' : 'Resume'} "${template.name}"?`)) {
      return;
    }

    try {
      setBusyId(template.id);
      setError('');
      await templateService.setTemplateActive(template.id, nextActive);
      setTemplates((current) => current.map((item) => (item.id === template.id ? { ...item, is_active: nextActive } : item)));
    } catch (pauseError) {
      setError(pauseError instanceof Error ? pauseError.message : `Unable to ${action} template.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleTrendingToggle = async (template: AdminTemplateSummary) => {
    const nextTrending = !template.is_trending;
    const action = nextTrending ? 'mark as trending' : 'remove from trending';

    if (!window.confirm(`${nextTrending ? 'Mark' : 'Remove'} "${template.name}" as trending?`)) {
      return;
    }

    try {
      setBusyId(template.id);
      setError('');
      if (nextTrending) {
        await templateService.markTrending(template.id);
      } else {
        await templateService.removeTrending(template.id);
      }
      setTemplates((current) => current.map((item) => (item.id === template.id ? { ...item, is_trending: nextTrending } : item)));
    } catch (trendingError) {
      setError(trendingError instanceof Error ? trendingError.message : `Unable to ${action} template.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleCleanupTrending = async () => {
    if (!window.confirm('Cleanup all expired trending templates?')) {
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      const result = await templateService.cleanupTrending();
      setSuccessMessage(`Cleaned up ${result.cleaned} expired trending template(s).`);
      setTemplates((current) => current.map((item) => (item.is_trending ? { ...item, is_trending: false, trending_expires_at: null } : item)));
    } catch (cleanupError) {
      setError(cleanupError instanceof Error ? cleanupError.message : 'Unable to cleanup trending templates.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Templates</h1>
          <p className="mt-1 text-zinc-500">View and manage all templates at once.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCleanupTrending}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 font-semibold text-amber-700 transition-colors hover:bg-amber-100"
          >
            <Star size={18} />
            Cleanup Trending
          </button>
          <Link
            to={selectedCategoryForAdd ? `/editor?categoryId=${selectedCategoryForAdd}` : '/categories'}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            <Plus size={18} />
            Add Template
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_160px_160px]">
          <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5">
            <Search size={18} className="text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none"
          >
            <option value="">All types</option>
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
          </select>

          <select
            value={trendingFilter}
            onChange={(e) => setTrendingFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none"
          >
            <option value="">All templates</option>
            <option value="trending">Trending only</option>
            <option value="not_trending">Non-trending only</option>
          </select>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {successMessage && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-600">{successMessage}</div>}

      {isLoading ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">No templates found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {templates
            .filter((template) => {
              if (trendingFilter === 'trending') return template.is_trending === true;
              if (trendingFilter === 'not_trending') return template.is_trending !== true;
              return true;
            })
            .map((template) => (
            <div key={template.id} className={`rounded-3xl border bg-white p-4 shadow-sm ${template.is_active === false ? 'border-amber-200 opacity-75' : 'border-zinc-200'}`}>
              <div className="flex items-start gap-4">
                {template.thumbnail_url ? (
                  <img src={template.thumbnail_url} alt={template.name} className="h-24 w-24 rounded-2xl border border-zinc-200 bg-zinc-50 object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-400">
                    {template.type === 'VIDEO' ? <Film size={28} /> : <ImageIcon size={28} />}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-bold text-zinc-900">{template.name}</h2>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-500">{template.type}</span>
                    {template.is_premium && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Premium</span>}
                    {template.is_trending && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Trending</span>}
                    {template.is_active === false && <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600">Paused</span>}
                  </div>

                  <p className="mt-2 text-sm text-zinc-500">{template.category?.name || 'Uncategorized'} · {template.language || 'N/A'} · Usage {template.usage_count ?? 0}</p>
                  {template.updatedAt && (
                    <p className="mt-1 text-xs text-zinc-400">Updated {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(template.updatedAt))}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={`/editor?categoryId=${template.category_id || template.category?.id || selectedCategoryForAdd}&templateId=${template.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      <ExternalLink size={16} />
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handlePauseToggle(template)}
                      disabled={busyId === template.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60"
                    >
                      {template.is_active === false ? <Play size={16} /> : <Pause size={16} />}
                      {template.is_active === false ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTrendingToggle(template)}
                      disabled={busyId === template.id}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                        template.is_trending
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <Star size={16} className={template.is_trending ? 'fill-emerald-500' : ''} />
                      {template.is_trending ? 'Trending' : 'Trend'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template)}
                      disabled={busyId === template.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                    {template.template_url && (
                      <a
                        href={template.template_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
                      >
                        Preview
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
