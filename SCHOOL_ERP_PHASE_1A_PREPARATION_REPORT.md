# SCHOOL ERP — PHASE 1A: SAFE REBUILD FOUNDATION PREPARATION REPORT

**Document Status:** Complete & Verified Infrastructure Baseline  
**Date:** November 9, 2026  
**Active Working Branch:** `rebuild/clean-slate`  
**Base Commit:** `776f5f4591c38f26f8e5c55d39e46846d8e1f428` (`origin/main`)  
**GitHub Repository:** `https://github.com/prasadshirfule/School-ERP.git`  
**Production Vercel URL:** `https://school-erp-wb73.vercel.app`  
**Production Android Application ID:** `com.schoolerp.platform` | **App Name:** `School ERP`

---

## 1. Executive Summary

Phase 1A has successfully prepared a safe, isolated, and strictly non-destructive foundation for rebuilding the School ERP platform completely from scratch.

### Key Accomplishments in Phase 1A:
1. **Git Isolation Verified & Executed:** A dedicated rebuild branch, `rebuild/clean-slate`, was created directly from the latest verified production commit `origin/main` (`776f5f4`). The local `main` branch, all remote branches, and previous remediation branches remain 100% untouched. No force push or remote push has occurred.
2. **Complete Legacy Archive Created:** All 11 legacy Prisma database migrations (covering initial schema through Phases 1, 2, and 3), the legacy Prisma schema files, seed script, environment templates, and Capacitor configurations were preserved in an isolated directory (`archive/legacy-prisma-migrations/` and `archive/`). The active `prisma/migrations/` remains intact until verified migration cutover.
3. **Android Native Project Preserved:** The native Capacitor Android container (`android/` and `capacitor.config.ts`) was preserved on the rebuild branch.
4. **Neon Database Isolation Plan Established:** Verified that the active Neon CLI profile is authenticated and identified the single existing project (`plain-surf-10645492`, branch `production`, compute `0.25-2 CU`, Free tier with 6-hour history retention). Formulated a strict database isolation plan guaranteeing that development and staging will never connect to the old or production database.
5. **Vercel Staging Isolation Plan Formulated:** Verified Vercel environment separation requirements. Production deployments will remain bound to `main`, while preview/staging deployments will be bound to `rebuild/clean-slate` with isolated staging credentials.
6. **Android Product Flavor Architecture Designed:** Engineered a zero-risk multi-flavor Gradle architecture separating `com.schoolerp.platform.staging` (School ERP Staging) from `com.schoolerp.platform` (School ERP Production) so both APKs can be installed side-by-side without URL or keystore conflicts.
7. **CI/CD Quality Pipeline Planned:** Audited repository verification tools and designed an automated GitHub Actions pipeline.

---

## 2. Section A: Git Status & Branch Safety

### 2.1 Branch & Commit Lineage
- **Starting Branch:** `fix/school-erp-audit-remediation` (`d8afa2dff4296d5e5d0edf0b2973d45cc4e953ab`)
- **Verified Production Remote Commit:** `origin/main` at `776f5f4591c38f26f8e5c55d39e46846d8e1f428` ("Merge pull request #1 from prasadshirfule/fix/school-erp-audit-remediation")
- **New Rebuild Branch Created:** `rebuild/clean-slate`
  - Created via: `git checkout -b rebuild/clean-slate origin/main`
  - Base Commit: `776f5f4591c38f26f8e5c55d39e46846d8e1f428`
  - Upstream Tracking: `origin/main`
- **Local `main` Status:** `c183b08edc2a9ac21e23812ccb428ff75a55205b` (Unchanged, 5 commits behind `origin/main`, preserved without any modifications).
- **Working Tree Status:** Clean and isolated on `rebuild/clean-slate`.
- **Remote Push Status:** Zero remote push commands executed. The branch `rebuild/clean-slate` exists only locally.

