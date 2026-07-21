import { useEffect, useState } from 'react';

/**
 * NetworkStatusBanner
 *
 * Shows a prominent "No Internet Connection" banner at the top of the screen
 * whenever the device goes offline. Hides automatically when connectivity is
 * restored. This prevents the native Android "App is not responding" dialog
 * which can be triggered by unhandled network failures.
 */
export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      // Hide the "connection restored" message after 3 seconds
      setTimeout(() => setShowRestored(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Nothing to show when online (and not in the brief "restored" window)
  if (isOnline && !showRestored) return null;

  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0 }}
        className="flex items-center justify-center gap-3 px-4 py-3 bg-red-600 text-white text-sm font-semibold shadow-lg animate-in slide-in-from-top-2 duration-300"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01
               M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
          <line x1="3" y1="3" x2="21" y2="21" strokeWidth={2.5} strokeLinecap="round" />
        </svg>
        <span>No Internet Connection — Please check your network</span>
      </div>
    );
  }

  // Connection just restored
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0 }}
      className="flex items-center justify-center gap-3 px-4 py-3 bg-green-600 text-white text-sm font-semibold shadow-lg animate-in slide-in-from-top-2 duration-300"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
      <span>Internet connection restored</span>
    </div>
  );
}
