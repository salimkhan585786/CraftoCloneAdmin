import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { Category } from '../types';
import CategoryCard from '../components/CategoryCard';
import { motion } from 'motion/react';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('categories');
    if (saved) {
      setCategories(JSON.parse(saved));
    } else {
      const initial = [
        { id: '1', name: 'Festival' },
        { id: '2', name: 'Business' },
        { id: '3', name: 'Education' },
      ];
      setCategories(initial);
      localStorage.setItem('categories', JSON.stringify(initial));
    }
  }, []);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName,
    };

    const updated = [...categories, newCategory];
    setCategories(updated);
    localStorage.setItem('categories', JSON.stringify(updated));
    setNewCategoryName('');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Categories</h1>
          <p className="text-zinc-500 mt-1">Organize your templates by category</p>
        </div>
        
        <form onSubmit={handleAddCategory} className="flex items-center gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name..."
            className="px-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-w-[240px]"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
          >
            <Plus size={18} />
            Add
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <CategoryCard category={category} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
