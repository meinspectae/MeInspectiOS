# MeInspect - Android Build & Play Store Publishing Guide

## Prerequisites
- Android Studio installed
- Java JDK 17+ installed
- ANDROID_HOME environment variable set
- Google Play Console account (for Play Store publishing)

---

## Build Steps

### Option 1: Using Android Studio (Recommended)
1. Open Android Studio
2. Click "Open an Existing Project"
3. Navigate to the `android` folder in this project
4. Wait for Gradle sync to complete
5. Click Build → Build Bundle(s) / APK(s) → Build APK(s)
6. APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option 2: Using Command Line
```bash
cd android
./gradlew assembleDebug
```
APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Play Store Publishing (AAB Build)

Google Play Store requires **App Bundle (AAB)** format, not APK.

### Step 1: Generate a Release Keystore (one-time setup)

```bash
keytool -genkey -v \
  -keystore keystore/release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias meinspect
```

Place the keystore at `keystore/release.jks` (already in .gitignore).

> ⚠️ **IMPORTANT**: Back up this keystore file AND remember the passwords.
> If you lose it, you CANNOT update your app on the Play Store.

### Step 2: Set Environment Variables

```bash
export KEYSTORE_PATH="/path/to/keystore/release.jks"
export KEYSTORE_PASSWORD="your_store_password"
export KEY_ALIAS="meinspect"
export KEY_PASSWORD="your_key_password"
```

### Step 3: Build Release AAB

```bash
cd android
./gradlew bundleRelease
```

AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 4: Build Signed APK (alternative, for testing)

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

---

## Version Management

Update version in `android/app/build.gradle`:
```groovy
defaultConfig {
    versionCode 3        // Increment for each Play Store release (integer)
    versionName "3.0"    // User-facing version (semantic versioning)
}
```

- `versionCode`: Must increase with every Play Store upload (integer only)
- `versionName`: Displayed to users in the Play Store

## Current Version: 3.0 (versionCode 3)

### Release Keystore (Pre-generated)

A release keystore has been generated at `keystore/release.jks`.
- **Format**: PKCS12
- **Alias**: `meinspect`
- **Store Password**: `MeInspect2024!`
- **Key Password**: `MeInspect2024!`
- **Validity**: 27+ years (10000 days)

> ⚠️ **IMPORTANT**: Back up `keystore/release.jks` AND remember the passwords above.
> If you lose it, you CANNOT update your app on the Play Store.

To build the release AAB, set environment variables or just run:
```bash
cd android
export KEYSTORE_PASSWORD="MeInspect2024!"
export KEY_PASSWORD="MeInspect2024!"
./gradlew bundleRelease
```

AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Android Permissions Configured

The following permissions are declared in `AndroidManifest.xml`:
- `INTERNET` — API communication
- `CAMERA` — Photo capture for inspections
- `ACCESS_FINE_LOCATION` — GPS tagging for photos
- `ACCESS_COARSE_LOCATION` — Approximate location
- `ACCESS_NETWORK_STATE` — Network status checks

---

## Play Store Listing Checklist

Before submitting to Play Store, prepare these in [Play Console](https://play.google.com/console):

### Required Assets
- [ ] **Screenshots**: 2–8 phone screenshots (16:9 or 9:16, min 320px, max 3840px)
- [ ] **Feature Graphic**: 1024 × 500 px (required for store listing)
- [ ] **High-res Icon**: 512 × 512 px (PNG, already have `meinspect-logo.png`)
- [ ] **Privacy Policy URL**: Must be publicly accessible
- [ ] **App Description**: Short (80 chars max) + Full (4000 chars max)

### Store Listing Content
- [ ] App name: "MeInspect — Property Condition Reports"
- [ ] Short description
- [ ] Full description with keywords
- [ ] Category: Business / Productivity
- [ ] Contact email
- [ ] Website URL (optional)

### Compliance
- [ ] Content Rating questionnaire (IARC)
- [ ] Data Safety declaration (what data you collect, how it's used)
- [ ] Target audience declaration
- [ ] Ads declaration (declare if app contains ads)

### Testing
- [ ] Closed testing track (internal/closed testing with 20+ testers)
- [ ] Open testing track (optional, for beta)
- [ ] Production track (full release)

---

## Updating the App

After making changes to the web app:
```bash
npm run build
npx cap sync android
```

Then rebuild the APK/AAB in Android Studio or via command line.

---

## Project Structure
```
android/
├── app/
│   ├── src/main/
│   │   ├── assets/public/    ← Your web app files
│   │   ├── java/             ← Native Android code
│   │   └── res/              ← Android resources (icons, splash)
│   ├── build.gradle          ← Build config (signing, ProGuard)
│   └── proguard-rules.pro    ← R8 minification rules
├── build.gradle
└── settings.gradle
keystore/
└── release.jks               ← Release signing keystore (gitignored)
```
