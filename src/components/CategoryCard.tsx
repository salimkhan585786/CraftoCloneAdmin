import React from 'react';
import { Plus, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Category } from '../types';

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
          <Folder size={24} />
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-zinc-900 mb-1">{category.name}</h3>
      <p className="text-zinc-500 text-sm mb-6">Manage templates for this category</p>
      
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