### 2.2 Branch Topology Table
| Branch Name | Commit SHA | Tracking Remote | State / Role |
| :--- | :--- | :--- | :--- |
| `rebuild/clean-slate` | `776f5f4` | `origin/main` | **Active Rebuild Branch** (Fresh start) |
| `main` (local) | `c183b08` | `origin/main` | Preserved untouched |
| `origin/main` | `776f5f4` | — | Canonical remote production branch |
| `fix/school-erp-audit-remediation` | `d8afa2d` | `origin/fix/school-erp-audit-remediation` | Preserved audit history |
| `fix/nextauth-production-server-error`| `077cacd` | `origin/fix/nextauth-production-server-error` | Preserved legacy fix |
| `fix/school-erp-security-audit` | `222d513` | `origin/fix/school-erp-security-audit` | Preserved security audit |

---

## 3. Section B: Legacy Preservation & Archive Audit

All legacy database migrations and essential reference artifacts have been preserved in `archive/` without copying obsolete application architecture.

### 3.1 Migration Archive Inventory (`archive/legacy-prisma-migrations/`)
All 11 migrations are preserved with their exact directory structure, `migration.sql` contents, and `migration_lock.toml`:

| # | Migration Directory Name | Applied Scope & Description | SQL Status |
| :---: | :--- | :--- | :---: |
| 1 | `0_init` | Initial monolithic PostgreSQL schema | Verified (1,154 lines) |
| 2 | `20260914091800_make_student_section_optional` | Student admission section decoupling | Verified (3 lines) |
| 3 | `20260914095322_add_student_photo_url` | Adds `photoUrl` to Student | Verified (2 lines) |
| 4 | `20260914101123_add_school_settings_fields` | Adds institutional branding columns to School | Verified (13 lines) |
| 5 | `20260914102937_add_exam_slots_and_terms` | Adds ExamSlot model & term associations | Verified (28 lines) |
| 6 | `20260919180125_add_timetable_syllabus_certificates` | Timetable slots, syllabus topics, certificate log | Verified (91 lines) |
| 7 | `20260919182316_add_batch_a_staff_ops` | Staff departments, leaves, assignments | Verified (83 lines) |
| 8 | `20261025115500_add_relational_performance_indexes` | Relational query performance B-tree indexes | Verified (32 lines) |
| 9 | `20261108120000_phase1_platform_governance` | SuperAdmin audit logs, registration, platform role | Verified (182 lines) |
| 10 | `20261108130000_phase2_mfa_and_security_hardening` | TOTP MFA secrets, encryption, rate limits | Verified (74 lines) |
| 11 | `20261109130000_phase3_saas_features` | Razorpay subscriptions, tiered pricing, docs | Verified (98 lines) |
| - | `migration_lock.toml` | Prisma migrate engine provider lock (`postgresql`) | Verified (128 bytes) |

### 3.2 Supplemental Legacy Archive (`archive/`)
- `archive/legacy-schema.prisma`: Baseline schema from `origin/main` (18,950 bytes).
- `archive/legacy-schema-remediation.prisma`: Extended 30-model schema from commit `d8afa2d` (28,038 bytes).
- `archive/legacy-seed.ts`: Complete institutional seed script with demo credentials (32,202 bytes).
- `archive/legacy-env.example`: Non-secret environment template (4,033 bytes).
- `archive/legacy-capacitor.config.ts`: Baseline Capacitor 8 configuration (772 bytes).

### 3.3 Preserved Untouched Artifacts
- Active `prisma/migrations/`: Left intact in place until new schema baseline in Phase 1B is authorized.
- `android/`: Native Android project container checked out on `rebuild/clean-slate`.
- `public/`: Branding assets, logos, PII-safe service worker (`sw.js`), and offline fallback.
- `SCHOOL_ERP_REBUILD_PHASE_0_AUDIT.md`: Untracked comprehensive Phase 0 audit report.

---

## 4. Section C: Neon Database Isolation Plan

### 4.1 Current Neon State
- **CLI Tool:** `@neon/cli` version `8.23.4` installed and active.
- **Authentication:** Authenticated via OAuth profile `DEFAULT` (`Account: 0e828249-812f-458a-8fd0-8da665d41f8b`).
- **Existing Project ID:** `plain-surf-10645492` ("School ERP", Singapore region `aws-ap-southeast-1`).
- **Existing Compute:** `0.25 - 2 CU` auto-suspend compute endpoint.
- **Existing Branches:** Exactly 1 branch: `production` (`br-twilight-bar-a1clyddc`).
- **Existing Database:** Exactly 1 database: `neondb` (Owner: `neondb_owner`).
- **Plan Type & Limits:** Neon Free Plan (History retention is strictly **6 hours**; PITR cannot restore beyond 6 hours).
- **Current Connection State:** The old database is NOT modified, NOT migrated, and NOT reset.

