# MeInspect — Property Condition Report App

## Project Overview
A professional property condition reporting application designed for the Dubai real estate market. It enables landlords, tenants, and inspectors to document property conditions with timestamped, geotagged photos and detailed item-by-item assessments.

## Architecture
```
Frontend (React + Vite)
├── src/
│   ├── api/client.ts          — Backend API service layer
│   ├── contexts/AuthContext.tsx — Authentication context
│   ├── components/
│   │   ├── SignaturePad.tsx    — Canvas-based signature component
│   │   └── ErrorBoundary.tsx   — Global error boundary for reliability
│   ├── pages/
│   │   ├── Dashboard.tsx       — Minimal home with Start New Inspection
│   │   ├── InspectionForm.tsx  — 6-step wizard with autocomplete
│   │   ├── ReportPage.tsx      — Multi-page PDF report generator
│   │   └── ...
│   ├── store/inspectionStore.ts — Zustand store (localStorage + API)
│   └── types/index.ts          — TypeScript interfaces

Mobile (Capacitor)
├── android/                   — Native Android project (API 36)
└── ios/                       — Native iOS project (Xcode)

Backend (Cloudflare Workers + D1)
├── backend/
│   ├── src/index.ts            — Worker entry point
│   ├── schema.sql              — Database schema
│   └── wrangler.toml           — Worker config
```

## Key Features
- **4 Property Types**: Apartment, Townhouse, Villa, Office
- **6-Step Inspection Wizard**: Property → Parties → Tenancy → Rooms → Signatures → Review
- **Autocomplete Fields**: 70+ Dubai communities with suggestions as you type
- **Room Management**: Add/remove rooms and items with individual delete options
- **Photo Capture**: Camera-based with GPS tagging and timestamp embedding
- **Digital Signatures**: Canvas-based for Tenant, Landlord, and Inspector
- **Email Report Sending**: Real email delivery via Resend API through backend endpoint
- **Inspection History Sync**: Bidirectional sync between local storage and cloud backend
- **Multi-Page PDF Report**:
  - Page 1: Property summary with exterior photo (centered, constrained width)
  - Page 2: Legal disclaimer (Arabic & English)
  - Page 3: Recording methodology (Arabic & English)
  - Assessment pages: Room-by-room condition tables
  - Last page: Signatures + Legal declaration (Arabic & English)
  - All pages: Timestamp, Report ID, Geolocation, IP Address, Page numbers
  - Tamper-proof: SHA-256 hash of report data for integrity verification

## Report PDF Fixes (2026-07-21)
- **Logo**: `PageHeader` in `ReportPage.tsx` now renders the real `/meinspect-logo.png` image on every page instead of a placeholder blue "M" box.
- **Image stretching**: Cover photo, room-item photos, and signature images were switched from `<img style={{objectFit}}>` to `<div style={{backgroundImage, backgroundSize:'cover'/'contain'}}>` because `html2canvas` (used internally by `html2pdf.js`) does not reliably respect CSS `object-fit` on `<img>` tags, causing visible stretching/distortion in the exported PDF.
- **Blank page space**: Previously every logical section (cover, disclaimer, each room, signatures) was forced into a fixed `height`/`minHeight: 1040px` flex-column div with the footer pinned via `marginTop: 'auto'`, wasting most of the page when content was short. Fixed by removing the forced page height so each section's div shrinks to its actual content height; `pageBreakAfter: 'always'` still forces a fresh PDF page at each section boundary. Rooms are now additionally grouped by an estimated-height greedy packer (`roomGroups` in `ReportPage.tsx`) so multiple short rooms share one physical page instead of each room getting its own near-empty page.
- **Report filename/title**: Both the exported PDF filename (`opt.filename`) and the print-window `<title>` now use `reportTitleString` = `PropertyName-Address-OwnerName-Date` (sanitized via `sanitizeFilename()`), instead of a generic `Property-Inspection-Report-<id>.pdf`.
- `scripts/generate-sample-report.py` mirrors the same fixes (real logo, natural page heights) for the bundled `public/sample-inspection-report.pdf` demo file.
- **Known local-preview limitation**: `vite preview`/`vite dev` serve the frontend from `http://127.0.0.1`, while auth (`@edgespark/client`/better-auth) issues session cookies scoped for the production HTTPS domain. Cross-origin session cookies cannot be set/read over plain HTTP, so email/password and anonymous sign-in cannot be fully exercised from a local preview — this is a sandbox/testing-environment limitation, not a bug in deployed production (same-origin HTTPS).

