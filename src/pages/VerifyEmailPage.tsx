import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { client } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'manual'>('verifying');
  const [error, setError] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  useEffect(() => {
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStatus('error');
      setError(errorParam === 'expired' ? 'Verification link has expired. Please request a new one.' : 'Verification failed. Please try again.');
      return;
    }

    // Always call getSession() on the verify-email page.
    // The @edgespark/client SDK auto-consumes `es_auth_token` from the URL at
    // initialization time — before our component can read searchParams. After it
    // processes the token the session is ready, so we just need to call getSession()
    // to confirm verification succeeded.
    autoVerify();
  }, []);

  const autoVerify = async () => {
    // The @edgespark/client SDK strips `es_auth_token` from the URL during its
    // module initialisation — before React mounts — so we can't read it here.
    // main.tsx captures a sessionStorage flag BEFORE any imports run so we can
    // detect when the user has just arrived via an email verification link.
    const justVerified = sessionStorage.getItem('email_just_verified');
    if (justVerified) {
      sessionStorage.removeItem('email_just_verified');
      setStatus('success');
      return;
    }

    // No verification token present.  Try getSession() in case the user
    // already has an active session (e.g. they refreshed after verifying).
    try {
      const session = await client.auth.getSession();
      if (session.data?.user) {
        setUser({
          id: session.data.user.id,
          email: session.data.user.email || '',
          name: session.data.user.name || '',
        });
        setStatus('success');
      } else {
        setStatus('manual');
      }
    } catch {
      setStatus('manual');
    }
  };

  const handleResendEmail = async () => {
    if (countdown > 0 || !email.trim()) return;
    setLoading(true);
    setError('');
    try {
      // callbackURL is REQUIRED so the link in the email points back to the
      // frontend (/verify-email) and not to the backend origin (→ 404).
      const result = await client.auth.sendVerificationEmail({
        email,
        callbackURL: `${window.location.origin}/verify-email`,
      });
      if (result.error) {
        setError(result.error.message || 'Failed to resend verification email.');
        setLoading(false);
        return;
      }
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
          <h1 className="text-sm font-semibold text-slate-800">MeInspect</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-sm">
          {/* Verifying state */}
          {status === 'verifying' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Verifying Email...</h2>
              <p className="text-sm text-slate-500">Please wait while we verify your email address.</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Email Verified!</h2>
                <p className="text-sm text-slate-500">Your email has been verified successfully. Sign in to start using MeInspect.</p>
              </div>
              <button onClick={() => navigate('/login')}
                className="w-full py-3.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all">
                Sign In Now
              </button>
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Verification Failed</h2>
                <p className="text-sm text-slate-500">{error}</p>
              </div>
              <button onClick={() => { setStatus('manual'); setError(''); }}
                className="w-full py-3.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all">
                Try Again
              </button>
              <div className="mt-6 text-center">
                <button onClick={() => navigate('/login')} className="text-sm text-blue-600 font-medium hover:text-blue-700">
                  ← Back to Sign In
                </button>
              </div>
            </>
          )}

          {/* Manual email entry / resend */}
          {status === 'manual' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Verify Your Email</h2>
                <p className="text-sm text-slate-500">Click the verification link in your email, or enter your email below to resend.</p>
              </div>
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ahmed@example.com"
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
                <button onClick={handleResendEmail} disabled={loading || countdown > 0 || !email.trim()}
                  className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${loading || countdown > 0 || !email.trim() ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25'}`}>
                  {countdown > 0 ? `Resend in ${countdown}s` : loading ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
              <div className="mt-6 text-center">
                <button onClick={() => navigate('/login')} className="text-sm text-blue-600 font-medium hover:text-blue-700">
                  ← Back to Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
