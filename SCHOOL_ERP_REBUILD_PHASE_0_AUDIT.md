# SCHOOL ERP — PHASE 0: REBUILD PREPARATION AND INFRASTRUCTURE AUDIT

**Document Status:** Final Audit Report  
**Audit Executed:** Read-Only  
**Repository:** `https://github.com/prasadshirfule/School-ERP.git`  
**Production Deployment:** `https://school-erp-wb73.vercel.app`  
**Android Application Identity:** `com.schoolerp.platform` | **App Name:** `School ERP`  

---

## 1. Executive Summary

This audit establishes the baseline facts and architectural blueprint for rebuilding the School ERP platform completely from scratch while strictly preserving:
1. The existing GitHub repository identity and Git history.
2. The existing Vercel project deployment link and production domain.
3. The existing Capacitor Android application identity (`com.schoolerp.platform`), signing configuration, and native launcher settings.

All operations during Phase 0 have adhered strictly to the **READ-ONLY** safety mandate. Zero source files were modified, no databases were queried or migrated, no branches were switched, and zero deployments were initiated.

---

## 2. Current Infrastructure Findings (Task 1)

### 2.1 Git Repository & Working Tree Status
- **Current Active Branch:** `fix/school-erp-audit-remediation` (Up to date with `origin/fix/school-erp-audit-remediation`).
- **Working Tree:** Completely clean (`nothing to commit, working tree clean`).
- **Remote Configuration:**
  - `origin`: `https://github.com/prasadshirfule/School-ERP.git` (fetch & push)
  - `origin/HEAD`: Points to `origin/main`
- **Known Branches:**
  - Local: `fix/nextauth-production-server-error`, `fix/school-erp-audit-remediation`, `fix/school-erp-security-audit`, `main`
  - Remote: `origin/main` (latest commit `776f5f4 Merge pull request #1 from prasadshirfule/fix/school-erp-audit-remediation`), `origin/fix/school-erp-audit-remediation` (`d8afa2d`), `origin/fix/nextauth-production-server-error`, `origin/fix/school-erp-security-audit`.