### 4.2 Database Isolation Mandate
To guarantee zero cross-environment contamination and prevent leakage of real school or student records into development:
1. **No Production Cloning:** The development/staging database will **NOT** be created by branching `production` with data.
2. **Fresh Independent Databases:** Staging and Development will use either:
   - A dedicated Neon project (`school-erp-staging`), OR
   - A dedicated branch created with `--schema-only` (or empty database `school_erp_dev` / `school_erp_staging`).

### 4.3 Environment Variable Naming & Scoping Matrix
| Variable Name | Staging / Development Value | Production Value | Stored In |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Staging pooled connection (`-pooler`) | Production pooled connection (`-pooler`) | Vercel Environment (Preview vs Prod) |
| `DATABASE_URL_UNPOOLED` | Staging direct connection (migrations) | Production direct connection (migrations) | Vercel Environment (Preview vs Prod) |
| `NEXTAUTH_URL` | Preview URL or `http://localhost:3000` | `https://school-erp-wb73.vercel.app` | Vercel Environment / `.env.local` |
| `NEXTAUTH_SECRET` | 32-byte cryptographically random hex (Dev) | Unique 32-byte random hex (Prod) | Vercel Environment (Preview vs Prod) |
| `PII_ENCRYPTION_KEY` | 32-byte hex key for dev test records | Distinct 32-byte hex key for production | Vercel Environment (Preview vs Prod) |
| `SUPER_ADMIN_MFA_PEPPER` | Dev TOTP pepper string | Production TOTP pepper string | Vercel Environment (Preview vs Prod) |

### 4.4 Database Topology Architecture
```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEON POSTGRESQL ISOLATION                       │
├───────────────────────────────────┬────────────────────────────────────┤
│   LEGACY / REFERENCE DATABASE     │     NEW REBUILD DATABASES          │
│   (Frozen - Untouched)            │     (Phase 1B+)                    │
├───────────────────────────────────┼────────────────────────────────────┤
│ Project: plain-surf-10645492      │ Option 1: Dedicated Neon Project   │
│ Branch: production                │   - Project: school-erp-staging    │
│ DB: neondb                        │   - Project: school-erp-prod-v2    │
│ Status: READ-ONLY REFERENCE       │                                    │
│ Compute: 0.25-2 CU (Idle)         │ Option 2: Isolated DBs on Project  │
│                                   │   - DB: school_erp_staging         │
│                                   │   - DB: school_erp_production_v2   │
│                                   │                                    │
│ * ZERO WRITE TRAFFIC              │ * STRICT CREDENTIAL SEPARATION     │
│ * NO DEV/STAGING CONNECTIONS      │ * INDEPENDENT RETENTION / BACKUPS  │
└───────────────────────────────────┴────────────────────────────────────┘
```

### 4.5 Action Required from User for Neon
In the Neon Console (`https://console.neon.tech`):
1. Navigate to Project `plain-surf-10645492` or create a new project `school-erp-staging`.
2. Create an empty database named `school_erp_staging` (or project `school-erp-staging`).
3. Create an empty database named `school_erp_prod_v2` (or project `school-erp-prod`).
4. Note the pooled and unpooled connection strings for Staging and Production.
5. Provide the Staging credentials for development when Phase 1B begins.

---

## 5. Section D: Vercel Staging & Preview Isolation Plan

### 5.1 Current Vercel Configuration
- **Production Project:** `school-erp-wb73`
- **Live Production URL:** `https://school-erp-wb73.vercel.app`
- **Connected Git Repository:** `https://github.com/prasadshirfule/School-ERP.git`
- **Production Branch:** `main` (Vercel builds only commits to `main` for production).
- **Vercel CLI Status:** Not installed globally (`npx vercel` available when needed).
- **Project Link File (`.vercel/`):** Not present in local repository (prevents unintended local deployments).

