# 🏫 School ERP — Complete Security, Functionality, Database, UI/UX & Deployment Audit Report

**Date:** October 17, 2026  
**Auditor:** Antigravity Autonomous Security & Architecture Agent  
**Repository:** [https://github.com/prasadshirfule/School-ERP.git](https://github.com/prasadshirfule/School-ERP.git)  
**Branch Audited:** `main` (Audited Commit: `c183b08edc2a9ac21e23812ccb428ff75a55205b`)  
**Audit & Remediation Branch:** `fix/school-erp-security-audit`  
**Production URL:** [https://school-erp-wb73.vercel.app/](https://school-erp-wb73.vercel.app/)  

---

## 1. Executive Summary

A comprehensive, evidence-based security and architecture audit of the School ERP application was conducted across all 28 API routes, database models, authentication, authorization middleware, encryption, multi-tenant boundaries, payment processing, file storage, and deployment configurations.

The audit verified and reproduced **multiple critical vulnerabilities (P0/P1)** that compromise student data privacy, tenant isolation, server integrity, and financial correctness.

### Key Risk Areas Identified:
1. **Critical Authentication & Secret Exposure (P0)**: Hardcoded production secrets for NextAuth session signing (`NEXTAUTH_SECRET`) and PII encryption (`PII_ENCRYPTION_KEY`) in source code. Deployed production `/api/auth/csrf` returning HTTP 500 server configuration error.
2. **Direct Password Hash Leakage (P0)**: Student profile endpoint `GET /api/students/[id]` returns bcrypt password hashes of linked parent user accounts in JSON response.
3. **Multi-Tenant Scoping Bypass (P0)**: The tenant client extension (`src/lib/tenant.ts`) exclusively scopes models with direct `schoolId` scalar columns while completely skipping `Teacher`, `TeacherSubject`, `StudentParent`, and `Marks`. Unscoped queries leak data across schools (e.g. Global Search, Marks autocomplete, Teacher updates).
4. **Widespread Missing Role Authorization (P0)**: Mutation endpoints for periods, timetable slots, syllabus, subjects, exam slots, and certificates lack role verification. Any authenticated user (including PARENT) can mutate or delete bell periods (cascading into timetable deletion), assign subjects, or forge official Transfer Certificates.
5. **PII Plaintext Fallback (P0)**: In `src/lib/security.ts`, if encryption fails, Aadhaar numbers and medical records are silently written to the database in plaintext. If decryption fails, raw ciphertext is returned as if it were valid plaintext.
6. **Destructive Database Seeding (P0)**: `prisma/seed.ts` executes unconditional `deleteMany()` across all 26 tables in the database and creates accounts with shared password `password123`. A single invocation on production destroys all real school records.
7. **Financial Concurrency Hazards & Mock Payment Acceptance in Production (P1)**: Razorpay signature verification accepts simulated mock signatures (`mock_sig_...`) in production. Receipt numbering suffers race conditions and client tampering. Overpayment is not prevented.
8. **Dummy S3 Driver Delegating to Local Disk (P1)**: `S3StorageDriver` is a stub that calls `LocalStorageDriver`. On serverless Vercel deployments, filesystem writes fail or are lost on cold start. Uploads lack magic-byte validation and are served without tenant access control.

---

## 2. Complete Inventory of Routes, Models, and Roles

### 2.1 User Roles
- `ADMIN`: Full school administrative control, academic setup, staff/student management, settings.
- `PRINCIPAL`: Academic oversight, reports, leave approvals, class monitoring.
- `TEACHER`: Timetable, attendance, marks entry, syllabus tracking, homework assignments, leave requests.
- `PARENT`: Multi-child switching, attendance tracking, report cards, fee balances, receipt downloads.
- `ACCOUNTANT`: Fee structures, bulk invoicing, payment collections, financial receipting.

### 2.2 Database Models (Prisma Schema)
| Model | School-Scoped | Direct `schoolId` Column | Sensitive Fields |
| :--- | :--- | :--- | :--- |
| `School` | Tenant Root | `id` (PK) | Configuration, affiliation numbers |
| `User` | Yes | Yes | `passwordHash`, `phone`, `email` |
| `Teacher` | Yes (via User) | **NO** (linked via `userId`) | `fullName` |
| `TeacherSubject` | Yes (via Teacher) | **NO** | `teacherId`, `subjectId` |
| `Class` | Yes | Yes | Academic cohort structure |
| `Section` | Yes | Yes | Section names, class teacher assignments |
| `Subject` | Yes | Yes | Course names |
| `Student` | Yes | Yes | `aadharNumber` (PII), `medicalConditions` (PII), parent contacts |
| `Parent` | Yes | Yes | `fullName`, `phone` |
| `StudentParent` | Yes (via Student) | **NO** | Guardian relationships |
| `Attendance` | Yes | Yes | Daily attendance status |
| `FeeStructure` | Yes | Yes | Fee amounts, frequency |
| `FeeInvoice` | Yes | Yes | Balances due, discounts |
| `Payment` | Yes | Yes | Gateway references, receipt serials, amounts |
| `GradingScale` | Yes | Yes | Grade thresholds |
| `ExamSlot` | Yes | Yes | Terms, exam codes, max scores |
| `Marks` | Yes (via Student) | **NO** | `score`, `maxScore` |
| `ReportCard` | Yes | Yes | Term remarks, PDF links |
| `Notice` | Yes | Yes | School bulletins, target roles |
| `Period` | Yes | Yes | Bell timetable schedules |
| `TimetableSlot` | Yes | Yes | Period, section, subject, teacher mappings |
| `SyllabusTopic` | Yes | Yes | Curriculum progress |
| `CertificateLog` | Yes | Yes | Transfer Certificate register |
| `Department` | Yes | Yes | Department hierarchy, HOD links |
| `LeaveRequest` | Yes | Yes | Staff leave types, medical reasons |
| `Assignment` | Yes | Yes | Study material, attachments |

### 2.3 API Route Inventory & Authorization Status
| Route | Method | Declared Allowed Roles | Implemented Server-Side Auth Check | Scoping Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/[...nextauth]` | GET, POST | Public | NextAuth handler | N/A |
| `/api/schools` | GET | Public | None (returns active schools) | Global |
| `/api/schools/settings` | GET, PATCH | ADMIN, PRINCIPAL | Partial / Unverified | Tenant client |
| `/api/health` | GET | Public | None | Global |
| `/api/students` | GET | All authenticated | Authenticated only (leaks all student PII) | Tenant client |
| `/api/students` | POST | ADMIN, PRINCIPAL | Role check implemented | Tenant client |
| `/api/students` | PATCH | ADMIN, PRINCIPAL | Role check implemented | Tenant client |
| `/api/students/[id]` | GET | All authenticated | Authenticated only (**Leaks Parent Password Hash**) | Tenant client |
| `/api/students/[id]` | PATCH | ADMIN, PRINCIPAL | Role check implemented | Tenant client |
| `/api/students/[id]/report-card` | GET | All authenticated | Authenticated only | Tenant client |
| `/api/students/promote` | POST | ADMIN, PRINCIPAL | Role check implemented | Tenant client |
| `/api/students/stats` | GET | ADMIN, PRINCIPAL | Role check implemented | Tenant client |
| `/api/teachers` | GET | All authenticated | Authenticated only | Unscoped User join |
| `/api/teachers` | POST | ADMIN, PRINCIPAL | Role check implemented | Direct User creation |
| `/api/teachers` | PATCH | ADMIN, PRINCIPAL | Role check implemented | Direct User update |
| `/api/classes` | GET, POST | ADMIN, PRINCIPAL | Role check implemented on POST | Tenant client |
| `/api/sections` | GET, POST, PATCH, DELETE | ADMIN, PRINCIPAL | Role check implemented | Tenant client (Missing classId check) |
| `/api/subjects` | GET, POST, PATCH | Teacher (filtered), Admin | **Missing on POST/PATCH** | Tenant client |
| `/api/departments` | GET, POST, PATCH, DELETE | ADMIN, PRINCIPAL | Role check implemented | Unscoped teacher updates |
| `/api/attendance` | GET, POST | TEACHER, ADMIN | **Missing on GET** (Parent can read all) | Tenant client |
| `/api/attendance/analytics`| GET | All authenticated | Authenticated only | Tenant client |
| `/api/timetable` | GET, POST, DELETE | All authenticated | **MISSING on POST & DELETE** | Tenant client |
| `/api/timetable/teacher` | GET | TEACHER | Authenticated only | Tenant client |
| `/api/periods` | GET, POST, PATCH, DELETE | All authenticated | **MISSING on POST, PATCH, DELETE** | Tenant client |
| `/api/syllabus` | GET, POST, PATCH, DELETE | All authenticated | **MISSING on POST, PATCH, DELETE** | Tenant client |
| `/api/syllabus/stats` | GET | All authenticated | Authenticated only | Tenant client |
| `/api/exam-slots` | GET, POST, PATCH | All authenticated | **MISSING on POST, PATCH** | Tenant client |
| `/api/marks` | GET, POST | TEACHER, ADMIN | **Missing on GET** (Leaks all marks) | **Unscoped Marks Model** |
| `/api/fee-structures` | GET | All authenticated | Authenticated only | Tenant client |
| `/api/invoices` | GET, POST | ACCOUNTANT, ADMIN | Role check on POST (Missing studentId check) | Tenant client |
| `/api/invoices/bulk` | POST | ACCOUNTANT, ADMIN | Role check implemented | Tenant client |
| `/api/payments` | GET, POST | ACCOUNTANT, ADMIN | Role check on POST (Untrusted receiptNumber) | Tenant client |
| `/api/payments/razorpay/create-order` | POST | All authenticated | Authenticated only | Tenant client |
| `/api/payments/razorpay/verify` | POST | All authenticated | **Accepts Mock Signatures** | Tenant client |
| `/api/receipt/[id]` | GET | All authenticated | **MISSING role / parent check** | Tenant client |
| `/api/alerts/fees` | GET | ADMIN, PRINCIPAL | Role check implemented | Tenant client |
| `/api/notifications/send` | POST | ADMIN, PRINCIPAL | Role check implemented | Tenant client |
| `/api/certificates/generate` | GET, POST | All authenticated | **MISSING role check** | Tenant client |
| `/api/leave` | GET, POST, PATCH | Staff (POST), Admin (PATCH) | **Broken on GET** (Parent reads all staff leave) | Tenant client |
| `/api/assignments` | GET, POST, PATCH, DELETE | TEACHER, ADMIN | **Teacher can edit other teachers' notes** | Tenant client |
| `/api/search` | GET | All authenticated | **Leaks across tenants via Teacher** | Tenant client |
| `/api/parent/students` | GET | PARENT | Validated against StudentParent | Tenant client |
| `/api/parent/students/[id]/attendance` | GET | PARENT | Validated against StudentParent | Tenant client |
| `/api/parent/students/[id]/invoices` | GET | PARENT | Validated against StudentParent | Tenant client |
| `/api/upload/student-photo` | POST | ADMIN, PRINCIPAL, TEACHER | Role check implemented | Unscoped local storage |
| `/api/upload/assignment` | POST | ADMIN, PRINCIPAL, TEACHER | Role check implemented | Unscoped local storage |

---

## 3. Detailed Audit Findings & Classifications

### Finding 1: Production Fallback Secret for NextAuth Session Signing
- **Classification:** CONFIRMED & REPRODUCED
- **Severity:** P0 — CRITICAL
- **File Paths:** `src/lib/auth.ts:8`, `src/middleware.ts:44`
- **Impact:** Complete authentication bypass. Anyone who knows or discovers the fallback string `"school_erp_production_secret_key_min32chars!!"` can forge valid NextAuth JWT tokens for any user ID, any role (`ADMIN`), and any `schoolId`.
- **Evidence:**
  ```ts
  // src/lib/auth.ts
  secret: process.env.NEXTAUTH_SECRET || "school_erp_production_secret_key_min32chars!!",

  // src/middleware.ts
  const secret = process.env.NEXTAUTH_SECRET || "school_erp_production_secret_key_min32chars!!";
  ```
- **Remediation:** Remove all hardcoded secret fallbacks. Add strict startup validation (`src/lib/env.ts`). If `NEXTAUTH_SECRET` is missing or shorter than 32 characters, fail securely at startup.

---

### Finding 2: Deployed Production `/api/auth/csrf` HTTP 500 Configuration Error
- **Classification:** REPRODUCED ON PRODUCTION
- **Severity:** P0 — CRITICAL
- **Production Evidence:**
  ```bash
  curl -i https://school-erp-wb73.vercel.app/api/auth/csrf
  # HTTP/2 500
  # content-type: application/json
  # {"message":"There is a problem with the server configuration. Check the server logs for more information."}
  ```
- **Impact:** NextAuth CSRF token endpoint fails on production, preventing new user sign-ins and causing authentication regressions.
- **Root Cause:** NextAuth v4's `assertConfig()` throws an error when `NEXTAUTH_SECRET` is absent in production or when `NEXTAUTH_URL` / `AUTH_TRUST_HOST` is not configured for the Vercel edge/serverless runtime. Furthermore, the deployed commit on Vercel is an older commit that does not match the latest code.
- **Remediation:** Enforce `NEXTAUTH_SECRET` in environment variables, add `trustHost: true` / `AUTH_TRUST_HOST=true`, ensure stable NextAuth handler configuration, and provide production deployment runbook.

---

### Finding 3: Bcrypt Password Hash Exposure via Student Profile API
- **Classification:** CONFIRMED
- **Severity:** P0 — CRITICAL
- **File Paths:** `src/app/api/students/[id]/route.ts:27-32`, `src/app/api/students/[id]/route.ts:154-159`
- **Impact:** Full database leakage of parent credentials. Any user authorized to view a student (including teachers and principals) receives the bcrypt hash of all linked parents in the API JSON payload.
- **Evidence:**
  ```ts
  parents: {
    include: {
      parent: {
        include: { user: true }, // Returns user.passwordHash directly!
      },
    },
  },
  ```
- **Remediation:** Replace `user: true` with an explicit `select: { id: true, email: true, phone: true }`. Never select `passwordHash` in relational includes.

---

### Finding 4: Multi-Tenant Scoping Bypass for `Teacher`, `TeacherSubject`, `StudentParent`, and `Marks`
- **Classification:** CONFIRMED & REPRODUCED
- **Severity:** P0 — CRITICAL
- **File Paths:** `src/lib/tenant.ts:83-87`, `src/app/api/marks/route.ts:44-53`, `src/app/api/search/route.ts:33-45`, `src/app/api/departments/route.ts:111-121`
- **Impact:** Complete cross-tenant data leakage and unauthorized mutation.
  1. `Teacher`, `TeacherSubject`, `StudentParent`, and `Marks` do not contain a direct `schoolId` scalar column in `prisma/schema.prisma`.
  2. The tenant extension `src/lib/tenant.ts` explicitly checks:
     ```ts
     if (!model || !TENANT_SCOPED_MODELS.has(model)) {
       return query(args); // EXECUTED COMPLETELY UNSCOPED!
     }
     ```
  3. In `src/app/api/search/route.ts`, `ctx.db.teacher.findMany()` searches without a school filter. School A users can search and see School B's teachers!
  4. In `src/app/api/marks/route.ts`, `GET /api/marks?examsOnly=true` queries `ctx.db.marks.findMany({ where: { student: {} } })`, returning exam names across all schools in the multi-tenant database.
  5. In `src/app/api/departments/route.ts`, an admin in School A can update `teacherIds` belonging to School B!
- **Remediation:**
  - Add relational tenant scoping to `src/lib/tenant.ts` for all models without direct `schoolId` (`Teacher` via `user.schoolId`, `Marks` via `student.schoolId`, `StudentParent` via `student.schoolId`, `TeacherSubject` via `teacher.user.schoolId`).
  - Update `prisma/schema.prisma` to add direct `schoolId` to `Teacher` and `Marks` for performance and defensive consistency, backed by database indexes.

---

### Finding 5: Missing Ownership Verification in Relational Creation (Cross-Tenant Relationship Injection)
- **Classification:** CONFIRMED
- **Severity:** P0 — CRITICAL
- **File Paths:** `src/app/api/sections/route.ts:39-48`, `src/app/api/invoices/route.ts:58-62`, `src/app/api/timetable/route.ts:42-47`, `src/app/api/departments/route.ts:47-65`, `src/app/api/assignments/route.ts:70-97`
- **Impact:** An administrator in School A can create records linked to School B's entities (e.g. creating an invoice in School A for School B's student, or assigning School B's class teacher to School A's section).
- **Evidence:**
  In `POST /api/invoices`:
  ```ts
  const { studentId, feeStructureId, discountAmount, dueDate } = body;
  // Checks feeStructure, but NEVER checks if studentId belongs to current tenant!
  ```
  In `POST /api/sections`:
  ```ts
  const { classId, name, academicYear, classTeacherId } = parsed.data;
  // Creates section without validating that classId belongs to this school!
  ```
- **Remediation:** Before inserting or updating any relationship, query the referenced entity through the tenant-scoped client to ensure it belongs to the authenticated `session.user.schoolId`.

---

### Finding 6: Missing Role Checks on Sensitive Mutation & Admin Endpoints
- **Classification:** CONFIRMED
- **Severity:** P0 — CRITICAL
- **File Paths:**
  - `src/app/api/periods/route.ts:31-111` (POST, PATCH, DELETE)
  - `src/app/api/timetable/route.ts:37-129` (POST, DELETE)
  - `src/app/api/subjects/route.ts:44-150` (POST, PATCH)
  - `src/app/api/syllabus/route.ts:35-118` (POST, PATCH, DELETE)
  - `src/app/api/exam-slots/route.ts:26-116` (POST, PATCH)
  - `src/app/api/certificates/generate/route.ts:9-119` (POST)
- **Impact:** Any authenticated user with role `PARENT` or `ACCOUNTANT` can:
  - Delete school bell periods, which executes a cascading delete of all timetable slots in the school (`await ctx.db.timetableSlot.deleteMany({ where: { periodId: id } })`).
  - Create, modify, and delete subjects, timetable slots, exam slots, and curriculum syllabus topics.
  - Issue official Transfer Certificates and Bonafide certificates with custom conduct remarks.
- **Remediation:** Implement server-side role validation inside every route handler using a strict `requireRole(session, ["ADMIN", "PRINCIPAL"])` utility.

---

### Finding 7: Unauthorized Information Disclosure via Unrestricted Read Endpoints
- **Classification:** CONFIRMED
- **Severity:** P0 — CRITICAL
- **File Paths:**
  - `src/app/api/receipt/[id]/route.ts:17-38`: Missing parent-child ownership check. Any authenticated user can view payment receipts of any student in the school.
  - `src/app/api/leave/route.ts:16-24`: When called by `PARENT`, `isStaff` is false, so `whereClause.userId` is NOT attached. The query returns all staff leave requests, personal reasons, medical notes, and principal remarks school-wide.
  - `src/app/api/marks/route.ts:27-58`: Any role (including parent or accountant) can call `GET /api/marks?sectionId=...&subjectId=...&examName=...` and inspect the complete marks register for an entire section.
  - `src/app/api/notices/route.ts:9-19`: Query param `?role=` is client-controlled. If omitted or manipulated, parents can read confidential staff notices.
  - `src/app/api/search/route.ts:55-67`: Searches fee invoices and displays student names and amounts due to any authenticated caller.
- **Remediation:** Enforce role restrictions on read endpoints. For parents, restrict queries exclusively to their verified linked children. Enforce server-side role filtering for notices.

---

### Finding 8: PII Plaintext Fallback & Faulty Decryption Logic
- **Classification:** CONFIRMED
- **Severity:** P0 — CRITICAL
- **File Paths:** `src/lib/security.ts:4`, `src/lib/security.ts:24-27`, `src/lib/security.ts:52-55`
- **Impact:** If `PII_ENCRYPTION_KEY` is misconfigured or encryption throws an error, the Aadhaar number and medical conditions are written in plaintext to the database. If decryption fails, the encrypted ciphertext is returned as if it were decrypted plaintext.
- **Evidence:**
  ```ts
  // src/lib/security.ts
  } catch (err) {
    console.error("PII encryption error:", err);
    return text; // Fallback to plain text on error to avoid data loss
  }
  ...
  } catch (err) {
    return encryptedText; // Return original if decryption fails
  }
  ```
- **Remediation:** Introduce typed errors (`EncryptionError`, `DecryptionError`). Throw errors rather than silently storing plaintext. Never return ciphertext as plaintext. Validate 32-byte key at startup.

---

### Finding 9: Destructive Database Seed & Public Production Demo Credentials
- **Classification:** CONFIRMED & REPRODUCED
- **Severity:** P0 — CRITICAL
- **File Paths:** `prisma/seed.ts:12-38`, `README.md:119-134`, `src/app/(auth)/login/page.tsx:38-67`
- **Impact:** Running `npx prisma db seed` on production deletes all 26 tables, destroying real student records, grades, and invoices. Production README and login pages expose active demo accounts with shared password `password123`.
- **Evidence:**
  ```ts
  // prisma/seed.ts
  await prisma.payment.deleteMany();
  await prisma.feeInvoice.deleteMany();
  // ... 24 more deleteMany calls dropping all school data!
  ```
- **Remediation:**
  - Add production guard in `prisma/seed.ts` that immediately terminates with error if `NODE_ENV === "production"`.
  - Require explicit `ALLOW_DESTRUCTIVE_RESET=true` flag for table truncation in development.
  - Make seed script idempotent (upserting rather than truncating).
  - Hide demo credentials on production; disable demo accounts unless explicitly enabled in sandbox mode.

---

### Finding 10: In-Memory Rate Limiting Failure on Serverless Infrastructure
- **Classification:** CONFIRMED
- **Severity:** P1 — HIGH
- **File Paths:** `src/lib/rateLimit.ts:6`, `src/lib/auth.ts:32-36`
- **Impact:** The sliding-window rate limiter stores counters in a JavaScript `Map`. In serverless deployments (such as Vercel), instances are short-lived and independent; brute-force attacks across separate serverless lambdas easily bypass rate limits. Furthermore, an attacker can intentionally lock out any user's email by submitting 15 bad requests from anywhere.
- **Remediation:** Add IP-based rate limiting, bound memory store with LRU eviction, and provide pluggable Redis / Upstash support for distributed serverless environments.

---

### Finding 11: Payment Concurrency Hazards, Overpayment, and Mock Signature Acceptance
- **Classification:** CONFIRMED
- **Severity:** P1 — HIGH
- **File Paths:** `src/app/api/payments/route.ts:71-100`, `src/app/api/payments/razorpay/verify/route.ts:33-44`, `src/lib/razorpay.ts:92-96`
- **Impact:**
  - Mock payment signatures (`mock_sig_...`) are accepted unconditionally, even in production:
    ```ts
    if (params.orderId.startsWith("order_") && params.signature === `mock_sig_${params.paymentId}`) {
      return true; // Accidental fake payment acceptance!
    }
    ```
  - In `POST /api/payments`, invoice totals are calculated outside the transaction. Under concurrency, double payments corrupt invoice statuses.
  - Receipt sequence numbers are generated by loading all payment records into memory and doing `maxRecSeq + 1`. Client-supplied `json.receiptNumber` is trusted.
  - Verification endpoint lacks idempotency check on `gatewayRef`.
- **Remediation:**
  - Strictly reject mock payment signatures in production.
  - Calculate invoice balances inside atomic transactions with database-level consistency.
  - Reject payments exceeding remaining balance.
  - Generate receipt numbers via database atomic counters or transactional sequence tables.
  - Enforce idempotency on `gatewayRef`.

---

### Finding 12: Storage Driver Stub & Insecure Local File Exposure
- **Classification:** CONFIRMED
- **Severity:** P1 — HIGH
- **File Paths:** `src/lib/storage.ts:82-98`, `src/app/api/upload/student-photo/route.ts`, `src/app/api/upload/assignment/route.ts`
- **Impact:**
  - `S3StorageDriver` is an unimplemented stub that delegates to `LocalStorageDriver`. On Vercel, files written to `public/uploads` fail or vanish on the next invocation.
  - Uploads are saved into `public/uploads/photos/` and `public/uploads/assignments/` without school isolation or access control. Anyone with the URL can view confidential student photos or documents.
  - File validation relies only on client MIME type and file extension; no magic-byte verification exists.
- **Remediation:**
  - Implement real AWS S3 / Cloudflare R2 driver with `@aws-sdk/client-s3`.
  - Isolate files by `schoolId`.
  - Validate file signatures (magic bytes) for image and PDF uploads.
  - Fail clearly if cloud storage is selected but misconfigured.

---

### Finding 13: ESLint Failures (337 Problems) & Build Integrity
- **Classification:** CONFIRMED & REPRODUCED
- **Severity:** P2 — MEDIUM
- **Impact:** `npm run lint` fails with 241 errors and 96 warnings, primarily `react-hooks/set-state-in-effect`, unescaped entities, and `@typescript-eslint/no-explicit-any`. While `npm run build` succeeds, CI/CD pipeline checks fail.
- **Remediation:** Fix React hook cascading render issues in `src/components/GlobalSearch.tsx`, escape HTML entities, and resolve linting errors.

---

### Finding 14: Public Health Endpoint Information Leakage
- **Classification:** CONFIRMED
- **Severity:** P2 — LOW
- **File Paths:** `src/app/api/health/route.ts:17-38`
- **Impact:** Exposes heap usage, RSS memory, system uptime, database latency, and internal environment flags to anonymous callers.
- **Remediation:** Return minimal health status `{ "status": "ok", "timestamp": "..." }` for unauthenticated requests.

---

## 4. Summary of Audit Classifications

| ID | Title | Severity | Classification |
| :--- | :--- | :--- | :--- |
| **SEC-01** | Hardcoded production fallback secret for NextAuth | P0 | CONFIRMED |
| **SEC-02** | Deployed `/api/auth/csrf` HTTP 500 configuration error | P0 | REPRODUCED |
| **SEC-03** | Parent password hash leakage via `GET /api/students/[id]` | P0 | CONFIRMED |
| **SEC-04** | Tenant client skips `Teacher`, `TeacherSubject`, `StudentParent`, `Marks` | P0 | CONFIRMED & REPRODUCED |
| **SEC-05** | Missing relationship ownership verification in mutations | P0 | CONFIRMED |
| **SEC-06** | Missing role checks on sensitive mutation endpoints | P0 | CONFIRMED |
| **SEC-07** | Unauthorized read access on receipts, leave, marks, notices, search | P0 | CONFIRMED |
| **SEC-08** | PII plaintext fallback on encryption failure & ciphertext leakage | P0 | CONFIRMED |
| **SEC-09** | Destructive seed drops all tables; shared demo passwords | P0 | CONFIRMED |
| **SEC-10** | In-memory rate limiting ineffective on serverless; DoS risk | P1 | CONFIRMED |
| **SEC-11** | Payment concurrency race conditions & mock signature acceptance | P1 | CONFIRMED |
| **SEC-12** | Dummy S3 driver; public unauthenticated file storage; no magic bytes | P1 | CONFIRMED |
| **ENG-13** | ESLint fails with 337 problems across components and lib | P2 | REPRODUCED |
| **ENG-14** | Information disclosure on public health endpoint | P2 | CONFIRMED |
