import React, { useState, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://olkmxpl1sliijytnc48w.youbase.cloud';
const ADMIN_BASE = `${BACKEND_URL}/api/public/admin`;

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  location: string;
  isTester: number;
  freeInspections: number;
  totalInspections: number;
  createdAt: string;
}

export default function AdminPage() {
  const [adminSecret, setAdminSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [searchQ, setSearchQ] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  const [grantEmail, setGrantEmail] = useState('');
  const [grantCount, setGrantCount] = useState(1);
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantMsg, setGrantMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Verify the password by attempting to call the users endpoint
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${ADMIN_BASE}/users?q=`, {
        headers: { 'X-Admin-Secret': adminSecret },
      });
      if (res.status === 403) {
        setAuthError('Incorrect password. Please try again.');
        setAuthLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Server error: ' + res.status);
      const data = await res.json();
      setUsers(data.data || []);
      setAuthed(true);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to connect to backend.');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchUsers = useCallback(async (q = searchQ) => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await fetch(`${ADMIN_BASE}/users?q=${encodeURIComponent(q)}`, {
        headers: { 'X-Admin-Secret': adminSecret },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.data || []);
    } catch (err: any) {
      setUsersError(err.message);
    } finally {
      setUsersLoading(false);
    }
  }, [adminSecret, searchQ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQ);
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    setGrantLoading(true);
    setGrantMsg(null);
    try {
      const res = await fetch(`${ADMIN_BASE}/grant-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': adminSecret,
        },
        body: JSON.stringify({ email: grantEmail.trim(), count: grantCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGrantMsg({ type: 'error', text: data.error || 'Failed to grant credits.' });
      } else {
        setGrantMsg({ type: 'success', text: data.message });
        setGrantEmail('');
        setGrantCount(1);
        fetchUsers(searchQ);
      }
    } catch (err: any) {
      setGrantMsg({ type: 'error', text: err.message });
    } finally {
      setGrantLoading(false);
    }
  };

  const handleGrantToUser = (email: string) => {
    setGrantEmail(email);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Login screen ───────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-red-900/30 border border-red-700/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-sm text-slate-400 mt-1">MeInspect internal tool</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Admin Password</label>
              <input
                type="password"
                value={adminSecret}
                onChange={e => setAdminSecret(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
            </div>
            {authError && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">{authError}</p>
            )}
            <button
              type="submit"
              disabled={authLoading || !adminSecret.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {authLoading ? 'Verifying…' : 'Enter Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Admin dashboard ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-900/40 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">MeInspect Admin</h1>
              <p className="text-xs text-slate-400">Credit Management</p>
            </div>
          </div>
          <button
            onClick={() => setAuthed(false)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Grant Credits Card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Grant Free Inspections</h2>
          <p className="text-xs text-slate-400 mb-4">Credits are used automatically before charging Stripe.</p>

          <form onSubmit={handleGrant} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">User Email</label>
                <input
                  type="email"
                  value={grantEmail}
                  onChange={e => setGrantEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs text-slate-400 mb-1">Credits</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={grantCount}
                  onChange={e => setGrantCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {grantMsg && (
              <div className={`text-sm rounded-lg px-3 py-2 ${grantMsg.type === 'success'
                ? 'bg-green-900/30 border border-green-700/40 text-green-400'
                : 'bg-red-900/30 border border-red-700/40 text-red-400'
                }`}>
                {grantMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={grantLoading || !grantEmail.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {grantLoading ? 'Granting…' : `Grant ${grantCount} Credit${grantCount !== 1 ? 's' : ''}`}
            </button>
          </form>
        </div>

        {/* User Search & List */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Users</h2>
              <p className="text-xs text-slate-400">{users.length} result{users.length !== 1 ? 's' : ''}</p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by email or name…"
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-xl text-sm font-medium text-white transition-colors"
              >
                Search
              </button>
            </form>
          </div>

          {usersError && (
            <p className="text-sm text-red-400 mb-3">{usersError}</p>
          )}

          {usersLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No users found.</p>
          ) : (
            <div className="space-y-2">
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 bg-slate-700/50 rounded-xl px-4 py-3 border border-slate-600/50"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-300">
                    {(user.name || user.email).slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name || '(no name)'}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    <div className="text-center">
                      <p className="text-slate-400">Reports</p>
                      <p className="font-semibold text-white">{user.totalInspections}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400">Credits</p>
                      <p className={`font-bold ${user.freeInspections > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                        {user.freeInspections}
                      </p>
                    </div>
                    {user.isTester === 1 && (
                      <span className="px-2 py-0.5 bg-yellow-900/40 text-yellow-400 border border-yellow-700/40 rounded-full text-xs font-medium">
                        Tester
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleGrantToUser(user.email)}
                    className="ml-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                  >
                    + Credit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
