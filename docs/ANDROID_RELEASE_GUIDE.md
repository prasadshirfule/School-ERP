# School ERP — Capacitor Android Production Release & Signing Guide

This guide details the procedure for compiling, signing, and releasing the **School ERP Android Application** (`cloud.schoolerp.app`) for production distribution via Google Play Store and private MDM/APK channels.

---

## 1. Application Identity & Configuration

The Android application is powered by Capacitor and wraps the responsive Next.js frontend with native platform bridges.

- **Package Name / App ID:** `com.schoolerp.platform`
- **Application Name:** School ERP Cloud
- **Target SDK Version:** Android 14 (API 34)
- **Minimum SDK Version:** Android 8.0 (API 26)
- **Primary Configuration File:** [`capacitor.config.ts`](file:///e:/antigravity/scratch/school-erp/capacitor.config.ts)

---

## 2. Release Signing Key Generation

For production releases, generate an industry-standard 4096-bit RSA keystore:

```bash
keytool -genkey -v -keystore schoolerp-release-key.jks \
  -alias schoolerp-key \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -dname "CN=School ERP Cloud, OU=Production, O=Institutional ERP, L=Bangalore, ST=Karnataka, C=IN"
```

> [!CAUTION]
> Never commit `schoolerp-release-key.jks` into version control. Store it securely in a dedicated secrets manager or CI/CD secret vault.

---

## 3. Environment Variables for Automated CI/CD Signing

The project's [`android/app/build.gradle`](file:///e:/antigravity/scratch/school-erp/android/app/build.gradle) is pre-configured with environment variable overrides. Release signing triggers automatically when these variables are set:

```env
KEYSTORE_FILE=/path/to/schoolerp-release-key.jks
KEYSTORE_PASSWORD=your_secure_keystore_password
KEY_ALIAS=schoolerp-key
KEY_PASSWORD=your_secure_key_password
```

---

## 4. Build Instructions

### Step 4.1: Synchronize Capacitor Web Assets
```bash
# 1. Build the production Next.js static / export bundle
npm run build

# 2. Sync web assets and plugins to the native Android project
npx cap sync android
```

### Step 4.2: Build Google Play Store Bundle (AAB)
```bash
cd android
./gradlew bundleRelease
```
The signed Android App Bundle is generated at:
`android/app/build/outputs/bundle/release/app-release.aab`

### Step 4.3: Build Standalone APK (Enterprise / Direct Download)
```bash
cd android
./gradlew assembleRelease
```
The release APK is generated at:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 5. Security & Network Security Configuration

The Android application enforces strict modern security:
- **Cleartext Traffic Disabled:** `android:usesCleartextTraffic="false"` in `AndroidManifest.xml`.
- **TLS 1.3:** Enforced for all outbound connections to API gateways and PostgreSQL pooling endpoints.
- **Biometric / MFA Authenticator:** Compatible with Google Authenticator, Microsoft Authenticator, and hardware security keys.

---

## 6. Update Strategy

1. **Native Shell Updates (Capacitor / Plugins):** Increment `versionCode` and `versionName` in `android/app/build.gradle` and submit an updated bundle to Google Play Console.
2. **Web / Business Logic Updates:** Deployed directly to the cloud host (Neon PostgreSQL + Next.js). Parent and staff portals update instantly without requiring a re-download from app stores.