### 5.2 Deployment Workflow Architecture
```
                         GitHub Repository
                  [prasadshirfule/School-ERP]
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       Branch: `main`               Branch: `rebuild/clean-slate`
               │                               │
       Vercel Production                Vercel Preview / Staging
   (school-erp-wb73.vercel.app)         (*.vercel.app preview URLs)
               │                               │
       Production Secrets              Staging Secrets
       Production Neon DB              Staging Neon DB
```

### 5.3 Required Vercel Dashboard Actions
In the Vercel Dashboard (`Project Settings -> Environment Variables`):
1. Keep all existing **Production** variables untouched.
2. In the **Preview** environment scope, configure:
   - `DATABASE_URL` = Staging Neon Pooled URL
   - `DATABASE_URL_UNPOOLED` = Staging Neon Direct URL
   - `NEXTAUTH_URL` = (leave unset for dynamic preview URL or set custom staging domain)
   - `NEXTAUTH_SECRET` = Staging NextAuth Secret
   - `PII_ENCRYPTION_KEY` = Staging PII Key
3. Enable Git preview deployments for the `rebuild/*` branch pattern.

---

## 6. Section E: Android Staging & Production Isolation Design

### 6.1 Native Identity Specifications
| Parameter | Staging Android Target | Production Android Target |
| :--- | :--- | :--- |
| **Application ID** | `com.schoolerp.platform.staging` | `com.schoolerp.platform` |
| **App Name** | `School ERP (Staging)` | `School ERP` |
| **Backend Endpoint** | Staging Vercel URL / Custom Staging | `https://school-erp-wb73.vercel.app` |
| **Database Connected** | Staging Database Only | Production Database Only |
| **Launcher Icon** | Orange badge / distinctive staging badge | Official Navy Institutional Icon |
| **Installation Coexistence**| **Can coexist with Production** | **Independent Play Store Identity** |

### 6.2 Gradle Product Flavor Architecture
In Phase 1B/1C, `android/app/build.gradle` will implement Gradle product flavors:

```groovy
android {
    namespace = "com.schoolerp.platform"
    compileSdk = rootProject.ext.compileSdkVersion

    flavorDimensions "environment"

    productFlavors {
        staging {
            dimension "environment"
            applicationIdSuffix ".staging"
            resValue "string", "app_name", "School ERP (Staging)"
            resValue "string", "package_name", "com.schoolerp.platform.staging"
            buildConfigField "String", "DEFAULT_SERVER_URL", "\"https://staging-school-erp.vercel.app\""
            buildConfigField "boolean", "IS_STAGING", "true"
        }
        production {
            dimension "environment"
            resValue "string", "app_name", "School ERP"
            resValue "string", "package_name", "com.schoolerp.platform"
            buildConfigField "String", "DEFAULT_SERVER_URL", "\"https://school-erp-wb73.vercel.app\""
            buildConfigField "boolean", "IS_STAGING", "false"
        }
    }
}
```

### 6.3 MainActivity Dynamic Configuration
`MainActivity.java` will resolve its active target from Gradle `BuildConfig` rather than a single hardcoded constant:
```java
// Resolved at compile time based on flavor
String serverUrl = BuildConfig.DEFAULT_SERVER_URL;
if (BuildConfig.IS_STAGING) {
    // Allow developer server switching only in Staging flavor
    serverUrl = getDevOverrideUrl(serverUrl);
}
this.config = new CapConfig.Builder(this).setServerUrl(serverUrl).create();
```

