# iOS Compatibility Audit — UI / UX / QA

Reviewed via code inspection of `index.html`, `capacitor.config.json`, `ios/App/App/Info.plist`, and Tailwind usage across `src/`.

## ✅ Already in good shape
- **Viewport**: `width=device-width, initial-scale=1.0, viewport-fit=cover` is set — correctly enables safe-area support on notch/Dynamic-Island devices.
- **PWA/Web-app meta**: `apple-mobile-web-app-capable`, status-bar-style `black-translucent`, and app title are all present.
- **Safe-area insets**: `env(safe-area-inset-*)` is used in 6 places (login/layout padding) — good baseline coverage for notch and home-indicator areas.
- **Permission strings**: `Info.plist` declares `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`, `NSLocationWhenInUseUsageDescription` — required for camera/photo/GPS features used during inspections; App Store review will pass this check.
- **Touch targets**: several buttons use explicit `min-h-[44px]` / `min-w-[44px]` matching Apple's 44×44pt minimum tap-target guideline.
- **Capacitor plugin config**: Camera, Geolocation, StatusBar, SplashScreen are configured; `allowMixedContent: false` and no debug flags left on for release.

## ⚠️ Issues found / recommended fixes
1. **No iOS-specific block in `capacitor.config.json`** — currently only `android` has an override section. Recommend adding an `ios` block for `contentInset: "automatic"` and `scrollEnabled: true` to avoid keyboard-overlap issues on iPhone forms.
2. **Report page fixed pixel width (794px)** — on smaller iPhone widths (e.g. iPhone SE, 375px) the report preview relies entirely on a JS-computed `reportScale`; verify this still renders legibly at 320–375px logical width (should be fine since it scales the whole block, but worth a manual check on iPhone SE simulator).
3. **Bottom navigation / floating buttons** — confirm the app layout's bottom action bar respects `safe-area-inset-bottom` on iPhones with a home indicator (already used elsewhere in the app; verify `AppLayout`/`InspectionForm` footer buttons also include it — currently only 6 usages total, might not cover every bottom-fixed bar).
4. **Camera capture UX** — Capacitor's Camera plugin opens the native iOS camera sheet; ensure `photos` permission (`NSPhotoLibraryAddUsageDescription`) covers the "save inspection photo to library" flow if that's ever added.
5. **Font smoothing** — `-webkit-font-smoothing: antialiased` is already set globally, good for iOS Safari/WKWebView rendering.

## QA Checklist for iOS submission
- [ ] Test on iPhone SE (small screen), iPhone 15/16 (notch), iPhone 15/16 Pro Max (Dynamic Island + largest screen).
- [ ] Verify keyboard doesn't obscure form inputs during Inspection wizard (especially phone/email/password fields).
- [ ] Verify camera & photo-library permission prompts appear with the correct, translated description text.
- [ ] Verify PDF generation/share sheet works via `@capacitor/filesystem` + `@capacitor/share` on a real device (WKWebView `html2canvas` behavior can differ slightly from desktop Chrome).
- [ ] Confirm app icon, splash screen, and status bar color (`#2563eb`) render correctly across dark/light iOS system themes.
