import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// ⚠️  Capture this BEFORE any other import so we can detect that the user
// arrived via an email verification link.  The @edgespark/client SDK strips
// `es_auth_token` from the URL synchronously during its module initialisation
// (before React mounts), so we have to record the flag here.
if (window.location.href.includes('es_auth_token')) {
  sessionStorage.setItem('email_just_verified', 'true');
}

import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

// Global error logging for edge cases
window.addEventListener('error', (event) => {
  console.error('[Global Error]', {
    message: event.message,
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', {
    reason: event.reason
  });
});

// Register Android back button handler
// When on the inspection wizard (/inspect), dispatch a custom event
// so the wizard can step backwards instead of exiting
if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
    const path = window.location.pathname;

    if (path === '/inspect') {
      // Let the InspectionForm handle back navigation internally
      window.dispatchEvent(new CustomEvent('capacitor-back-button'));
    } else if (canGoBack) {
      window.history.back();
    } else {
      // At root route — minimize instead of closing
      CapacitorApp.minimizeApp();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