### 6.4 Signing Identity & Play Store Compatibility
- **Release Keystore Verification:** No keystore files are committed in Git (preserving security best practices).
- **Environment Driven Signing:** `android/app/build.gradle` is already configured to read signing credentials from CI/local environment variables (`KEYSTORE_FILE`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`).
- **Play Store Preserved:** The production flavor retains the exact `applicationId "com.schoolerp.platform"`. As long as the user's release keystore is used when building `assembleProductionRelease`, future Google Play releases will remain 100% compatible.

---

## 7. Section F: Project Quality & CI Automation Plan

### 7.1 Existing Quality Tools
Inspection of `package.json` confirms the following local verification scripts:
- `npm run check:tenant-scoping`: Verifies tenant isolation in database operations.
- `npm run test:tenant`: Executes multi-tenant isolation unit tests.
- `npm run test:security`: Executes PII encryption, MFA, and rate-limiting security suites.
- `npm run test:auth`: Executes NextAuth session regression tests.
- `npm run lint`: ESLint check.
- `npm run build`: Next.js production compilation.

### 7.2 Proposed GitHub Actions CI Workflow (`.github/workflows/ci.yml`)
Currently, no `.github` directory exists in the repository. A unified CI pipeline should be introduced during the rebuild:

```yaml
name: School ERP CI Pipeline

on:
  push:
    branches: [rebuild/*, staging, main]
  pull_request:
    branches: [main, staging]

jobs:
  validate:
    name: Code Quality & Tenant Security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install Dependencies
        run: npm ci
      - name: TypeScript Typecheck
        run: npx tsc --noEmit
      - name: ESLint Check
        run: npm run lint
      - name: Tenant Isolation Verification
        run: npm run check:tenant-scoping
      - name: Prisma Schema Validation
        run: npx prisma validate
      - name: Next.js Production Build
        run: npm run build
        env:
          NEXTAUTH_SECRET: "ci-mock-secret-for-building-only-32ch"
          PII_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

**Security Rule:** CI pull requests must never receive production database credentials or release signing keys.

---

## 8. Section G: Risk Analysis & Mitigation Matrix

| Risk Identified | Severity | Impact | Mitigation Strategy Implemented in Phase 1A |
| :--- | :---: | :--- | :--- |
| **Accidental Production Database Writes** | **CRITICAL** | Overwriting real tenant or student data | Staging and Production databases are completely decoupled. Legacy DB remains read-only. |
| **Accidental Overwrite of Git `main`** | **CRITICAL** | Corrupting production deployment branch | All work confined strictly to local branch `rebuild/clean-slate`. Zero pushes to `main`. |
| **Production Android Identity Loss** | **HIGH** | Inability to update app on Google Play | Production Application ID `com.schoolerp.platform` and signing architecture preserved. |
| **Neon 6-Hour Retention Limit** | **MEDIUM** | Inability to PITR restore beyond 6h on Free tier | Emphasize automated daily encrypted schema/data dumps in production. |
| **Vercel Preview URL Drift** | **MEDIUM** | NextAuth callback mismatches on preview URLs | Configure custom staging domain or dynamic Vercel redirect detection in NextAuth. |
| **Missing Native Keystore in Git** | **LOW** | Cannot sign release APK without user's keystore | Confirmed this is standard security practice. User retains keystore externally. |

---

## 9. Section H: Phase 1B Readiness Checklist

| Readiness Criteria | Status | Evidence / Notes |
| :--- | :---: | :--- |
| **1. Dedicated Git branch created?** | **READY** | `rebuild/clean-slate` checked out at `776f5f4`. |
| **2. Production `main` untouched?** | **READY** | `main` remains at `c183b08`, uncommitted/unpushed. |
| **3. Legacy migrations preserved?** | **READY** | All 11 migrations archived in `archive/legacy-prisma-migrations/`. |
| **4. Legacy schemas & seed archived?** | **READY** | Stored in `archive/` alongside environment templates. |
| **5. Android native project preserved?** | **READY** | `android/` and `capacitor.config.ts` preserved on rebuild branch. |
| **6. Neon isolation plan documented?** | **READY** | Clear separation between old, staging, and new production DBs. |
| **7. Vercel staging isolation plan documented?** | **READY** | Environment variable matrix and branch routing defined. |
| **8. Android flavor architecture designed?** | **READY** | `com.schoolerp.platform.staging` dual-install architecture designed. |
| **9. Secrets exposure check passed?** | **READY** | Zero connection strings, tokens, or private keys printed or archived. |
| **10. Fresh staging DB connection available?** | **PENDING USER** | User must create Staging DB in Neon Console or authorize creation. |

### Overall Readiness Decision:
**PHASE 1A IS COMPLETE.**  
The repository and environment foundations are safely prepared. Phase 1B (Fresh Application Foundation) can safely begin as soon as the user provides or provisions the isolated Staging Neon database.
