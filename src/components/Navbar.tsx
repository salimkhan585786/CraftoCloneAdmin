import React, { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function Navbar() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  authService.useAuthState();
  const admin = authService.getCurrentAdmin();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await authService.logout();
    navigate('/login');
    setIsLoggingOut(false);
  };

  return (
    <nav className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">P</span>
        </div>
        <span className="font-bold text-xl text-zinc-900 tracking-tight">Crafto Admin</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-zinc-600 px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-100">
          <User size={16} />
          <span className="text-sm font-medium">{admin?.name || 'Admin'}</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}
