import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';

type Step = 'email' | 'verify' | 'new-password' | 'success';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address'); return; }
    setLoading(true);
    try {
      const result = await client.auth.forgetPassword.emailOtp({ email });
      if (result.error) {
        setError(result.error.message || 'Failed to send reset code. Please try again.');
        setLoading(false);
        return;
      }
      setStep('verify');
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newOtp = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
      setOtp(newOtp);
      const nextEmpty = newOtp.findIndex((c) => !c);
      otpRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter the complete 6-digit code'); return; }
    setError('');
    // Note: OTP is not verified with the server here — it will be validated
    // server-side when the user submits their new password below.
    setStep('new-password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) { setError('Please enter a new password'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const result = await client.auth.emailOtp.resetPassword({ email, otp: otp.join(''), password });
      if (result.error) {
        const code = result.error.code || result.error.name;
        if (code === 'INVALID_OTP') setError('Invalid verification code. Please check and try again.');
        else if (code === 'OTP_EXPIRED') setError('Verification code has expired. Please request a new one.');
        else setError(result.error.message || 'Failed to reset password. Please try again.');
        setLoading(false);
        return;
      }
      setStep('success');
      // Send password-changed confirmation email.
      // NOTE: the user is NOT logged in during the reset flow, so we must use
      // the PUBLIC self-verifying endpoint here. The authenticated
      // /api/notifications/password-changed endpoint always returned 401 in this
      // flow (no session), so the confirmation email silently never sent.
      try {
        await client.api.fetch('/api/public/notifications/password-changed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      } catch (emailErr) {
        console.warn('Failed to send password changed email:', emailErr);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError('');
    setLoading(true);
    try {
      const result = await client.auth.forgetPassword.emailOtp({ email });
      if (result.error) { setError(result.error.message || 'Failed to resend code.'); setLoading(false); return; }
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
          <h1 className="text-sm font-semibold text-slate-800">MeInspect</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4" style={{ paddingBottom: 'max(5rem, env(safe-area-inset-bottom))' }}>
        <div className="w-full max-w-sm">
          {step === 'email' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Forgot Password?</h2>
                <p className="text-sm text-slate-500">No worries, we'll send you reset instructions</p>
              </div>
              <form onSubmit={handleSendOtp} className="space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ahmed@example.com" autoComplete="email"
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
                <button type="submit" disabled={loading}
                  className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${loading ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25'}`}>
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </button>
              </form>
              <div className="mt-6 text-center">
                <button onClick={() => navigate('/login')} className="text-sm text-blue-600 font-medium hover:text-blue-700">
                  ← Back to Sign In
                </button>
              </div>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Check Your Email</h2>
                <p className="text-sm text-slate-500">We sent a 6-digit code to</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{email}</p>
              </div>
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">{error}</div>}
              <div className="flex justify-center gap-3 mb-6">
                {otp.map((digit, i) => (
                  <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    className="w-12 h-14 text-center text-xl font-bold bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                ))}
              </div>
              <button onClick={handleVerifyOtp} disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all">
                Verify Code
              </button>
              <div className="mt-6 text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-slate-500">Resend code in {countdown}s</p>
                ) : (
                  <button onClick={handleResendOtp} disabled={loading} className="text-sm text-blue-600 font-medium hover:text-blue-700">Resend Code</button>
                )}
              </div>
              <div className="mt-4 text-center">
                <button onClick={() => { setStep('email'); setError(''); setOtp(['', '', '', '', '', '']); }} className="text-sm text-slate-500 hover:text-slate-700">← Back</button>
              </div>
            </>
          )}

          {step === 'new-password' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Set New Password</h2>
                <p className="text-sm text-slate-500">Create a strong password for your account</p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Enter new password" autoComplete="new-password"
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showPassword
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                        }
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password" autoComplete="new-password"
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
                <button type="submit" disabled={loading}
                  className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${loading ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25'}`}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
              <div className="mt-6 text-center">
                <button onClick={() => { setStep('verify'); setError(''); }} className="text-sm text-slate-500 hover:text-slate-700">← Back</button>
              </div>
            </>
          )}

          {step === 'success' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Password Reset!</h2>
                <p className="text-sm text-slate-500">Your password has been reset successfully. You can now sign in with your new password.</p>
              </div>
              <button onClick={() => navigate('/login')}
                className="w-full py-3.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all">
                Sign In
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