## Backend Integration
- **Authentication**: Youware platform auth via X-Encrypted-Yw-ID header
- **Database**: Cloudflare D1 (SQLite-compatible) with user-scoped data
- **API Endpoints**:
  - `GET/POST /api/inspections` — List/create inspections (authenticated, user-scoped)
  - `GET/PUT/DELETE /api/inspections/:id` — CRUD single inspection (authenticated, ownership-verified)
  - `POST /api/send-email` — Send report email via Resend API (authenticated, requires RESEND_API_KEY secret)
  - `GET /api/sync/inspections` — Fetch all inspections from cloud for a user (authenticated)
  - `POST /api/sync/push` — Push local inspections to cloud (authenticated)
  - `POST /api/upload/pdf` — Presigned PDF upload URL (authenticated, ownership-verified)
  - `GET /api/download/pdf/:inspectionId` — Presigned PDF download (authenticated, ownership-verified)
  - `POST /api/upload/photo` — Presigned photo upload URL (authenticated, ownership-verified)
  - `GET /api/download/photo` — Presigned photo download (authenticated, path-ownership-verified)
  - `POST /api/user/profile` — Save/update user profile (authenticated)
  - `GET /api/user/profile` — Get own user profile (authenticated)
  - `POST /api/checkout` — Create Stripe payment session (authenticated)
  - `GET /api/checkout/:sessionId` — Verify payment status (authenticated, ownership-verified)
  - `GET /api/orders` — Payment history (authenticated)
  - `POST /api/admin/set-tester` — Set user as tester (requires email and isTester boolean)
- **Security**: 
  - All endpoints enforce user ownership via `requireOwnership()` helper.
  - Authentication is enforced for all `/api/*` routes.
  - Payment status (`paymentData`) is protected and cannot be updated directly via client-side API calls (`PUT /api/inspections/:id`, `POST /api/sync/push`, `POST /api/inspections`).
  - Debug and public test endpoints have been removed for production security.
- **Reliability**:
  - Global `ErrorBoundary` wraps the application to prevent white-screens on runtime errors.
  - Visual "No GPS" badges on photos alert users to missing geolocation data before report generation.
  - Inspection data and photos are persisted using **IndexedDB** (via `idb-keyval`) instead of `localStorage` to provide a much larger storage quota and prevent data loss from `QuotaExceededError`.

## Stripe Integration & Tester Provision
- **Stripe Checkout**: The app uses Stripe Checkout for secure payments.
- **Tester Provision**: Users with `isTester = 1` in the `users` table can generate reports for free. The backend detects this status and bypasses Stripe, creating a "tester" provider order immediately marked as paid.
- **Configuration**: Requires `STRIPE_SECRET_KEY` to be set in the backend secrets.

## Database Schema
- `users` — User accounts synced from Youware auth
- `inspections` — Main inspection records
- `property_details` — Property info (1:1 with inspection)
- `parties` — Landlord, tenant, agent details
- `tenancy_details` — Lease information
- `rooms` — Room definitions
- `items` — Inspection items within rooms
- `photos` — Photos with GPS and timestamps
- `signatures` — Digital signatures
- `payments` — Payment records

## Mobile Deployment (Capacitor)
- **App Version**: 3.0 (versionCode 3) — see `android/app/build.gradle`
- **Release Keystore**: `keystore/release.jks` (PKCS12, alias: meinspect, password: MeInspect2024!)
- **Network Status**: `NetworkStatusBanner` component shows "No Internet Connection" banner when device is offline (prevents "App is not responding" native dialog)
- **Android**: `npm run cap:add:android && npm run cap:open:android`
- **Sync**: `npm run cap:sync`

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite 7, Tailwind CSS 3.4
- **State**: Zustand with localStorage persistence + backend sync
- **Backend**: Cloudflare Workers, D1 Database, TypeScript
- **PDF**: html2pdf.js (html2canvas + jsPDF)
- **Mobile**: Capacitor 8

