import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  return (
    <nav className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">P</span>
        </div>
        <span className="font-bold text-xl text-zinc-900 tracking-tight">PosterAdmin</span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-zinc-600 px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-100">
          <User size={16} />
          <span className="text-sm font-medium">Admin</span>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}
