import React from 'react';
import { Crown, Globe2, LayoutDashboard, Layers, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Users', path: '/users' },
  { icon: Layers, label: 'Categories', path: '/categories' },
  { icon: Globe2, label: 'Languages', path: '/languages' },
  { icon: Crown, label: 'Subscriptions', path: '/subscriptions' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-zinc-50 border-r border-zinc-200 h-[calc(100vh-64px)] sticky top-16 hidden md:block">
      <div className="p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-sm border border-zinc-200'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