## Bug Fixes Applied
- **Room data loss**: All store room mutation functions now use immutable `.map()` pattern instead of array index mutation to prevent reference sharing issues between rooms
- **PDF generation**: Switched from dynamic `import('html2pdf.js')` to static import to ensure the library is always available; added print fallback on PDF failure
- **Report responsive scaling**: Report (794px A4 width) now uses CSS transform scale to fit mobile viewports without horizontal overflow
- **PDF download on native**: Fixed Filesystem.writeFile to not use Encoding parameter (deprecated); fixed Share API to use `uri` from Filesystem.getUri instead of invalid `documents://` protocol
- **Print on Android**: Print button now triggers PDF generation + Share dialog on native platforms instead of opening a broken new window
- **Broken images in report**: Signatures and photos with empty URLs are now handled gracefully (show "Signature on file" placeholder; filter out empty-URL photos)
- **History card layout**: Moved action buttons below content instead of alongside (prevents text wrapping on mobile)
- **Profile name not saving**: Settings page now sends `name` to backend `/api/user/profile` endpoint; backend now accepts and saves `name` field

## iPhone / Mobile Web (PWA) Fixes (2026-07-22)
- **"Add Photo" not opening the camera/picker on iPhone**: `capturePhoto()`'s web (non-Capacitor) fallback created a `<input type="file">` and called `.click()` on it without ever attaching it to the DOM — iOS Safari/WebViews can silently swallow `.click()` on detached file inputs. Fixed by appending the input (hidden, off-screen) to `document.body` before `.click()`, removing it after selection/cancel. See `capturePhoto()` in `src/utils/helpers.ts`.
- **Tapping a field zooms in and never zooms back out on iPhone**: iOS Safari auto-zooms on focus when a field's computed font-size is below 16px (most fields here use Tailwind `text-sm` = 14px). Fixed via `index.html` viewport meta (`maximum-scale=1.0, user-scalable=no`) plus a `@media (max-width: 768px)` rule in `src/index.css` forcing `input/textarea/select` to 16px as defense-in-depth.
- **No way to navigate back on iPhone**: In-app back buttons called `navigate(-1)` directly, which is a silent no-op when there's no previous history entry (fresh PWA launch, deep link, native WKWebView cold start) — and iOS has no OS-level back gesture to fall back on. Added `safeGoBack(navigate, fallbackPath)` in `src/utils/helpers.ts` (checks `window.history.length`, falls back to a safe route) and wired it into `InspectionForm`, `ReportPage`, `PaymentHistoryPage` back buttons.
- **"Install MeInspect" banner still shown after installing (Android + iOS)**: Visibility only checked `display-mode: standalone`/`navigator.standalone`, missing the Capacitor native app (Android's WebView can still fire `beforeinstallprompt`). `index.html` now also checks `window.Capacitor.isNativePlatform()`, listens for `appinstalled` to hide the banner + persist the dismissed flag immediately, and gates the banner before its 3s show-timer (not just on `load`).

## Pre-Publish Audit — Round 2 (2026-07-23)
- **Camera ONLY, no gallery (FIXED)**: `capturePhoto()` in `src/utils/helpers.ts` now uses `CameraSource.Camera` (was `CameraSource.Prompt`) so the inspection workflow can ONLY take a fresh photo with the live camera — the "Photo Library / gallery" option is removed. Also added explicit `Camera.checkPermissions()` + `Camera.requestPermissions({permissions:['camera']})` before `getPhoto` (fixes iOS silently not opening the camera on first use), `correctOrientation:true`, `saveToGallery:false`, and real error logging in the previously-empty catch.
- **App icon replaced (both platforms)**: User-provided logo (`chat/wv72g7uo7w.jpg`, house+eye+green-check + wordmark) processed with `sharp`. Because a wordmark is illegible at icon sizes, the brand SYMBOL is extracted (crop top region + trim whitespace) and centered:
  - Source masters written to `assets/icon.png` (symbol on white, no-alpha for iOS), `assets/icon-foreground.png` (symbol on transparent, ~62% safe zone), `assets/icon-background.png` (white). Regenerator: `scripts/make-icons.mjs`.
  - Native icons generated by `scripts/generate-native-icons.mjs` (uses local sharp 0.35.x; NOTE: `@capacitor/assets` CLI fails here because its bundled sharp 0.32.6 native binary isn't built under pnpm):
    - iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` (1024×1024, alpha removed — App Store requirement).
    - Android: `mipmap-{mdpi..xxxhdpi}/ic_launcher.png` (square), `ic_launcher_round.png` (circular mask), `ic_launcher_foreground.png` (adaptive foreground). Adaptive background stays white (`@color/ic_launcher_background = #FFFFFF`).
  - In-app/PWA `public/meinspect-logo.png` refreshed to 512×512.
- **Live E2E on https://app.meinspect.com (login aalekh.dxb@gmail.com)**: Login ✓ (email/password → redirects to dashboard), Dashboard ✓ (Welcome Aalekh, 6 completed), History ✓ (`GET /api/sync/inspections` 200, "Synced"), Settings ✓ (`GET /api/user/profile` 200, profile loads), New Inspection wizard ✓ (property-type step), Report page ✓ (loads with payment gate). No 4xx/5xx app errors observed. DB connectivity + sync confirmed. (Automation note: the login form is a React controlled form — programmatic `fill` alone doesn't update state; use `fill` then submit via Enter.)
- **Rollback note**: A prior session's identical fixes (camera, TS type fixes, version bump) had been rolled back before this session, so they were re-applied here. TypeScript `tsc --noEmit` is clean; production build succeeds; `npx cap sync` run for both platforms; Android bumped to `versionCode 4` / `versionName "3.1"`.

## Registration / Welcome Email + Native-iOS Diagnosis (2026-07-24)
Investigation of "no welcome email on registration" + native-iOS API concerns:
- **Root cause of missing welcome email**: `SignUpPage.handleSignup` sent the welcome
  email only inside `if (session.data?.user)` and hit the **authenticated** endpoint
  `/api/notifications/welcome`. But sign-up requires email verification, so
  `signUp.email()` returns `token: null` → **no session exists at that moment** → the
  welcome block never ran. On native (iOS/Android WebView) the app is cross-origin to
  the backend, so the edge-spark auth token isn't auto-injected either → the authed
  endpoint would 401. Result: welcome email was never sent.
- **Fix**: Added a **public, self-verifying** endpoint `POST /api/public/notifications/welcome`
  that looks the email up in `es_system__auth_user` and only sends to a genuinely
  registered account created within the last 30 minutes (anti-abuse). `SignUpPage` now
  calls it **unconditionally** after a successful sign-up (works on web AND native, no
  session/token required). Profile save (`/api/user/profile`) stays session-gated.
- **Resend health = OK (verified live)**: `sendNotificationEmail()` now logs and returns
  the exact Resend result (`{ok,id,error,status}`). A live end-to-end send to
  `delivered@resend.dev` returned `{"success":true}` → **RESEND_API_KEY valid + sender
  domain verified + Resend reachable**. DNS confirms Resend verification records
  (`resend._domainkey.meinspect.com` DKIM + `send.meinspect.com` SPF `include:amazonses.com`).
  So the failure was purely the frontend session-gate, not Resend.
- **Release build API URL = clean**: `dist/assets/*.js` and native `capacitor.config.json`
  (ios + android) contain **no localhost/staging URL**; API client (`src/api/client.ts`)
  uses `VITE_BACKEND_URL || https://olkmxpl1sliijytnc48w.youbase.cloud`.
- **Native iOS CORS = permitted**: backend responds with
  `access-control-allow-origin: capacitor://localhost` + `access-control-allow-credentials: true`.
- **Live E2E on https://app.meinspect.com (aalekh.dxb@gmail.com)**: Login ✓, Dashboard ✓
  (Welcome Aalekh, 6 completed), History ✓ (`GET /api/sync/inspections` 200, "Synced"),
  Settings ✓ (`GET /api/user/profile` 200), New Inspection wizard ✓, Report page ✓
  (payment gate shown). No 4xx/5xx. Automation note: the React login form ignores
  synthetic button-click/Enter from agent-browser — submit via `form.requestSubmit()`
  (or a real device tap); this is an automation quirk, not an app bug.
- **Auth base path** is `/api/_es/auth/*` (not `/api/auth/*`).
- **Deploy note**: backend fix is on **staging**; it goes live on production/native only
  after **Publish**. A throwaway `delivered@resend.dev` diag account remains in Users
  (DELETE is guarded); remove via YouBase → Users if desired.

## Build Commands
- `npm run dev` — Development server
- `npm run build` — Production build
- `npm run cap:sync` — Sync to native projects
- `node scripts/make-icons.mjs` — Rebuild icon masters from source logo
- `node scripts/generate-native-icons.mjs` — Regenerate iOS + Android launcher icons

## Android / Play Store
- **Target SDK**: 36 (Android 16) — meets Google's API 35+ requirement
- **Min SDK**: 24 (Android 7.0) — covers all Pixel phones and 99%+ of active devices
- **Manifest additions**: `dataExtractionRules`, `fullBackupContent`, `networkSecurityConfig`, `resizeableActivity`, `<queries>` block for PDF/image sharing
- **New permissions**: `READ_MEDIA_IMAGES` (Android 13+), `POST_NOTIFICATIONS` (Android 13+)
- **Pixel Fold / Tablet**: `resizeableActivity="true"` ensures proper multi-window support
- **Sample report**: Accessible at `/sample-inspection-report.pdf`; link shown on the Login page
- **Play Store listing guide**: `playstore-assets/PLAYSTORE-LISTING.md`


## Native Google OAuth & Complete Brand Assets (2026-07-28)
- Native Google sign-in now launches in a Capacitor system browser via `@capacitor/browser`, never inside the isolated app WebView.
- The browser begins OAuth from the production web origin (`https://app.meinspect.com/mobile-auth.html`) and returns through `mobile-auth-callback.html`, which deep-links to `meinspect://auth/callback`; the app consumes the YouBase `es_auth_token` and restores the session.
- Android registers both the `meinspect://auth/callback` custom scheme and the HTTPS app-link callback. iOS registers the `meinspect` URL scheme.
- The YouBase Google callback is confirmed as `https://olkmxpl1sliijytnc48w.youbase.cloud/api/_es/auth/callback/google`; this is the URI that must remain authorized in Google Cloud.
- A backend mobile OAuth bootstrap/secure-state route is included. It re-issues `better-auth.state` as `HttpOnly; Secure; SameSite=None` before navigation when deployed. The top-level browser flow remains compatible with the platform's current `SameSite=Lax` fallback.
- The current YouBase deployment API returned internal error code `500001` after successful typecheck, build, route analysis, migration checks, storage verification, and bundle upload. The production site/native assets therefore need the normal YouWare Publish flow to go live.
- The complete uploaded MeInspect lockup is now used for the in-app/PWA logo and all generated Android/iOS launcher assets. Regeneration scripts preserve the full lockup rather than cropping to the symbol.
- Frontend production build and Capacitor Android/iOS sync pass. Android native compilation could not run in this environment because Java is unavailable.

## App Store Review Remediation (2026-08-05)
- Guideline 4.8: Google sign-in is no longer presented in the native iOS login or registration flows. iOS offers first-party email/password authentication only, so no third-party/social login service is used in the submitted iOS app. Google remains available on web and Android.
- Guideline 2.1(a): The sample report control now uses an explicit native-safe handler. In native builds it opens the verified production PDF in the iOS system browser; on web it opens a new tab. The control has a 44pt-equivalent touch target and an accessible label.
- Verified `https://app.meinspect.com/sample-inspection-report.pdf` responds successfully as `application/pdf`.
- Release version remains 1.0 and the iOS project build number is 15, following rejected build 14.
- Production frontend build and Capacitor iOS sync pass after the remediation.
