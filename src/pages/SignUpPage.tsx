import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { client } from '../api/client';
import PhoneInput from '../components/PhoneInput';
import { getCountryNames, getCitiesForCountry } from '../data/locations';

const GOOGLE_SVG = (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [showCountrySugg, setShowCountrySugg] = useState(false);
  const [showCitySugg, setShowCitySugg] = useState(false);
  const [countryFilter, setCountryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const countryInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'form' | 'verify-email'>('form');
  const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  const countries = getCountryNames();
  const cities = country ? getCitiesForCountry(country) : [];

  const filteredCountries = countries.filter((c) =>
    c.toLowerCase().includes(countryFilter.toLowerCase())
  );
  const filteredCities = cities.filter((c) =>
    c.toLowerCase().includes(cityFilter.toLowerCase())
  );

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountrySugg(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setShowCitySugg(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await client.auth.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/`,
      });
    } catch (err: any) {
      setErrors({ email: err.message || 'Google sign-in failed. Please try again.' });
    }
  };

  const validateForm = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Required';
    // Phone number is NOT required on iOS (Apple Guideline 5.1.1(v) — it is
    // not essential to the app's core functionality). Android/web keep the
    // existing required-phone behavior unchanged. When provided, it is still
    // validated for basic sanity on all platforms.
    if (!isNativeIOS && !phone.trim()) e.phone = 'Required';
    else if (phone.trim() && phone.replace(/[^0-9]/g, '').length < 9) e.phone = 'Enter a valid phone number';
    if (!email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email';
    if (!password) e.password = 'Required';
    else if (password.length < 8) e.password = 'Must be at least 8 characters';
    if (!confirmPassword) e.confirmPassword = 'Required';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!country.trim()) e.country = 'Required';
    if (!city.trim()) e.city = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});

    try {
      const result = await client.auth.signUp.email({
        name,
        email,
        password,
        callbackURL: `${window.location.origin}/verify-email`,
      });

      if (result.error) {
        setErrors({ email: result.error.message || 'Signup failed' });
        setLoading(false);
        return;
      }

      const session = await client.auth.getSession();
      if (session.data?.user) {
        const location = `${city}, ${country}`;
        try {
          await client.api.fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, location }),
          });
        } catch (profileErr) {
          console.warn('Failed to save profile data:', profileErr);
        }
      }

      // Send the welcome email via the PUBLIC endpoint. This must run regardless of
      // whether a session was established (email-verification flows do NOT create a
      // session, and native mobile is cross-origin so the auth token isn't injected).
      // The backend verifies the email belongs to the freshly-created account.
      try {
        await client.api.fetch('/api/public/notifications/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email }),
        });
      } catch (emailErr) {
        console.warn('Failed to send welcome email:', emailErr);
      }

      try {
        await client.auth.sendVerificationEmail({
          email,
          callbackURL: `${window.location.origin}/verify-email`,
        });
      } catch (emailErr) {
        console.warn('sendVerificationEmail failed:', emailErr);
      }
      setStep('verify-email');
    } catch (err: any) {
      setErrors({ email: err.message || 'Signup failed. Please try again.' });
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

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'max(5rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg mx-auto px-4 py-6">
          {step === 'form' ? (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <img src="/meinspect-logo.png" alt="MeInspect" className="h-12 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Create Account</h2>
                <p className="text-sm text-slate-500">Fill in your details to get started</p>
              </div>

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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ahmed Al Maktoum"
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-300' : 'border-slate-200'}`} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <PhoneInput label={isNativeIOS ? 'Phone Number' : 'Phone Number *'} value={phone} onChange={(v) => setPhone(v)} error={errors.phone} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ahmed@example.com"
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-300' : 'border-slate-200'}`} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Min 8 chars"
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12 ${errors.password ? 'border-red-300' : 'border-slate-200'}`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showPassword
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                      }
                    </svg>
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password *</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-300' : 'border-slate-200'}`} />
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
              </div>

              {/* Country & City Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative" ref={countryDropdownRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Country *</label>
                  <input
                    ref={countryInputRef}
                    type="text"
                    value={showCountrySugg ? countryFilter : country}
                    onChange={e => {
                      setCountryFilter(e.target.value);
                      if (!showCountrySugg) setShowCountrySugg(true);
                    }}
                    onFocus={() => {
                      setCountryFilter(country);
                      setShowCountrySugg(true);
                    }}
                    placeholder="Select country"
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.country ? 'border-red-300' : 'border-slate-200'}`}
                  />
                  {showCountrySugg && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredCountries.map((c) => (
                        <button key={c} type="button"
                          onClick={() => {
                            setCountry(c);
                            setCountryFilter('');
                            setCity('');
                            setCityFilter('');
                            setShowCountrySugg(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${c === country ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}`}>
                          {c}
                        </button>
                      ))}
                      {filteredCountries.length === 0 && (
                        <p className="px-4 py-3 text-sm text-slate-400">No countries found</p>
                      )}
                    </div>
                  )}
                  {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country}</p>}
                </div>

                <div className="relative" ref={cityDropdownRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">City *</label>
                  <input
                    ref={cityInputRef}
                    type="text"
                    value={showCitySugg ? cityFilter : city}
                    onChange={e => {
                      setCityFilter(e.target.value);
                      if (!showCitySugg) setShowCitySugg(true);
                    }}
                    onFocus={() => {
                      if (country) {
                        setCityFilter(city);
                        setShowCitySugg(true);
                      }
                    }}
                    placeholder={country ? 'Select city' : 'Select country first'}
                    disabled={!country}
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 ${errors.city ? 'border-red-300' : 'border-slate-200'}`}
                  />
                  {showCitySugg && country && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredCities.map((c) => (
                        <button key={c} type="button"
                          onClick={() => {
                            setCity(c);
                            setCityFilter('');
                            setShowCitySugg(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${c === city ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}`}>
                          {c}
                        </button>
                      ))}
                      {filteredCities.length === 0 && (
                        <p className="px-4 py-3 text-sm text-slate-400">No cities found</p>
                      )}
                    </div>
                  )}
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                </div>
              </div>

              <button onClick={handleSignup} disabled={loading}
                className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${loading ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25'}`}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <p className="text-center text-sm text-slate-500">
                Already have an account?{' '}
                <button onClick={() => navigate('/login')} className="text-blue-600 font-medium hover:text-blue-700">
                  Sign In
                </button>
              </p>

              <div className="text-center space-y-2 pt-2">
                <p className="text-xs text-slate-400">
                  By creating an account you agree to our{' '}
                  <a href="https://www.meinspect.com/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
                </p>
                <p className="text-xs text-slate-400">
                  <a href="https://www.meinspect.com/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">www.meinspect.com</a>
                  <span className="mx-2">·</span>
                  <a href="mailto:hello@meinspect.com" className="hover:text-blue-600 transition-colors">hello@meinspect.com</a>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Check Your Email</h2>
              <p className="text-sm text-slate-500 mb-2">We've sent a verification link to</p>
              <p className="text-sm font-medium text-slate-700 mb-6">{email}</p>
              <p className="text-xs text-slate-400 mb-6">Click the link in your email to verify your account, then sign in.</p>
              <button onClick={() => navigate('/login')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md">
                Go to Sign In
              </button>
              <div className="mt-4">
                <button onClick={() => navigate('/verify-email?email=' + encodeURIComponent(email))}
                  className="text-xs text-blue-600 font-medium hover:text-blue-700">
                  Didn't receive the email? Verify manually
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
