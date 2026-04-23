import React from 'react';
import { Layers, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">Admin Dashboard</h1>
        <p className="text-zinc-500 mt-1">Overview of your poster template system</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all"
        >
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
            <Layers size={28} />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Manage Categories</h2>
          <p className="text-zinc-500 mb-6">Create and organize categories for your poster templates.</p>
          <Link 
            to="/categories" 
            className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:gap-3 transition-all"
          >
            Go to Categories
            <ArrowRight size={18} />
          </Link>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all"
        >
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
            <Plus size={28} />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Create Template</h2>
          <p className="text-zinc-500 mb-6">Start from scratch and build a new poster template.</p>
          <Link 
            to="/categories" 
            className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:gap-3 transition-all"
          >
            Select Category
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
