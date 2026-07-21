import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, client } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, reset, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account state
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Load profile data on mount
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const res = await client.api.fetch('/api/user/profile');
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            setPhone(data.phone || '');
            // Update name from DB if available (use DB name instead of auth name)
            if (data.name) {
              setName(data.name);
              if (user && setUser) {
                setUser({ ...user, name: data.name });
              }
            } else if (!name) {
              setName(user?.name || '');
            }
          }
        }
      } catch {
        // Profile not found yet
      }
    };
    loadProfile();
  }, [user?.id]);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      // Update profile in backend (including name)
      const res = await client.api.fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone }),
      });

      if (!res.ok) {
        throw new Error('Failed to save profile');
      }

      // Update local auth store with new name
      if (user && setUser) {
        setUser({ ...user, name: name.trim() });
      }

      // Update inspector name in localStorage for inspection metadata
      localStorage.setItem('inspector_name', name.trim());

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      // Use EdgeSpark's better-auth changePassword method
      const result = await (client as any).auth.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (result?.error) {
        throw new Error(result.error.message || 'Failed to change password. Please check your current password.');
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    signOut();
    reset();
    navigate('/login');
  };

  // Derive initials for avatar
  const nameParts = (name || user.name || '').split(' ').filter(Boolean);
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : (name || user.name || 'U').substring(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Account Settings</h1>
        <p className="text-slate-500">Manage your profile and account.</p>
      </div>

      {/* Payment History Link */}
      <button
        onClick={() => navigate('/payments')}
        className="w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            💳
          </div>
          <div className="text-left">
            <h3 className="text-base font-bold text-slate-800">Payment History</h3>
            <p className="text-xs text-slate-500">View your report purchases and invoices</p>
          </div>
        </div>
        <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Profile Information</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">{name || user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500"
            />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+971 50 123 4567"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Error/Success messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}
          {saved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              Profile saved successfully ✓
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
              saving
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Security</h2>
        <p className="text-sm text-slate-500 mb-4">
          Change your password to keep your account secure.
        </p>

        {!showPasswordSection ? (
          <button
            onClick={() => setShowPasswordSection(true)}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Change Password
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                Password changed successfully ✓
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                  changingPassword
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25'
                }`}
              >
                {changingPassword ? 'Changing...' : 'Update Password'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordSection(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                  setPasswordSuccess(false);
                }}
                className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <button onClick={handleLogout}
          className="w-full px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-all">
          Sign Out
        </button>
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h2>
        <p className="text-sm text-slate-500 mb-4">
          Permanently delete your account and all associated inspections. This action cannot be undone.
        </p>
        {!showDeleteAccount ? (
          <button
            onClick={() => { setShowDeleteAccount(true); setDeleteError(''); setDeleteConfirmText(''); }}
            className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-all"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700 font-medium">⚠️ This will permanently delete:</p>
              <ul className="text-xs text-red-600 mt-1 ml-2 list-disc list-inside space-y-0.5">
                <li>Your account and profile data</li>
                <li>All inspections and reports</li>
                <li>All photos and signatures</li>
              </ul>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (deleteConfirmText !== 'DELETE') {
                    setDeleteError('Please type DELETE exactly to confirm.');
                    return;
                  }
                  setDeletingAccount(true);
                  setDeleteError('');
                  try {
                    const res = await client.api.fetch('/api/user/account', { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete account');
                    await signOut();
                    reset();
                    navigate('/login');
                  } catch {
                    setDeleteError('Failed to delete account. Please try again.');
                    setDeletingAccount(false);
                  }
                }}
                disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                  deletingAccount || deleteConfirmText !== 'DELETE'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/25'
                }`}
              >
                {deletingAccount ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
              <button
                onClick={() => { setShowDeleteAccount(false); setDeleteConfirmText(''); setDeleteError(''); }}
                className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legal & Support */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Support & Legal</h2>
        <div className="space-y-3">
          <a
            href="https://www.meinspect.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-lg group-hover:bg-blue-100 transition-colors">🌐</div>
            <div>
              <p className="text-sm font-medium text-slate-700">Website</p>
              <p className="text-xs text-slate-400">www.meinspect.com</p>
            </div>
          </a>
          <a
            href="mailto:hello@meinspect.com"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-lg group-hover:bg-emerald-100 transition-colors">✉️</div>
            <div>
              <p className="text-sm font-medium text-slate-700">Contact Support</p>
              <p className="text-xs text-slate-400">hello@meinspect.com</p>
            </div>
          </a>
          <a
            href="https://www.instagram.com/me.inspect"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="#E1306C" strokeWidth="2" fill="none"/>
                <circle cx="12" cy="12" r="4" stroke="#E1306C" strokeWidth="2" fill="none"/>
                <circle cx="17.5" cy="6.5" r="1" fill="#E1306C"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Instagram</p>
              <p className="text-xs text-slate-400">@me.inspect</p>
            </div>
          </a>
          <a
            href="https://www.meinspect.com/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-lg group-hover:bg-purple-100 transition-colors">🔒</div>
            <div>
              <p className="text-sm font-medium text-slate-700">Privacy Policy</p>
              <p className="text-xs text-slate-400">How we handle your data</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
