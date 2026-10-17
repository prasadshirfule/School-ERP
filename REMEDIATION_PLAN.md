# 🛠️ School ERP — Remediation Plan & Execution Roadmap

**Date:** October 17, 2026  
**Target Branch:** `fix/school-erp-security-audit`  
**Prerequisite:** Based on confirmed findings in `AUDIT_REPORT.md`  

---

## 1. Remediation Phases & Priorities

Remediation will be executed in 5 strictly controlled, reviewable phases, prioritizing P0 security blockers first:

```
Phase 0: Critical Security Hardening (P0)
  ├── 0.1 Environment & Secrets Validation
  ├── 0.2 PII Encryption Hardening
  ├── 0.3 Tenant Scoping Extension for All Models
  ├── 0.4 Relational Ownership Verification
  ├── 0.5 Role-Based Authorization Enforcement
  ├── 0.6 Password Hash & Data Leak Prevention
  └── 0.7 Safe Seeding Guard

Phase 1: Business Logic, Financial Integrity & Storage (P1)
  ├── 1.1 Concurrency-Safe Payment Processing & Receipt Generation
  ├── 1.2 Razorpay Signature & Mock Payment Disabling in Production
  ├── 1.3 Persistent Cloud Storage Driver (S3 / R2) & Magic Byte Validation
  └── 1.4 Rate Limiter Hardening (Memory Bound & Distributed Ready)

Phase 2: Code Quality, Lint & Type Stabilization (P2)
  ├── 2.1 Fix ESLint Errors (Cascading Renders & Unescaped Entities)
  └── 2.2 Health Endpoint Information Minimization

Phase 3: Automated Testing & Verification
  ├── 3.1 Tenant Isolation Tests (All 26 Models + Relationships)
  ├── 3.2 Authorization & Role Permission Integration Tests
  ├── 3.3 Payment Concurrency & Overpayment Prevention Tests
  └── 3.4 PII Encryption & Tamper Detection Tests

Phase 4: Production Deployment Readiness & Documentation
  ├── 4.1 Update README.md and .env.example
  ├── 4.2 SECURITY_TEST_PLAN.md and DEPLOYMENT_RUNBOOK.md
  └── 4.3 Git Verification, Clean Diff, and Final Push
```

---

## 2. Detailed Task Breakdown & Implementation Specifications

### Phase 0: Critical Security Hardening (P0)

#### Task 0.1: Environment Variable Schema & Startup Secret Validation
- **Files:** `src/lib/env.ts` (new), `src/lib/auth.ts`, `src/middleware.ts`, `src/lib/security.ts`
- **Actions:**
  - Create centralized `validateEnv()` in `src/lib/env.ts` using Zod.
  - Require `NEXTAUTH_SECRET` (min 32 chars) and `PII_ENCRYPTION_KEY` (min 32 chars).
  - In production (`NODE_ENV === "production"`), throw a clear fatal error if secrets are missing or use default demo placeholders.
  - Remove all hardcoded string fallbacks from `auth.ts`, `middleware.ts`, and `security.ts`.
  - In development, allow development keys only with explicit console warning.
- **Acceptance Criteria:** Application refuses to boot in production with missing or default secrets. No hardcoded fallback strings in repository.

#### Task 0.2: PII Encryption Hardening
- **Files:** `src/lib/security.ts`, `src/app/api/students/[id]/route.ts`
- **Actions:**
  - Define custom typed errors: `EncryptionError`, `DecryptionError`, `InvalidKeyError`.
  - Validate 32-byte encryption key on module initialization.
  - Remove plaintext fallback in `encryptPII()`. If encryption fails, throw `EncryptionError`; do not persist plaintext.
  - Remove ciphertext fallback in `decryptPII()`. If decryption fails or auth tag mismatch occurs, throw or return `null`; never return raw ciphertext as valid text.
  - Provide a migration utility script for auditing legacy unencrypted records without logging sensitive data.
- **Acceptance Criteria:** Failed encryption throws and prevents database mutation. Aadhaar and medical data are never saved in plaintext. Tampered ciphertexts trigger decryption error without returning ciphertext.

#### Task 0.3: Complete Multi-Tenant Scoping for All Models
- **Files:** `src/lib/tenant.ts`, `prisma/schema.prisma`
- **Actions:**
  - In `src/lib/tenant.ts`: Add relational scoping rules for models without direct `schoolId`:
    - `Teacher`: scoped via `where: { user: { schoolId } }`.
    - `TeacherSubject`: scoped via `where: { teacher: { user: { schoolId } } }`.
    - `StudentParent`: scoped via `where: { student: { schoolId } }`.
    - `Marks`: scoped via `where: { student: { schoolId } }`.
  - Ensure `findUnique`, `findFirst`, `findMany`, `update`, `delete`, `upsert`, and `count` on these models enforce tenant boundaries automatically.
  - Prevent modifying `schoolId` on any model.
