import React, { useEffect, useState } from 'react';
import { Save, Trash2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { clearAuthStorage, updateStoredAdmin } from '../lib/authStorage';
import { UserProfile } from '../types';

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await userService.getProfile();
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load profile.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      setSuccessMessage('');
      const updated = await userService.updateProfile({ name: name.trim(), email: email.trim() });
      setProfile(updated);
      updateStoredAdmin({ name: updated.name, email: updated.email });
      setSuccessMessage('Profile updated successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError('');
      await userService.deleteAccount();
      clearAuthStorage();
      navigate('/login');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete account.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">Profile</h1>
        <p className="mt-1 text-zinc-500">Manage your admin account settings.</p>
      </header>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {successMessage && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-600">{successMessage}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
              <User size={20} />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900">Account Details</h2>
              <p className="text-sm text-zinc-500">Update your name and email address.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Role</label>
              <input
                type="text"
                value={profile?.role || 'admin'}
                disabled
                className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm h-fit">
          <h2 className="font-bold text-red-600">Danger Zone</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Permanently delete your admin account. This action cannot be undone.
          </p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </section>
      </div>
    </div>
  );
}
