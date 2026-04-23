import React from 'react';
import { Plus, Folder, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminCategory } from '../types';

interface CategoryCardProps {
  category: AdminCategory;
  onEdit: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
  isDeleting?: boolean;
}

export default function CategoryCard({ category, onEdit, onDelete, isDeleting = false }: CategoryCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
          <Folder size={24} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
            title="Edit category"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(category)}
            disabled={isDeleting}
            className="p-2 rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
            title="Delete category"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <h3 className="text-lg font-bold text-zinc-900 mb-1">{category.name}</h3>
      <p className="text-zinc-500 text-sm mb-2">{category.description || 'Manage templates for this category'}</p>
      <p className="text-zinc-400 text-xs mb-6">Icon key: {category.icon_key || 'Not provided'}</p>

      <Link
        to={`/editor?categoryId=${category.id}`}
        className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors"
      >
        <Plus size={18} />
        Add Template
      </Link>
    </div>
  );
}
