import React, { useEffect, useState } from 'react';
import { Globe2, Plus, Trash2 } from 'lucide-react';
import { languageService } from '../services/languageService';
import { Language, LanguagePayload } from '../types';

const emptyForm: LanguagePayload = {
  code: '',
  name: '',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export default function Languages() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [form, setForm] = useState<LanguagePayload>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLanguages = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await languageService.listLanguages();
        setLanguages(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load languages.');
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code.trim() || !form.name.trim()) {
      setError('Language code and name are required.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      const createdLanguage = await languageService.createLanguage({
        code: form.code.trim().toLowerCase(),
        name: form.name.trim(),
      });
      setLanguages((current) => [createdLanguage, ...current]);
      setForm(emptyForm);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create language.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (language: Language) => {
    try {
      setDeletingId(language.id);
      setError('');
      await languageService.deleteLanguage(language.id);
      setLanguages((current) => current.filter((item) => item.id !== language.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to remove language.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">Languages</h1>
        <p className="mt-1 text-zinc-500">Manage active language options available across the product.</p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">Add language</h2>
        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[0.7fr_1.2fr_auto]">
          <input
            value={form.code}
            onChange={(e) => setForm((current) => ({ ...current, code: e.target.value }))}
            placeholder="Code, e.g. hi"
            className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
          />
          <input
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            placeholder="Language name"
            className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
          />
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            <Plus size={18} />
            {isSaving ? 'Saving...' : 'Create'}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <Globe2 size={20} />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900">Active languages</h2>
              <p className="text-sm text-zinc-500">{isLoading ? 'Loading languages...' : `${languages.length} configured`}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {languages.map((language) => (
            <div key={language.id} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-zinc-900">{language.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">{language.code.toUpperCase()}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {language.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="mt-5 text-xs uppercase tracking-[0.18em] text-zinc-400">
                Added {formatDate(language.createdAt)}
              </p>

              <button
                type="button"
                onClick={() => handleDelete(language)}
                disabled={deletingId === language.id}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 size={16} />
                {deletingId === language.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>

        {!isLoading && languages.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
            No languages available yet.
          </div>
        )}
      </section>
    </div>
  );
}
