import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { client } from '../api/client';

const MOBILE_APP_URL = import.meta.env.VITE_APP_URL || 'https://app.meinspect.com';
const MOBILE_AUTH_URL = `${MOBILE_APP_URL}/mobile-auth.html`;
const MOBILE_CALLBACK_SCHEME = 'meinspect://auth/callback';
const MOBILE_CALLBACK_URL = `${MOBILE_APP_URL}/mobile-auth-callback.html`;
const PENDING_KEY = 'meinspect_native_oauth_pending';

type NativeOAuthResult = { ok: true } | { ok: false; error: string };
type ResultListener = (result: NativeOAuthResult) => void;

const listeners = new Set<ResultListener>();
let initialized = false;

function emit(result: NativeOAuthResult) {
  for (const listener of listeners) listener(result);
}

function readOAuthError(url: URL): string {
  return (
    url.searchParams.get('error_description') ||
    url.searchParams.get('error') ||
    'Google sign-in was cancelled or could not be completed.'
  );
}

async function handleNativeCallback(rawUrl: string): Promise<boolean> {
  const isCustomScheme = rawUrl.startsWith(MOBILE_CALLBACK_SCHEME);
  const isHttpsAppLink = rawUrl.startsWith(MOBILE_CALLBACK_URL);
  if (!isCustomScheme && !isHttpsAppLink) return false;

  const callbackUrl = new URL(rawUrl);
  const token = callbackUrl.searchParams.get('es_auth_token');
  const error = callbackUrl.searchParams.get('error');

  await Browser.close().catch(() => undefined);
  sessionStorage.removeItem(PENDING_KEY);

  if (error || !token) {
    emit({ ok: false, error: readOAuthError(callbackUrl) });
    return true;
  }

  // EdgeSpark consumes es_auth_token during client initialization. Reloading the
  // WebView through an HTTPS history URL lets the SDK store the token securely,
  // while the custom scheme itself never becomes a BrowserRouter location.
  const appUrl = new URL(window.location.href);
  appUrl.pathname = '/';
  appUrl.search = '';
  appUrl.hash = '';
  appUrl.searchParams.set('es_auth_token', token);
  window.location.replace(appUrl.toString());
  return true;
}

export function initializeNativeOAuth(): void {
  if (initialized || !Capacitor.isNativePlatform()) return;
  initialized = true;

  void App.addListener('appUrlOpen', ({ url }) => {
    void handleNativeCallback(url);
  });

  // Covers a cold launch where the callback created the app process.
  void App.getLaunchUrl().then((launch) => {
    if (launch?.url) void handleNativeCallback(launch.url);
  });

  // Also support a verified HTTPS callback opened directly as an app link.
  const currentUrl = new URL(window.location.href);
  if (`${currentUrl.origin}${currentUrl.pathname}` === MOBILE_CALLBACK_URL) {
    void handleNativeCallback(currentUrl.toString());
  }
}

export function subscribeToNativeOAuth(listener: ResultListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function startGoogleSignIn(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    await client.auth.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/`,
    });
    return;
  }

  initializeNativeOAuth();
  sessionStorage.setItem(PENDING_KEY, 'true');

  await Browser.open({
    url: MOBILE_AUTH_URL,
    presentationStyle: 'fullscreen',
  });
}
