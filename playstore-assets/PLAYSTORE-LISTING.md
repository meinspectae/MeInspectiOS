# MeInspect — Play Store Listing Guide

## 📁 Assets Created

| File | Size | Purpose |
|------|------|---------| 
| `feature-graphic.png` | 1024 × 500 px | Play Store banner (required) |
| `app-icon-512.png` | 512 × 512 px | High-res app icon |
| `feature-graphic.html` | — | Editable source (open in browser, screenshot at 1024×500) |
| `app-icon-512.html` | — | Editable source (open in browser, screenshot at 512×512) |

---

## 🛠️ Android Build Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| `minSdkVersion` | 24 (Android 7.0) | Covers all Pixel phones (Pixel 1 = API 25+), 99%+ of active devices |
| `targetSdkVersion` | 36 (Android 16) | Meets Google's API 35+ requirement ✅ |
| `compileSdkVersion` | 36 | Latest stable ✅ |
| `versionCode` | 1 | Increment this for every Play Store update |
| `versionName` | "1.0" | Human-readable version shown on Play Store |

### Pixel Phone Compatibility
All Pixel phones are fully compatible:
- **Pixel 1** (2016): shipped API 25, updated to API 29 → Compatible ✅
- **Pixel 2–4**: API 28–29 → Compatible ✅
- **Pixel 5–7**: API 30–33 → Compatible ✅
- **Pixel 8/9**: API 34–35 → Compatible ✅
- **Pixel Fold**: Foldable, API 33+ → Compatible ✅ (resizeableActivity=true added)
- **Pixel Tablet**: API 33 → Compatible ✅ (resizeableActivity=true added)

---

## 📝 Store Listing Copy

### App Name (30 char max)
```
MeInspect — Property Reports
```

### Short Description (80 char max)
```
Professional property condition reports for Dubai real estate inspections
```

### Full Description (4000 char max)
```
MeInspect is the professional property condition reporting app built for Dubai's real estate market. Whether you're a landlord, tenant, property manager, or inspector, MeInspect makes it easy to document property conditions with timestamped, geotagged photos and detailed item-by-item assessments.

KEY FEATURES

🏠 4 Property Types
Start inspections for Apartments, Townhouses, Villas, or Offices — each with tailored room templates and assessment items.

📋 6-Step Inspection Wizard
Guided step-by-step process: Property Details → Parties → Tenancy → Room Assessments → Digital Signatures → Report Generation.

📷 Photo Documentation
Capture photos directly from your device camera with automatic GPS coordinates and timestamps embedded for tamper-proof evidence.

✅ Room-by-Room Assessment
Rate every item from Very Good to Poor with space for detailed comments. Add or remove rooms and items to match the actual property.

✍️ Digital Signatures
Collect signatures from Tenant, Landlord, and Inspector directly on-screen using the built-in signature pad.

📄 Professional PDF Reports
Generate multi-page PDF reports including:
• Property summary with exterior photo
• Legal disclaimer (Arabic & English)
• Recording methodology (Arabic & English)
• Room-by-room condition tables
• Signatures and legal declaration
• SHA-256 hash for tamper verification
• Timestamp, geolocation, and page numbers

☁️ Cloud Sync
Inspections sync automatically between your device and the cloud. Access your reports from any device, anytime.

📧 Email Reports
Send professional PDF reports directly to landlords, tenants, and agents from within the app.

🔍 Inspection History
Browse and search all past inspections. Filter by property, date, or status.

💳 Secure Payments
Pay-per-report pricing with secure payment processing via Stripe.

BUILT FOR DUBAI
• 70+ Dubai community autocomplete suggestions
• Bilingual support (English & Arabic)
• Makani number integration
• Dubai-specific property templates
• Tamper-proof report verification

PRIVACY & SECURITY
• Your data is encrypted in transit and at rest
• Photos stored securely with ownership verification
• All API endpoints enforce user authentication
• No data shared with third parties
• GDPR-compliant data handling

MeInspect — Making property inspections professional, efficient, and trustworthy.
```

---

## 📱 Screenshots You Need to Capture

You need 2–8 phone screenshots (16:9 aspect ratio, min 320px, max 3840px width). Capture these screens in order:

### Screenshot 1: Dashboard (Hero Shot)
**What to show:** The main dashboard with the blue "Start a New Inspection" banner
**Caption to add:** "Start inspections in seconds"

### Screenshot 2: New Inspection — Property Type
**What to show:** The property type selection screen (Apartment, Townhouse, Villa, Office)
**Caption to add:** "Choose from 4 property types"

### Screenshot 3: Inspection Form — Room Assessment
**What to show:** A room with condition ratings (Very Good / Good / Fair / Poor) and the "Add Photo" button
**Caption to add:** "Rate every item room by room"

### Screenshot 4: Photo Capture
**What to show:** A photo being viewed with the GPS badge and timestamp
**Caption to add:** "GPS-tagged, timestamped photos"

### Screenshot 5: Digital Signatures
**What to show:** The signature pad with collected signatures
**Caption to add:** "Collect digital signatures on-site"

### Screenshot 6: PDF Report Preview
**What to show:** The generated PDF report (first page)
**Caption to add:** "Professional bilingual PDF reports"

