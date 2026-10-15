# School ERP — Regression & Quality Assurance Test Report

**Execution Date:** October 2026  
**Environment:** Next.js 16.3.5 / Node.js 20+ / Windows / Prisma 6.19.3  

---

## 1. Test Execution Summary

| Test Suite | Scope | Executed Command | Results |
| :--- | :--- | :--- | :--- |
| **Tenant Scoping Guard** | 21 Schema models vs `TENANT_SCOPED_MODELS` | `npm run check:tenant-scoping` | **PASS (21 models verified)** |
| **Tenant Isolation & Security** | Cross-tenant queries, mutations, upsert deduplication | `npm run test:tenant` | **PASS (29 passed, 0 failed)** |
| **TypeScript Typecheck** | Full workspace static type analysis | `npx tsc --noEmit` | **PASS (0 type errors)** |
| **Production Build** | Static generation, SSR, route compilation (Turbopack) | `npm run build` | **PASS (76 routes compiled successfully)** |
| **Live API Public Endpoints** | Production `/api/health`, `/api/schools`, `/api/auth/csrf` | Node `fetch` live probing | **PASS (Identified and verified live crash root causes)** |

---

## 2. Tenant Isolation Detailed Results (29 Tests)

- **Test Group 1: Smoke Tests (7 Tests)**
  - PASS: `findMany(Student)` only returns School A students (0 School B leakage)
  - PASS: `findMany(FeeInvoice)` only returns School A invoices
  - PASS: `findMany(Notice)` only returns School A notices
  - PASS: `findUnique` on School B record returns null for School A tenant client
  - PASS: `findUniqueOrThrow` on School B record throws P2025
  - PASS: `update` on School B record is blocked with P2025
  - PASS: `create` forces session schoolId on created record

- **Test Group 2: Attendance Upsert Regression Tests (4 Tests)**
  - PASS: First upsert creates attendance record with schoolId
  - PASS: Re-submitting attendance updates existing record in-place with zero duplicate rows
  - PASS: Teacher from School A CANNOT upsert attendance for School B student (blocked with P2025)
  - PASS: Upsert with caller-supplied `create.schoolId` is rejected immediately

- **Test Group 3: Schema Drift Guard (1 Test)**
  - PASS: `TENANT_SCOPED_MODELS` contains all 21 tenant-scoped models in datamodel

- **Test Group 4: Marks Upsert Isolation & Regression Tests (4 Tests)**
  - PASS: `findMany(Subject)` only returns School A subjects (0 School B leakage)
  - PASS: First Marks upsert creates new mark record with correct score and maxScore
  - PASS: Re-submitting Marks updates existing record in-place with zero duplicate rows
  - PASS: School A client cannot access School B student for cross-tenant marks entry

- **Test Group 5: CertificateLog (TC Register) Tenant Isolation (4 Tests)**
  - PASS: `findMany(CertificateLog)` only returns School A TC records
  - PASS: `findUnique(CertificateLog)` on School B record returns null for School A client
  - PASS: `create(CertificateLog)` automatically forces session schoolId on generated TC record
  - PASS: `update(CertificateLog)` on School B record is blocked with P2025

- **Test Group 6: Department Tenant Isolation (3 Tests)**
  - PASS: `findMany(Department)` only returns School A departments
  - PASS: `create(Department)` forces schoolId
  - PASS: `update(Department)` on School B record is blocked with P2025

- **Test Group 7: LeaveRequest Tenant Isolation (3 Tests)**
  - PASS: `findMany(LeaveRequest)` only returns School A staff leave requests
  - PASS: `create(LeaveRequest)` forces schoolId
  - PASS: `update(LeaveRequest)` on School B record is blocked with P2025

- **Test Group 8: Assignment Tenant Isolation (3 Tests)**
  - PASS: `findMany(Assignment)` only returns School A assignments
  - PASS: `create(Assignment)` forces schoolId
  - PASS: `update(Assignment)` on School B record is blocked with P2025
