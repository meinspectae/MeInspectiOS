import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { client } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { startGoogleSignIn, subscribeToNativeOAuth } from '../utils/nativeOAuth';

const GOOGLE_SVG = (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => subscribeToNativeOAuth((result) => {
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
    }
  }), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      // Use Youbase built-in auth
      const result = await client.auth.signIn.email({ email, password });

      if (result.error) {
        setError(result.error.message || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      // result.data contains { user, session }
      const authUser = result.data?.user;
      if (authUser) {
        localStorage.setItem('meinspect_token', 'platform-auth');
        
        // Ensure user record exists in DB and get profile
        let displayName = authUser.name || '';
        try {
          // GET profile first
          const profileRes = await client.api.fetch('/api/user/profile');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.data) {
              displayName = profileData.data.name || displayName;
            } else {
              // No profile yet — create it (user signed up before email verification)
              await client.api.fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: authUser.name || '' }),
              });
            }
          }
        } catch (err) {
          console.warn('[LoginPage] Profile ensure failed:', err);
        }
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: displayName,
        });
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await startGoogleSignIn();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSampleReport = async () => {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://app.meinspect.com';
    const reportUrl = Capacitor.isNativePlatform()
      ? `${appUrl}/sample-inspection-report.pdf`
      : `${window.location.origin}/sample-inspection-report.pdf`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Browser.open({ url: reportUrl, presentationStyle: 'popover' });
      } catch {
        window.location.assign(reportUrl);
      }
      return;
    }

    window.open(reportUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
          <h1 className="text-sm font-semibold text-slate-800">MeInspect</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-20" style={{ paddingBottom: 'max(5rem, env(safe-area-inset-bottom))' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/meinspect-logo.png" alt="MeInspect" className="h-24 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</h2>
            <p className="text-sm text-slate-500">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Google Sign-In is hidden in the iOS app until Sign in with Apple is configured. */}
            {!isNativeIOS && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full min-h-11 flex items-center justify-center gap-3 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                {GOOGLE_SVG}
                Continue with Google
              </button>
            )}

            {!isNativeIOS && (
              <div className="relative flex items-center my-4">
                <div className="flex-1 border-t border-slate-200" />
                <span className="mx-3 text-xs text-slate-400 bg-slate-50 px-2">or</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
                {error.toLowerCase().includes('not verified') && (
                  <span className="block mt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/verify-email?email=' + encodeURIComponent(email))}
                      className="text-blue-600 font-medium hover:text-blue-700 underline"
                    >
                      Verify your email
                    </button>
                    {' '}or{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-blue-600 font-medium hover:text-blue-700 underline"
                    >
                      Reset password
                    </button>
                  </span>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 ml-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 ml-1">
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] ${
                loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-blue-600 font-bold hover:text-blue-700"
              >
                Sign Up
              </button>
            </p>
          </div>

          {/* Sample Report Button */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleSampleReport}
              className="inline-flex min-h-11 items-center gap-1.5 px-3 text-xs text-slate-500 hover:text-blue-600 transition-colors group"
              aria-label="View sample inspection report"
            >
              <svg className="w-3.5 h-3.5 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Sample Inspection Report
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