### Screenshot 7: Inspection History
**What to show:** The history page with a list of past inspections
**Caption to add:** "Access all past inspections"

### Screenshot 8: Payment (Optional)
**What to show:** The payment modal or confirmation
**Caption to add:** "Secure pay-per-report pricing"

### How to Capture (Recommended Method)
1. Open the app in Chrome browser at your dev URL
2. Press F12 → Toggle device toolbar (Ctrl+Shift+M)
3. Select "Pixel 7" or "Samsung Galaxy S23" for phone size
4. Navigate to each screen and take a screenshot using the device toolbar
5. Or: Use Chrome DevTools command palette → "Capture screenshot"
6. Save each as PNG, 1080×1920 or 1080×2400 resolution

---

## 🏷️ Play Console Fields

### Category
```
Primary: Business
Secondary: Productivity
```

### Tags (for search)
```
property inspection, condition report, dubai real estate, property management, inspection app, tenant landlord, property report, dubai property, rental inspection, move-in move-out
```

### Contact Details
```
Email: hello@meinspect.com
Website: https://www.meinspect.com
Phone: [YOUR PHONE - optional]
```

### Privacy Policy URL
```
https://www.meinspect.com/privacy.html
```

### Data Safety — What to Declare

| Data Type | Collected? | Purpose | Shared? | Encrypted? |
|-----------|-----------|---------|---------|------------|
| Name | ✅ Yes | Account identification | ❌ No | ✅ Yes |
| Email | ✅ Yes | Authentication & reports | ❌ No | ✅ Yes |
| Phone number | ✅ Yes | Contact for inspections | ❌ No | ✅ Yes |
| Location (GPS) | ✅ Yes | Photo geotagging | ❌ No | ✅ Yes |
| Photos | ✅ Yes | Property documentation | ❌ No | ✅ Yes |
| Signatures | ✅ Yes | Legal documentation | ❌ No | ✅ Yes |
| Financial info | ✅ Yes | Payment processing (Stripe) | ✅ Stripe only | ✅ Yes |

### Content Rating
```
IARC: Everyone (no objectionable content)
Target age: 18+ (business app, not directed at children)
```

### Permissions Justification (for Play Console)

**CAMERA:**
"MeInspect uses the camera to capture property condition photos during inspections. These photos are automatically geotagged and timestamped to create tamper-proof documentation for property condition reports."

**LOCATION:**
"MeInspect uses location services to embed GPS coordinates into inspection photos. This provides verifiable proof of where each photo was taken, which is essential for the legal validity of property condition reports in Dubai's real estate market."

**READ_MEDIA_IMAGES (Android 13+):**
"MeInspect accesses the photo library to allow users to select existing photos for property documentation when using image selection instead of live camera capture."

**POST_NOTIFICATIONS (Android 13+):**
"MeInspect may send notifications to alert users about sync status and inspection completion."

---

## ✅ Pre-Submission Checklist

### Assets
- [ ] Upload `feature-graphic.png` (1024×500)
- [ ] Upload `app-icon-512.png` (512×512) — or use existing if higher quality
- [ ] Upload 2–8 phone screenshots

### Store Listing
- [ ] Fill in app name, short description, full description
- [ ] Set category: Business / Productivity
- [ ] Add search tags
- [ ] Add privacy policy URL: https://www.meinspect.com/privacy.html
- [ ] Add contact email: hello@meinspect.com and website: www.meinspect.com

### Technical / Compliance
- [ ] Fill Data Safety form (see table above)
- [ ] Complete IARC content rating questionnaire (select "Everyone")
- [ ] Set target age: 18+
- [ ] Declare permissions (Camera, Location, READ_MEDIA_IMAGES, POST_NOTIFICATIONS)
- [ ] Verify app works on Pixel 7 emulator before submission

### Release
- [ ] Upload signed AAB (from `android/app/build/outputs/bundle/release/`)
  - Build command: `cd android && ./gradlew bundleRelease`
  - AAB path: `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Enable Play App Signing (Google manages the app signing key after first upload)
- [ ] Start with **Closed Testing** track → add 20+ testers → promote to Production after successful testing

### App Signing (Important!)
1. On first upload, enable **Play App Signing** (recommended)
2. Google will generate and manage the app signing certificate
3. You upload with your own **upload key** (the keystore in `keystore/release.jks`)
4. Never lose or change your upload key — it's used to verify your identity for future updates

---

## 🔧 Android Manifest Changes Made (Latest)

The following Play Store–required improvements have been applied to `AndroidManifest.xml`:

| Change | Why |
|--------|-----|
| `android:dataExtractionRules` | Required for Android 12+ (API 31+) compliance |
| `android:fullBackupContent` | Required for Android 11 and below backup rules |
| `android:networkSecurityConfig` | Enforces HTTPS-only traffic (security policy) |
| `android:resizeableActivity="true"` | Supports Pixel Fold, Pixel Tablet, split-screen |
| `android:windowSoftInputMode="adjustResize"` | Prevents keyboard from covering input fields on all models |
| `<queries>` block | Required for Android 11+ (API 30+) to share PDFs/images |
| `READ_MEDIA_IMAGES` permission | Required for Android 13+ photo library access |
| `POST_NOTIFICATIONS` permission | Required for Android 13+ notification support |