- **Acceptance Criteria:** Queries on `Teacher`, `TeacherSubject`, `StudentParent`, and `Marks` never return or mutate records belonging to another school.

#### Task 0.4: Relational Ownership Verification in Mutation Endpoints
- **Files:** `src/app/api/sections/route.ts`, `src/app/api/invoices/route.ts`, `src/app/api/timetable/route.ts`, `src/app/api/departments/route.ts`, `src/app/api/assignments/route.ts`
- **Actions:**
  - In `POST /api/sections`: Verify `classId` belongs to `session.user.schoolId`. If `classTeacherId` provided, verify it belongs to this school.
  - In `POST /api/invoices`: Verify `studentId` and `feeStructureId` belong to this school.
  - In `POST /api/timetable`: Verify `sectionId`, `periodId`, `subjectId`, and `teacherId` all belong to this school.
  - In `POST/PATCH /api/departments`: Verify `headOfDepartmentId` and `teacherIds` belong to this school.
  - In `POST /api/assignments`: Verify `sectionId`, `subjectId`, `teacherId` belong to this school.
- **Acceptance Criteria:** Attempting to link an entity ID from School B into School A returns 400 Bad Request or 404 Not Found.

#### Task 0.5: Enforce Server-Side Role-Based Authorization
- **Files:**
  - `src/app/api/periods/route.ts` (POST, PATCH, DELETE: restrict to `ADMIN`, `PRINCIPAL`)
  - `src/app/api/timetable/route.ts` (POST, DELETE: restrict to `ADMIN`, `PRINCIPAL`)
  - `src/app/api/subjects/route.ts` (POST, PATCH: restrict to `ADMIN`, `PRINCIPAL`, `TEACHER`)
  - `src/app/api/syllabus/route.ts` (POST, PATCH, DELETE: restrict to `ADMIN`, `PRINCIPAL`, `TEACHER`)
  - `src/app/api/exam-slots/route.ts` (POST, PATCH: restrict to `ADMIN`, `PRINCIPAL`)
  - `src/app/api/certificates/generate/route.ts` (POST, GET: restrict to `ADMIN`, `PRINCIPAL`)
  - `src/app/api/attendance/route.ts` (GET: restrict to staff; parents blocked or scoped to own child)
  - `src/app/api/leave/route.ts` (GET: parents blocked or restricted; staff see only own leave)
  - `src/app/api/receipt/[id]/route.ts` (GET: verify parent owns the student associated with the receipt)
  - `src/app/api/marks/route.ts` (GET: parents restricted to own child; teachers restricted to assigned subjects)
  - `src/app/api/notices/route.ts` (GET: enforce server-side audience filter by caller's role)
- **Acceptance Criteria:** Unauthenticated requests receive 401 JSON. Unauthorized roles receive 403 JSON or non-disclosing 404 JSON.

#### Task 0.6: Sensitive Field Stripping & Password Hash Leak Prevention
- **Files:** `src/app/api/students/[id]/route.ts`, `src/app/api/students/route.ts`, `src/app/api/teachers/route.ts`
- **Actions:**
  - In `GET /api/students/[id]`: Replace `include: { user: true }` on parents with `select: { id: true, email: true, phone: true }`.
  - In `GET /api/students`: Mask Aadhaar number by default and strip internal fields in list views.
- **Acceptance Criteria:** `passwordHash` never appears in any API response.

#### Task 0.7: Safe Database Seeding Guard
- **Files:** `prisma/seed.ts`
- **Actions:**
  - Check `process.env.NODE_ENV === "production"`. If true, immediately exit with error.
  - Require explicit environment flag `ALLOW_DESTRUCTIVE_SEED=true` to delete existing data.
  - Make seed operations idempotent (upsert schools and test users instead of blind `deleteMany`).
- **Acceptance Criteria:** `npx prisma db seed` fails securely in production environments and cannot delete real school data.

---

### Phase 1: Financial Correctness, Storage & Concurrency (P1)

#### Task 1.1: Concurrency-Safe Payment Processing
- **Files:** `src/app/api/payments/route.ts`, `src/app/api/payments/razorpay/verify/route.ts`
- **Actions:**
  - Move invoice balance check, payment calculation, status update, and receipt generation inside an atomic `$transaction`.
  - Calculate remaining balance using Prisma Decimal arithmetic and reject any payment amount greater than remaining balance (`overpayment`).
  - Do NOT trust client-supplied `json.receiptNumber`. Generate sequential receipts using an atomic sequence or database counter.
  - Enforce payment idempotency: check if `gatewayRef` already exists before recording payment.
- **Acceptance Criteria:** Concurrent payments for the same invoice never cause duplicate receipts or inconsistent statuses. Overpayments are rejected.

#### Task 1.2: Disable Mock Payment Signatures in Production
- **Files:** `src/lib/razorpay.ts`
- **Actions:**
  - In `verifyPaymentSignature()`: If `NODE_ENV === "production"`, refuse any signature starting with `mock_sig_` and require strict HMAC-SHA256 signature verification with authoritative key secret.
  - Validate that `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are not demo strings in production.
- **Acceptance Criteria:** Mock payment signatures fail verification in production.

#### Task 1.3: Persistent Cloud Storage Driver & File Signature Validation
- **Files:** `src/lib/storage.ts`, `src/app/api/upload/student-photo/route.ts`, `src/app/api/upload/assignment/route.ts`
- **Actions:**
  - Implement real AWS S3 / Cloudflare R2 driver in `S3StorageDriver` using `@aws-sdk/client-s3`.
  - If `STORAGE_PROVIDER === "s3"`, validate that `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_S3_ENDPOINT` are configured; fail cleanly if missing.
  - Add magic-byte file signature validation for uploaded buffers (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, WebP: `52 49 46 46`, PDF: `25 50 44 46`).
  - Isolate uploaded object keys by `schoolId` (e.g. `uploads/${schoolId}/${folder}/${uniqueName}`).
- **Acceptance Criteria:** Spoofed MIME types are rejected. Files are organized by school. S3 uploads correctly write to object storage when configured.

#### Task 1.4: Rate Limiter Hardening
- **Files:** `src/lib/rateLimit.ts`
- **Actions:**
  - Add max store size (e.g. 10,000 keys) with LRU eviction to prevent memory exhaustion.
  - Key login rate limit by composite `ip + ":" + normalizedEmail` to avoid single-ip denial of service on arbitrary user accounts.
  - Avoid logging raw email addresses.
- **Acceptance Criteria:** Memory is bounded. Legitimate users cannot be locked out by third-party DoS attacks.

---

### Phase 2: Lint, Types & UX Hardening (P2)

#### Task 2.1: Resolve ESLint Errors
- **Files:** `src/components/GlobalSearch.tsx`, `src/lib/auth.ts`, `src/lib/tenant.ts`, `src/lib/security.ts`
- **Actions:**
  - Fix `react-hooks/set-state-in-effect` in `GlobalSearch.tsx` by separating open/close effect and input clearing.
  - Replace explicit `any` in library utilities with proper Prisma and NextAuth types.
  - Escape unescaped HTML quotes in JSX.
- **Acceptance Criteria:** `npm run lint` passes with 0 errors.

#### Task 2.2: Public Health Endpoint Information Minimization
- **Files:** `src/app/api/health/route.ts`
- **Actions:**
  - Return minimal status `{ status: "ok", timestamp: "..." }` for anonymous requests.
  - Keep internal metrics restricted to authenticated admin calls or internal monitoring headers.
- **Acceptance Criteria:** Server memory and environment details are not disclosed publicly.

---

### Phase 3: Comprehensive Automated Testing

#### Task 3.1: Expanded Tenant Isolation Test Suite
- **Files:** `scripts/test-tenant-isolation.ts`
- **Actions:**
  - Add tests for `Teacher`, `TeacherSubject`, `StudentParent`, and `Marks` isolation across two test schools.
  - Test cross-tenant mutation attempts on sections, invoices, timetable, and departments.
  - Verify zero leakage in search, marks autocomplete, and attendance operations.
- **Acceptance Criteria:** All test groups pass with 100% success rate.

#### Task 3.2: Security & Payment Concurrency Tests
- **Files:** `scripts/test-security-suite.ts` (new)
- **Actions:**
  - Test PII encryption, decryption failure handling, and Aadhaar masking.
  - Test payment balance validation, overpayment rejection, and receipt concurrency.
  - Test role authorization across every API endpoint with Admin, Teacher, Parent, and Accountant contexts.
- **Acceptance Criteria:** Automated test script confirms all P0/P1 fixes.

---

### Phase 4: Production Deployment Readiness

#### Task 4.1: Documentation & Environment Synchronization
- **Files:** `README.md`, `.env.example`, `SECURITY_TEST_PLAN.md`, `DEPLOYMENT_RUNBOOK.md`
- **Actions:**
  - Remove public demo credentials and shared passwords from `README.md`.
  - Update `.env.example` with clear, safe placeholders.
  - Document complete deployment runbook, Vercel environment variables, and rollback procedures.
- **Acceptance Criteria:** Documentation is accurate, secure, and production-ready.
