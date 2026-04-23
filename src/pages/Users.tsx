import React, { useEffect, useState } from 'react';
import { Search, Users as UsersIcon } from 'lucide-react';
import { adminService } from '../services/adminService';
import { AdminUser, PaginatedResponse } from '../types';

const PAGE_SIZE = 6;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function Users() {
  const [usersResponse, setUsersResponse] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await adminService.listUsers({ page, limit: PAGE_SIZE, search });
        setUsersResponse(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load users.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [page, search]);

  const users = usersResponse?.data || [];
  const totalPages = usersResponse ? Math.max(1, Math.ceil(usersResponse.total / usersResponse.limit)) : 1;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Users</h1>
          <p className="mt-1 text-zinc-500">Browse registered users, status, language, and subscription coverage.</p>
        </div>

        <div className="w-full max-w-md">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by phone number or name"
              className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />
          </label>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
              <UsersIcon size={20} />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900">User directory</h2>
              <p className="text-sm text-zinc-500">
                {isLoading ? 'Loading users...' : `${usersResponse?.total || 0} total users found`}
              </p>
            </div>
          </div>

          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Page {usersResponse?.page || page} of {totalPages}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-200">
          <div className="hidden grid-cols-[1.2fr_0.85fr_0.65fr_1fr_1fr] gap-4 bg-zinc-50 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 md:grid">
            <span>User</span>
            <span>Phone</span>
            <span>Language</span>
            <span>Subscription</span>
            <span>Created</span>
          </div>

          <div className="divide-y divide-zinc-200">
            {users.map((user) => (
              <div key={user.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.2fr_0.85fr_0.65fr_1fr_1fr] md:items-center">
                <div>
                  <p className="font-semibold text-zinc-900">{user.name || 'Unnamed user'}</p>
                  <p className="mt-1 text-xs text-zinc-500">{user.id}</p>
                </div>
                <div className="text-sm text-zinc-700">{user.phone_number}</div>
                <div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase text-zinc-600">
                    {user.language}
                  </span>
                </div>
                <div>
                  {user.subscription ? (
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{user.subscription.plan_type}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Expires {user.subscription.expires_at ? formatDate(user.subscription.expires_at) : 'N/A'}
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-500">No active plan</span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-zinc-700">{formatDate(user.createdAt)}</p>
                  <p className="mt-1 text-xs text-zinc-500">{user.status}</p>
                </div>
              </div>
            ))}

            {!isLoading && users.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-zinc-500">
                No users matched your search.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1 || isLoading}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages || isLoading}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