### 2.2 Framework & Dependency Versions
Inspection of [package.json](file:///e:/antigravity/scratch/school-erp/package.json) confirms:
- **Next.js:** `16.3.5` (App Router)
- **React / React-DOM:** `19.2.8`
- **TypeScript:** `^5` (DevDependency: `typescript@^5`, runtime runner: `ts-node@^10.9.2`)
- **Prisma Client & CLI:** `^6.19.3`
- **NextAuth.js:** `^4.24.15` (NextAuth v4)
- **Capacitor Suite:** `@capacitor/core@^8.6.0`, `@capacitor/android@^8.6.0`, `@capacitor/cli@^8.6.0`, `@capacitor/splash-screen@^8.0.2`, `@capacitor/status-bar@^8.0.4`
- **Neon Cloud Packages:** `@neon/config@^1.11.3`, `@neon/env@^1.6.15`
- **Cloud Storage:** `@aws-sdk/client-s3@^3.1156.0`, `@aws-sdk/s3-request-presigner@^3.1156.0`
- **UI / Styling:** `tailwindcss@^4`, `@tailwindcss/postcss@^4`, `lucide-react@^1.45.0`
- **Validation & Crypto:** `zod@^4.6.5`, `bcryptjs@^3.0.3`
- **Test Framework:** `@playwright/test@^1.65.0`

### 2.3 Repository Layout & File Counts
- `src/` (351 total files):
  - `src/app`: App Router route handlers, layout trees, and role route groups:
    - `(admin)`: 22 pages (dashboard, students, admissions, classes, faculty, timetable, leave, certificates, id-cards, notices, settings)
    - `(teacher)`: 8 pages (dashboard, attendance, marks, syllabus, timetable, leave, homework)
    - `(accountant)`: 6 pages (dashboard, fee structures, invoices, payments, reports, receipts)
    - `(parent)`: 8 pages (dashboard, child selector, attendance, report cards, fees, timetable, notices)
    - `(super-admin)`: 6 pages (legacy multi-tenant platform administration)
    - `(auth)`: Login route and session wrappers
    - `api/`: ~50 route handlers covering auth, students, classes, attendance, marks, fees, razorpay, webhooks, search, notifications
  - `src/components`: UI components, modals, form inputs, printable cards, and institutional navigation shells.
  - `src/lib`: Core utility suite (`auth.ts`, `tenant.ts`, `security.ts`, `storage.ts`, `prisma.ts`, `env.ts`, `rateLimit.ts`, `razorpay.ts`, `validations.ts`, `totp.ts`).
  - `src/types`: Custom ambient definitions including `next-auth.d.ts`.
  - `src/middleware.ts`: Next.js Edge route guard resolving JWT tokens and mapping routes to allowed roles.
- `android/`: Native Android project container initialized with Capacitor 8.
- `prisma/`: Prisma configuration (`schema.prisma`), seed script (`seed.ts`), and 11 database migrations.
- `scripts/`: 20 automation and verification scripts (tenant scoping checker, auth regression, security suite, backup & storage, Android readiness).
- `public/`: Assets, branding logos, `manifest.json`, `sw.js` (PII-safe service worker), `offline-fallback.html`.
- `docs/`: Technical manuals (`ANDROID_RELEASE_GUIDE.md`, `MODULE_STATUS.md`, `NEXUS_ADMIN_API_CONTRACT.md`).
- `tests/`: End-to-end integration tests (`tests/e2e/school-erp-complete-journey.spec.ts`).

### 2.4 Existing Database Configuration & Migration Structure
- **ORM:** Prisma 6.19.3 with PostgreSQL dialect.
- **Connection Strings Used:**
  - `url = env("NEON_DATABASE_URL")` (Pooled connection for serverless runtime).
  - `directUrl = env("NEON_DATABASE_URL_UNPOOLED")` (Direct connection for Prisma Migrate).
- **Migration History (`prisma/migrations`):**
  1. `0_init` (Base schema)
  2. `20260914091800_make_student_section_optional`
  3. `20260914095322_add_student_photo_url`
  4. `20260914101123_add_school_settings_fields`
  5. `20260914102937_add_exam_slots_and_terms`
  6. `20260919180125_add_timetable_syllabus_certificates`
  7. `20260919182316_add_batch_a_staff_ops`
  8. `20261025115500_add_relational_performance_indexes`
  9. `20261108120000_phase1_platform_governance`
  10. `20261108130000_phase2_mfa_and_security_hardening`
  11. `20261109130000_phase3_saas_features`
- **Migration Drift & Clutter Assessment:**
  The schema has evolved across 11 incremental migrations, accumulating deprecated fields, legacy multi-tenant SaaS constructs, and iterative patches. A fresh rebuild requires collapsing this legacy chain into a clean, canonical baseline migration.

### 2.5 Existing Environment-Variable Names (Zero Secrets Exposed)
From `.env`, `.env.example`, and `.env.test.local`:
- **Database:** `NEON_DATABASE_URL`, `NEON_DATABASE_URL_UNPOOLED`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`, `TEST_POSTGRES_DATABASE_URL`
- **Authentication:** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_TRUST_HOST`
- **Security:** `PII_ENCRYPTION_KEY`
- **Storage:** `STORAGE_PROVIDER`, `AWS_S3_BUCKET`, `AWS_S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_ENDPOINT`
- **Payments:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- **Communications:** `FAST2SMS_API_KEY`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- **Safety Flags:** `ALLOW_DESTRUCTIVE_SEED`, `RESET_DB`

### 2.6 Test Infrastructure & CI Workflows
- **GitHub Actions:** No `.github/workflows` directory currently exists in the repository. CI has not been automated via GitHub Actions.
- **Automated Verification:** Executed via `npm test`, which runs a chain of 13 TypeScript test scripts:
  `check:tenant-scoping`, `test:tenant`, `test:security`, `test:auth`, `test:public-access`, `test:multi-school-parent`, `test:suspension-revocation`, `test:totp`, `test:mfa`, `test:phase2-db`, `test:phase2-evidence`, `test:saas`, and `test:e2e`.
- **Predev Hook:** `"predev": "npm run check:tenant-scoping"` guards against any un-scoped Prisma models during local development.

---

## 3. Capacitor and Android Inspection (Task 2)

### 3.1 Android Identity & Native Configuration
- **Application ID:** `com.schoolerp.platform`
  - Verified in [capacitor.config.ts](file:///e:/antigravity/scratch/school-erp/capacitor.config.ts#L4) (`appId: "com.schoolerp.platform"`).
  - Verified in [android/app/build.gradle](file:///e:/antigravity/scratch/school-erp/android/app/build.gradle#L4) (`namespace = "com.schoolerp.platform"`, `applicationId "com.schoolerp.platform"`).
  - Verified in [android/app/src/main/res/values/strings.xml](file:///e:/antigravity/scratch/school-erp/android/app/src/main/res/values/strings.xml#L5) (`package_name`: `com.schoolerp.platform`).
- **App Name:** `School ERP`
  - Verified in [capacitor.config.ts](file:///e:/antigravity/scratch/school-erp/capacitor.config.ts#L5) (`appName: "School ERP"`).
  - Verified in [android/app/src/main/res/values/strings.xml](file:///e:/antigravity/scratch/school-erp/android/app/src/main/res/values/strings.xml#L3) (`app_name`: `School ERP`).
- **MainActivity Architecture:**
  - File: [android/app/src/main/java/com/schoolerp/platform/MainActivity.java](file:///e:/antigravity/scratch/school-erp/android/app/src/main/java/com/schoolerp/platform/MainActivity.java).
  - Extends `com.getcapacitor.BridgeActivity`.
  - Current configuration uses a hardcoded constant: `PROD_URL = "https://school-erp-wb73.vercel.app"`.
  - Supports a developer escape hatch via Volume Down double-click (`showServerSelectorDialog()`), allowing runtime override stored in `SharedPreferences` (`SchoolErpPrefs`).
  - Supports native WebView back navigation via `onBackPressed()` overriding `getBridge().getWebView().goBack()`.
- **AndroidManifest.xml:**
  - Configured with `AppTheme.NoActionBarLaunch` and single-task launch mode.
  - Declares `FileProvider` authorities `${applicationId}.fileprovider`.
  - Declared permissions:
    - `android.permission.INTERNET`
    - `android.permission.ACCESS_NETWORK_STATE`
    - Zero over-privileged permissions (no unnecessary camera, audio, or location permissions requested at manifest root).
- **Gradle & SDK Configuration:**
  - [android/variables.gradle](file:///e:/antigravity/scratch/school-erp/android/variables.gradle):
    - `minSdkVersion`: 24 (Android 7.0 Nougat)
    - `compileSdkVersion`: 36 (Android 16 Developer Preview)
    - `targetSdkVersion`: 36
    - Core dependencies: `androidxAppCompatVersion = '1.7.1'`, `coreSplashScreenVersion = '1.2.0'`.
  - [android/build.gradle](file:///e:/antigravity/scratch/school-erp/android/build.gradle):
    - Android Gradle Plugin: `com.android.tools.build:gradle:9.4.1`
    - Google Services plugin: `4.4.4`
  - [android/gradle/wrapper/gradle-wrapper.properties](file:///e:/antigravity/scratch/school-erp/android/gradle/wrapper/gradle-wrapper.properties):
    - Gradle distribution: `gradle-9.6.0-all.zip`.
- **Splash Screen & Status Bar:**
  - Capacitor plugins `@capacitor/splash-screen` and `@capacitor/status-bar` installed.
  - Splash duration: 2000ms with spinner, auto-hide, full screen, immersive mode, centered crop.
  - Background color: `#1e3a8a` (Deep institutional blue).
  - Status bar style: Dark with background `#1e3a8a`.
  - Splash drawables present across `drawable-land-*` and `drawable-port-*` for `mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, and `xxxhdpi`.
- **WebView & HTTPS:**
  - `server.androidScheme`: `https`.
  - `server.cleartext`: `true` (Enabled for local LAN testing).
  - PWA manifest (`public/manifest.json`) and service worker (`public/sw.js`) include safety guard `isSensitivePortalRoute` preventing offline caching of authenticated portal data or student PII.

### 3.2 Mobile Risk Analysis & Staging Proposal
> [!CRITICAL]
> **Production Leak Risk in Mobile Config:**  
> The current `capacitor.config.ts` hardcodes `server.url = "https://school-erp-wb73.vercel.app"`. Any debug or test APK built from the repository will immediately connect to the live production server and interact with the production database.

#### Safe Development & Staging Mobile Architecture Proposal
To guarantee that test APKs never touch production data, the Capacitor and Android configuration should be structured as follows:

```
                      ┌──────────────────────────────────────────────┐
                      │           Android Build Trigger              │
                      └──────────────────────┬───────────────────────┘
                                             │
                   ┌─────────────────────────┴─────────────────────────┐
                   ▼                                                   ▼
       ┌───────────────────────┐                           ┌───────────────────────┐
       │   assembleStaging     │                           │   assembleProduction  │
       │   Flavor: staging     │                           │   Flavor: production  │
       └───────────┬───────────┘                           └───────────┬───────────┘
                   │                                                   │
                   ▼                                                   ▼
       ┌───────────────────────┐                           ┌───────────────────────┐
       │ App Name:             │                           │ App Name:             │
       │ "School ERP (Staging)"│                           │ "School ERP"          │
       │ App ID:               │                           │ App ID:               │
       │ com.schoolerp.staging │                           │ com.schoolerp.platform│
       │ Server URL:           │                           │ Server URL:           │
       │ https://staging-...   │                           │ https://school-erp-...│
       │ Database:             │                           │ Database:             │
       │ Neon DEV Branch       │                           │ Neon PROD Branch      │
       └───────────────────────┘                           └───────────────────────┘
```

1. **Environment-Driven `capacitor.config.ts`:**
   Read `process.env.CAPACITOR_SERVER_URL` with strict fallback:
   - If `NODE_ENV === "production"`, use `https://school-erp-wb73.vercel.app`.
   - If `BUILD_VARIANT === "staging"`, use the staging URL (e.g. `https://staging-school-erp.vercel.app`).
   - For local development, allow `http://10.0.2.2:3000` (Android emulator loopback) or local WiFi IP.
2. **Gradle Product Flavors (`android/app/build.gradle`):**
   ```groovy
   flavorDimensions "environment"
   productFlavors {
       staging {
           dimension "environment"
           applicationIdSuffix ".staging"
           resValue "string", "app_name", "School ERP (Staging)"
           buildConfigField "String", "SERVER_URL", "\"https://staging-school-erp.vercel.app\""
       }
       production {
           dimension "environment"
           resValue "string", "app_name", "School ERP"
           buildConfigField "String", "SERVER_URL", "\"https://school-erp-wb73.vercel.app\""
       }
   }
   ```
3. **MainActivity Server URL Resolution:**
   Replace the hardcoded `PROD_URL` with `BuildConfig.SERVER_URL`.

---

## 4. GitHub and Vercel Deployment Findings (Task 3)

### 4.1 Verified Items
- **GitHub Repository:** `prasadshirfule/School-ERP.git`
- **Default Branch:** `main` (verified by `git remote show origin`).
- **Production URL:** `https://school-erp-wb73.vercel.app` (verified in `capacitor.config.ts`, `MainActivity.java`, and `DEPLOYMENT_RUNBOOK.md`).
- **Vercel Build Command:** Default Next.js build command (`next build`).
- **Vercel Install Command:** Default package install (`npm install`).

### 4.2 Unverified Items (Requires Vercel Dashboard / Credentials)
- **Vercel CLI / Token Access:** Vercel CLI is not installed locally and no `.vercel/` credentials folder exists in the workspace.
- **Vercel Environment Variables:** Exact values configured on Vercel cannot be queried via CLI.
- **Custom Domains:** No custom domain is committed to code; only the standard Vercel subdomain `school-erp-wb73.vercel.app` is recorded.
- **Branch Deployments & Preview Settings:** Cannot verify whether preview deployments are currently enabled for all pull requests or restricted to specific branches.

### 4.3 Production vs Preview Isolation Plan
- **Production Branch (`main`):**
  - Triggers production deployment to `https://school-erp-wb73.vercel.app`.
  - Connects strictly to Neon PostgreSQL **Production Database / Production Branch**.
- **Staging / Preview Branch (`staging` / PRs):**
  - Triggers preview deployment to `https://staging-school-erp.vercel.app` or unique preview URLs.
  - Connects strictly to Neon PostgreSQL **Development / Staging Branch**.

---

## 5. Database Separation Plan (Task 4)

### 5.1 Architecture: Lakebase / Neon Postgres Branching
To prevent development or staging tests from ever mutating live school records, the project must utilize Neon's native branching architecture:

```
                            ┌──────────────────────────────────────┐
                            │      Neon Project: plain-surf        │
                            │      Org: org-wandering-band         │
                            └──────────────────┬───────────────────┘
                                               │
                    ┌──────────────────────────┴──────────────────────────┐
                    ▼                                                     ▼
        ┌─────────────────────────┐                           ┌─────────────────────────┐
        │   PRODUCTION BRANCH     │                           │   DEVELOPMENT BRANCH    │
        │   (branch: production)  │                           │   (branch: dev/staging) │
        ├─────────────────────────┤                           ├─────────────────────────┤
        │ • Live School Data      │                           │ • Synthetic Seed Data   │
        │ • Point-in-time Backup  │                           │ • Automated Migrations  │
        │ • Continuous Archival   │                           │ • Safe Test Execution   │
        │ • Pooled & Direct URLs  │                           │ • Instant Reset/Fork    │
        └───────────┬─────────────┘                           └───────────┬─────────────┘
                    │                                                     │
                    ▼                                                     ▼
        ┌─────────────────────────┐                           ┌─────────────────────────┐
        │  Vercel Production Env  │                           │  Vercel Preview / Local │
        │  (school-erp-wb73)      │                           │  (.env / staging)       │
        └─────────────────────────┘                           └─────────────────────────┘
```

### 5.2 Key Database Requirements
1. **Fresh Prisma Schema & Baseline Migration:**
   - Eliminate obsolete SaaS models (e.g. `PlatformSubscription`, `NexusPlatformMetric`, `SuperAdminCredential`) that deviate from institutional requirements.
   - Generate a single clean initial migration: `prisma/migrations/0_init/migration.sql`.
2. **PostgreSQL Row-Level Security (RLS):**
   - In addition to Prisma Client tenant extensions, enforce PostgreSQL RLS policies on all 21 tenant models:
     ```sql
     ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
     CREATE POLICY tenant_isolation_policy ON "Student"
       USING ("schoolId" = current_setting('app.current_school_id', true));
     ```
3. **Automated Backups & Point-in-Time Recovery (PITR):**
   - Neon provides continuous write-ahead log (WAL) archiving with instant point-in-time restore.
   - Supplement with automated daily snapshot exports (`pg_dump`) to private S3 storage.

---

## 6. Target Application Architecture & RBAC (Task 4)

### 6.1 The Five School Roles
The system must center strictly on the 5 authenticated school roles:

| Role Enum | Portal Prefix | Target Users | Key Capabilities |
| :--- | :--- | :--- | :--- |
| `ADMIN` | `/admin` | School System Administrator | Master setup, classes, sections, admissions, year rollover, audit logs, fee templates, notices |
| `PRINCIPAL` | `/principal` or `/admin` | Academic Head / Principal | Staff leave approval, student oversight, academic performance reports, TC approvals, notices |
| `ACCOUNTANT`| `/accountant`| School Bursar / Accounts | Fee invoices, payment receipts, offline fee collection, overdue alerts, payment reconciliations |
| `TEACHER`   | `/teacher`   | Teaching Faculty | Daily attendance register, marks entry, syllabus milestones, timetable, homework, leave requests |
| `PARENT`    | `/parent`    | Guardians & Parents | Multi-child switcher, attendance view, report cards, fee payment, notices, syllabus tracking |

### 6.2 Authentication & Server-Side RBAC Architecture
- **NextAuth v4 Configuration:**
  - Credentials Provider using bcrypt password verification.
  - JWT Session Strategy (Edge-compatible, stateless, scalable).
  - Session payload embeds: `userId`, `role`, `schoolId`, `email`, `name`, `status`.
- **Server-Side Enforcement (Defense in Depth):**
  1. **Edge Middleware (`src/middleware.ts`):** Validates JWT and enforces route-prefix authorization before rendering.
  2. **Server Actions / API Route Helpers:**
     ```typescript
     export async function requireAuth(roles: Role[]) {
       const session = await getServerSession(authOptions);
       if (!session || !roles.includes(session.user.role)) {
         throw new ForbiddenError("Access denied");
       }
       return session.user;
     }
     ```
  3. **Prisma Tenant Extension (`src/lib/tenant.ts`):** Auto-scopes every database read, update, create, and delete to `session.user.schoolId`.

### 6.3 Private File Storage
- Private S3/R2 bucket configuration with zero public read permissions.
- Student photos, certificates, transfer certificates, and assignment files generated/served through presigned URLs with 15-minute expiration (`@aws-sdk/s3-request-presigner`).

### 6.4 Immutable Audit Logging
- Dedicated `AuditLog` table capturing:
  - `id`, `schoolId`, `userId`, `action` (e.g. `STUDENT_ADMITTED`, `MARKS_SUBMITTED`, `FEE_RECORDED`), `entityType`, `entityId`, `ipAddress`, `metadata` (JSON), `createdAt`.
- Immutable append-only pattern.

---

## 7. Recommended New Folder Architecture (Task 5)

A clean, modular App Router architecture designed for clear separation of concerns:

```
school-erp/
├── android/                         # Preserved Capacitor Android native project
│   ├── app/
│   │   ├── build.gradle             # Flavored Android Gradle build (staging/prod)
│   │   └── src/main/...             # MainActivity, AndroidManifest, Drawables
│   ├── build.gradle
│   └── variables.gradle
├── docs/                            # Operational & Architecture Documentation
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT_RUNBOOK.md
│   └── MOBILE_RELEASE_GUIDE.md
├── prisma/                          # Clean Database Schema & Migrations
│   ├── migrations/
│   │   └── 0_init/
│   │       └── migration.sql        # Clean baseline migration
│   ├── schema.prisma                # Canonical multi-tenant schema (5 roles)
│   └── seed.ts                      # Non-destructive institutional demo seed
├── public/                          # Static Web & Native Assets
│   ├── icons/
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # PII-safe service worker
│   └── offline-fallback.html
├── scripts/                         # Operational & Integrity Automation
│   ├── check-tenant-scoping.ts      # Schema tenant isolation drift guard
│   ├── backup-database.ts           # Automated dump utility
│   └── verify-android-readiness.ts  # Pre-build native validation
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (portals)/               # Authenticated Role Portals
│   │   │   ├── admin/...            # Administrator & Principal workspace
│   │   │   ├── teacher/...          # Teacher workspace
│   │   │   ├── accountant/...       # Accountant workspace
│   │   │   └── parent/...           # Parent portal
│   │   ├── api/                     # Shared RESTful Endpoints (Web + Mobile)
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── students/
│   │   │   ├── attendance/
│   │   │   ├── marks/
│   │   │   ├── fees/
│   │   │   ├── notices/
│   │   │   └── storage/
│   │   ├── layout.tsx
│   │   └── page.tsx                 # Institutional Landing / Portal Router
│   ├── components/                  # Design System & UI Components
│   │   ├── layout/                  # Shells, headers, sidebars
│   │   ├── ui/                      # Atoms (Buttons, Dialogs, Tables, Badges)
│   │   ├── student/                 # Student profile, ID card, admission forms
│   │   ├── finance/                 # Fee invoice templates, receipts
│   │   └── mobile/                  # Native wrapper controls (back button, offline)
│   ├── lib/                         # Core Server & Shared Utilities
│   │   ├── auth.ts                  # NextAuth options & role guards
│   │   ├── db.ts                    # Prisma client singleton
│   │   ├── tenant.ts                # Prisma tenant isolation extension
│   │   ├── rls.ts                   # PostgreSQL RLS session connector
│   │   ├── storage.ts               # S3/R2 presigned storage provider
│   │   ├── audit.ts                 # Immutable audit log writer
│   │   ├── security.ts              # AES-256 PII encryption & masking
│   │   └── validations/             # Zod input validation schemas
│   ├── types/                       # TypeScript declaration files
│   │   └── next-auth.d.ts
│   └── middleware.ts                # Edge JWT RBAC routing guard
├── capacitor.config.ts              # Dynamic environment-aware Capacitor config
├── next.config.ts                   # Production security headers & config
├── package.json
└── tsconfig.json
```

---

## 8. Mobile Testing Strategy (Task 5)

### 8.1 Development Cycle (Local)
1. Run local Next.js dev server: `npm run dev`.
2. Connect Capacitor Android emulator via `http://10.0.2.2:3000` or physical device via LAN IP.
3. Use the built-in Volume Down server switcher for instant live reloading during UI debugging.

### 8.2 Staging / Test APK Cycle
1. Commit changes to `staging` branch.
2. Vercel automatically deploys to Staging URL connected to the Neon `dev` database branch.
3. Build Staging APK: `./gradlew assembleStagingDebug`.
4. Install on physical Android test devices. Test APK connects exclusively to the Staging URL and test database.
5. Verify offline fallback, session resumption, push notifications, and PDF downloads without touching production records.

### 8.3 Release / Production APK Cycle
1. Merge vetted code into `main` branch.
2. Production Vercel deployment updates live web application.
3. Build signed Release APK / App Bundle: `./gradlew assembleProductionRelease`.
4. Run automated pre-release verification: `npm run verify:android`.

---

## 9. Risks and Prerequisites (Task 5)

### 9.1 Technical & Operational Risks
| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| **Accidental Production Database Overwrite** | Critical | Enforce separate Neon branches with unique credentials; disable destructive seeding in code. |
| **Mobile App Pointing to Live DB during QA** | Critical | Introduce Gradle build flavors (`staging` vs `production`) and environment-driven `capacitor.config.ts`. |
| **Cross-Tenant Data Leakage** | High | Dual enforcement: Prisma Client tenant extension + PostgreSQL Row-Level Security (RLS). |
| **Unprotected Student PII (Aadhaar / Medical)** | High | AES-256-GCM encryption at rest; UI masking to show only last 4 digits. |
| **Vercel Build Failure on Edge Middleware** | Medium | Keep `middleware.ts` strictly free of heavy DB engines, native modules, and Prisma runtimes. |
| **Public Asset Exposure** | Medium | Private S3/R2 buckets with short-lived presigned URLs for all sensitive student documents. |

### 9.2 Prerequisites for Phase 1
1. **Neon Branches Created:**
   - Active Production branch (`production`).
   - Active Staging/Dev branch (`dev`).
2. **Environment Variable Separation:**
   - Dedicated staging database credentials and NextAuth secrets prepared.
3. **Approval to Proceed:**
   - Formal sign-off on the Phase 0 audit report and rebuild plan.

---

## 10. Exact Files for Replacement or Removal (Task 5)

### 10.1 Files Slated for Replacement (Rewrite)
- `prisma/schema.prisma`: Replaced with a clean, normalized schema centered on the 5 school roles, removing legacy SaaS metrics and multi-tenant billing tables.
- `prisma/migrations/*`: Replace the 11 legacy migrations with a single clean baseline migration (`0_init`).
- `prisma/seed.ts`: Replaced with a clean, realistic institutional seed script (2 complete schools with realistic Indian CBSE/ICSE curriculum and academic rosters).
- `capacitor.config.ts`: Enhanced to support dynamic staging and production server URLs based on build environment.
- `src/middleware.ts`: Streamlined to cleanly enforce the 5 roles without legacy SaaS route checks.
- `src/lib/auth.ts`: Refactored for clean NextAuth v4 Credentials provider, typed session callbacks, and robust error handling.
- `src/lib/tenant.ts`: Enhanced with PostgreSQL RLS context injection.

### 10.2 Files Slated for Removal (Pruning Legacy & Redundant Code)
- `src/app/(super-admin)/`: Remove super-admin/nexus SaaS billing and platform oversight pages outside the 5 school roles.
- `src/app/api/nexus/`: Remove non-institutional platform metric endpoints.
- `src/lib/subscription.ts`: Remove SaaS billing subscription logic.
- `scripts/seed-super-admin.ts`: Remove super-admin seed script.
- `docs/NEXUS_ADMIN_API_CONTRACT.md`: Remove legacy platform admin API contract.
- `eslint_report.json`: Remove stale local audit artifact (1.2MB).

---

## 11. Proposed Implementation Phases (Task 5)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Phase 0: Rebuild Preparation & Infrastructure Audit (COMPLETE)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Phase 1: Environment Isolation & Fresh Database Foundation            │
│  • Neon dev & prod branch credentials configuration                    │
│  • Fresh Prisma schema (5 roles) & consolidated 0_init baseline        │
│  • Dual-layer tenant isolation (Prisma Extension + PostgreSQL RLS)     │
│  • Institutional demo seeding script                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Phase 2: Authentication, Security & Core Infrastructure               │
│  • NextAuth v4 Credentials provider & Edge middleware                  │
│  • Server-side RBAC guards for the 5 school roles                      │
│  • AES-256 PII encryption & Zod input validation suite                 │
│  • S3/R2 presigned private storage driver                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Phase 3: Core Academic & Administrative Modules                       │
│  • Administrator & Principal Portal: Setup, classes, faculty, students │
│  • Student admissions, ID card generator, TC management, rollover      │
│  • Teacher Workspace: Attendance register, marks, syllabus milestones  │
│  • Immutable audit logging engine                                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Phase 4: Finance, Parent Portal & Communications                      │
│  • Accountant Portal: Fee structures, bulk invoices, receipts, overdue │
│  • Parent Portal: Multi-child switcher, marks, attendance, fees        │
│  • Notice board & multi-channel broadcast engine                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Phase 5: Android Native Parity & Staging Verification                 │
│  • Dynamic Capacitor staging/production configuration                  │
│  • Android Gradle flavor setup (`assembleStaging` / `assembleRelease`) │
│  • PWA offline safety & WebView verification                           │
│  • Comprehensive end-to-end regression & release sign-off              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Checklist for Safely Starting Phase 1 (Task 5)

- [ ] **Phase 0 Sign-Off:** User reviews and approves this audit report (`SCHOOL_ERP_REBUILD_PHASE_0_AUDIT.md`).
- [ ] **Git Branching Strategy:** Create a clean rebuild branch (e.g. `rebuild/clean-slate`) branching from `main`. Keep `main` safe and protected.
- [ ] **Neon Database Verification:**
  - Verify access to the Neon console.
  - Confirm `production` branch is isolated and protected.
  - Create or confirm a clean `dev` branch for running migrations and seeding.
- [ ] **Local Environment Configuration:**
  - Ensure `.env` is configured with the Neon `dev` branch URL.
  - Confirm `NEXTAUTH_SECRET` and `PII_ENCRYPTION_KEY` are populated.
- [ ] **Baseline Migration Ready:**
  - Archive existing 11 migrations safely before generating the fresh initial migration.
- [ ] **Android Flavor Blueprint Ready:**
  - Confirm Gradle configuration variables are preserved for `com.schoolerp.platform`.
