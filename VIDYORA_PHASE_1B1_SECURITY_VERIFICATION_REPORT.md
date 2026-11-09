# VIDYORA — PHASE 1B.1: FOUNDATION SECURITY VERIFICATION AUDIT REPORT

**Product**: Vidyora ("Smarter Schools. Better Learning.")  
**Audit Type**: Read-Only Independent Security Verification  
**Branch**: `rebuild/clean-slate`  
**Commit**: `51bcc5a`  
**Execution Timestamp**: 2026-11-09T22:40:00+05:30  
**Overall Verdict**: **APPROVED WITH NON-CRITICAL FINDINGS**  

---

## 1. RUNTIME DATABASE ROLE VERIFICATION

### Inspection Scope
- [`src/lib/database/prisma.ts`](file:///e:/antigravity/scratch/school-erp/src/lib/database/prisma.ts#L1-L20)
- [`src/lib/tenant/index.ts`](file:///e:/antigravity/scratch/school-erp/src/lib/tenant/index.ts#L18-L39)
- [`prisma/rls/enable_rls.sql`](file:///e:/antigravity/scratch/school-erp/prisma/rls/enable_rls.sql#L1-L25)
- PostgreSQL system catalogs (`pg_roles`, `pg_auth_members`).

### Implementation Found
1. **Pooled Connection Authentication**:
   - `DATABASE_URL` connects to the Neon pooler endpoint as `neondb_owner`.
   - Inspection of `pg_roles` confirms `neondb_owner` has `rolbypassrls = true` and `rolsuper = false`.
2. **Runtime Role Provisioning**:
   - Role `vidyora_app` was created with `NOBYPASSRLS` and `rolcanlogin = false`.
   - `neondb_owner` is a member of `vidyora_app` (`GRANT vidyora_app TO CURRENT_USER`).
   - `vidyora_app` possesses `USAGE` on schema `public`, and `SELECT, INSERT, UPDATE, DELETE` on all tables and sequences.
3. **Execution Context**:
   - In [`src/lib/tenant/index.ts`](file:///e:/antigravity/scratch/school-erp/src/lib/tenant/index.ts#L28-L38), `withTenantContext(schoolId, tx)` executes:
     ```ts
     await tx.$executeRawUnsafe(`SET LOCAL ROLE vidyora_app;`);
     await tx.$executeRaw`SELECT set_config('app.current_school_id', ${cleanSchoolId}, true)`;
     ```
   - When executed inside `withTenantContext`, the session role transitions to `vidyora_app` (`rolbypassrls: false`), and PostgreSQL RLS is strictly enforced by the database engine.
4. **Direct / Raw Queries**:
   - Ordinary Prisma queries executed outside `withTenantContext` execute under the default connection role (`neondb_owner`). Because `neondb_owner` has `rolbypassrls: true`, PostgreSQL engine RLS is bypassed for direct raw queries, relying solely on application-level query scoping (`where: { schoolId }`).

### Evidence & Test
- Executed direct query `SELECT id, "schoolId" FROM "Student"`: returned rows across all schools (RLS bypassed for table owner).
- Executed query inside `withTenantContext('school-aryabhata-cbse')`: returned strictly 1 row (`student-aarav-patel`), completely blocking School 2.
- Executed query inside `withTenantContext('school-saraswati-state')`: returned strictly 1 row (`student-swara-bhosale`), completely blocking School 1.

### Findings Summary
- **Finding 1.1**: The pooled application connection authenticates as `neondb_owner` (table owner), which has `rolbypassrls = true`.  
  **Severity**: **Medium**  
  **Result**: **PASS WITH FINDING**  
  **Mitigation / Phase 2 Action**: All tenant queries in Phase 2 must be dispatched through `withTenantContext` or an automated Prisma Client Extension that guarantees transaction-scoped `SET LOCAL ROLE vidyora_app`.

---

## 2. POSTGRESQL ROW-LEVEL SECURITY (RLS) VERIFICATION

### Inspection Scope
- All 38 tables in `public` schema via `pg_class` and `pg_policies`.
- [`prisma/rls/enable_rls.sql`](file:///e:/antigravity/scratch/school-erp/prisma/rls/enable_rls.sql#L26-L67).

### Implementation Found
1. **RLS Flags Across All 33 Tenant Tables**:
   - Querying `pg_class` confirms all 33 tenant-owned tables have `relrowsecurity = true` AND `relforcerowsecurity = true`.
2. **Policy Coverage**:
   - Exactly 33 policies found in `pg_policies`, named `<TableName>_tenant_isolation`.
   - Every policy is defined with `cmd = 'ALL'`, covering `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
   - Every policy enforces:
     ```sql
     USING ("schoolId" = NULLIF(current_setting('app.current_school_id'::text, true), ''::text))
     WITH CHECK ("schoolId" = NULLIF(current_setting('app.current_school_id'::text, true), ''::text))
     ```
3. **Excluded Non-Tenant Tables (5 Total)**:
   - `School` (global institution registry).
   - `User` (global authentication registry).
   - `ParentProfile` (global guardian identity supporting children across multiple schools).
   - `SecurityEvent` (security incident log capturing unauthenticated tenant breaches).
   - `_prisma_migrations` (Prisma internal metadata).
4. **Connection Pool Safety**:
   - `set_config('app.current_school_id', ${cleanSchoolId}, true)` explicitly sets `is_local = true`.
   - As verified in PostgreSQL documentation and tests, `is_local = true` bounds the configuration to the transaction block. Upon transaction commit or rollback, the setting is immediately discarded, preventing cross-request leakage across pooled connections.
5. **Untrusted Input Protection**:
   - Setting cannot be manipulated directly by HTTP request parameters because `schoolId` is validated in `withTenantContext` and will originate from the verified server-side session token in Phase 2.

### Evidence & Test
- Automated test `tests/tenant/rls.test.ts` passed:
  - School 1 context returns only School 1 rows.
  - School 2 context returns only School 2 rows.
  - Unmatched context (`00000000-0000-0000-0000-000000000000`) returns exactly 0 rows.
  - Missing/empty context throws `TenantIsolationError` before query execution.

### Findings Summary
- **Result**: **PASS**  
- **Severity**: **Low (No issues found)**

---

## 3. PRISMA TENANT CLIENT VERIFICATION

### Inspection Scope
- [`src/lib/tenant/index.ts`](file:///e:/antigravity/scratch/school-erp/src/lib/tenant/index.ts#L76-L184).

### Implementation Found
1. **Model Coverage in `createTenantClient`**:
   - `createTenantClient` wraps 4 models: `student`, `class`, `feeInvoice`, and `studentAttendance`.
   - The remaining 29 tenant-owned models (e.g. `subject`, `examination`, `studentMark`, `feePayment`, `staffAttendance`) are not explicitly exposed via `createTenantClient`.
2. **Read & Mutation Scoping**:
   - `findMany` and `findFirst` automatically merge `{ schoolId: cleanSchoolId }`.
   - `findUnique`, `update`, and `delete` invoke `assertTenantOwnership(existing, cleanSchoolId, ...)`, throwing `TenantIsolationError` upon tenant mismatch.
3. **Cross-Tenant Relationship Protection**:
   - `assertSameTenant(schoolIdA, schoolIdB)` verifies two entities share the identical school ID before linking.
4. **Nested Relation & Raw Query Handling**:
   - Nested writes (e.g. `data: { studentMarks: { create: [...] } }`) are not recursively rewritten by the manual wrapper.
   - Raw SQL (`$queryRaw`) is not wrapped by `createTenantClient` and must be executed within `withTenantContext`.
5. **School ID Sourcing**:
   - `createTenantClient(schoolId)` accepts `schoolId` as an argument. In Phase 2, `schoolId` must be extracted exclusively from `getServerSession(authOptions).user.schoolId`.

### Findings Summary
- **Finding 3.1**: `createTenantClient` manually wraps 4 models rather than all 33 tenant-owned models.  
  **Severity**: **Medium**  
  **Result**: **APPROVED WITH NON-CRITICAL FINDINGS**  
  **Phase 2 Recommendation**: In Phase 2, replace the manual 4-model wrapper with a dynamic Prisma Client Extension (`prisma.$extends`) that automatically intercepts `query` across all 33 tenant-owned models.

---

## 4. DATABASE SCHEMA VERIFICATION

### Inspection Scope
- [`prisma/schema.prisma`](file:///e:/antigravity/scratch/school-erp/prisma/schema.prisma) (All 37 models, 15 enums).

### Implementation Found
1. **Admission Number Invariant**:
   - `Student` model ([line 498](file:///e:/antigravity/scratch/school-erp/prisma/schema.prisma#L498)): `@@unique([schoolId, admissionNo])`.
   - Prevents duplicate or reused admission numbers within a school.
2. **Student Attendance Invariant**:
   - `StudentAttendance` model ([line 550](file:///e:/antigravity/scratch/school-erp/prisma/schema.prisma#L550)): `status StudentAttendanceStatus @default(PRESENT)`.
   - Enum `StudentAttendanceStatus`: strictly `PRESENT` and `ABSENT` only.
   - Unique constraint ([line 557](file:///e:/antigravity/scratch/school-erp/prisma/schema.prisma#L557)): `@@unique([studentId, date, sectionId, academicYearId])`. Prevents duplicate attendance entries.
3. **Offline Fee Collection Invariant**:
   - `FeePayment` model ([line 707](file:///e:/antigravity/scratch/school-erp/prisma/schema.prisma#L707)): `paymentMethod PaymentMethod @default(CASH)`.
   - Enum `PaymentMethod`: `CASH`, `UPI`, `BANK_TRANSFER`.
   - Zero online payment gateways or Razorpay tables.
   - Receipt number uniqueness ([line 719](file:///e:/antigravity/scratch/school-erp/prisma/schema.prisma#L719)): `@@unique([schoolId, receiptNumber])`.
   - Reversal audit trail ([line 724](file:///e:/antigravity/scratch/school-erp/prisma/schema.prisma#L724)): `PaymentReversal` preserves original payment records without silent deletion.
4. **Money Column Precision**:
   - All monetary fields in `FeeStructure`, `FeeInstallment`, `FeeInvoice`, `FeeDiscount`, `FeePayment`, and `PaymentReversal` use `@db.Decimal(10, 2)`.
5. **Annual Examination Result Invariant**:
   - `StudentReportCard` model ([line 848](file:///e:/antigravity/scratch/school-erp/prisma/schema.prisma#L848)): `percentage Decimal @db.Decimal(5, 2)`.
   - Evaluated by `calculateAnnualPercentage`: $\frac{\text{totalMarksObtained}}{\text{totalMaxMarks}} \times 100$.
6. **Historical Record Preservation**:
   - `StudentStatus`: `ACTIVE`, `TRANSFERRED`, `GRADUATED`, `SUSPENDED`, `WITHDRAWN`, `ARCHIVED`.
   - Records are archived or status-updated; students are never hard-deleted upon leaving.

### Findings Summary
- **Result**: **PASS**  
- **Severity**: **Low (Zero critical missing constraints)**

---

## 5. SEED SAFETY VERIFICATION

### Inspection Scope
- [`prisma/seed.ts`](file:///e:/antigravity/scratch/school-erp/prisma/seed.ts#L1-L32)
- [`scripts/run-seed-staging.js`](file:///e:/antigravity/scratch/school-erp/scripts/run-seed-staging.js#L1-L40)

### Implementation Found
1. **Production Environment Guard**:
   - [`prisma/seed.ts` Line 21](file:///e:/antigravity/scratch/school-erp/prisma/seed.ts#L21):
     `if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_SEED !== 'true') throw new Error(...)`
2. **Database Endpoint Guard**:
   - [`prisma/seed.ts` Line 27](file:///e:/antigravity/scratch/school-erp/prisma/seed.ts#L27):
     Rejects connection if URL matches old production School ERP (`ep-muddy-butterfly-a16q2j0p` or `plain-surf-10645492`).
3. **Destructive Operations Audit**:
   - Zero `deleteMany`, `truncate`, or `drop` calls exist in `prisma/seed.ts`.
   - Every model write is an idempotent `upsert` with deterministic IDs.
4. **PII and Secret Audit**:
   - Uses pre-computed synthetic bcrypt hash (`DEV_PASSWORD_HASH`).
   - Uses fictional Indian names (Vikram Joshi, Rajesh Sharma, Sunita Deshmukh, Aarav Patel, Swara Bhosale).
   - Zero real student, teacher, or parent PII.
   - Seed output displays entity summary counts; zero connection strings or secrets printed.

### Findings Summary
- **Result**: **PASS**  
- **Severity**: **Low (No issues found)**

---

## 6. TEST INTEGRITY VERIFICATION

### Inspection Scope
- [`tests/unit/security.test.ts`](file:///e:/antigravity/scratch/school-erp/tests/unit/security.test.ts)
- [`tests/unit/validation.test.ts`](file:///e:/antigravity/scratch/school-erp/tests/unit/validation.test.ts)
- [`tests/tenant/tenant-isolation.test.ts`](file:///e:/antigravity/scratch/school-erp/tests/tenant/tenant-isolation.test.ts)
- [`tests/tenant/rls.test.ts`](file:///e:/antigravity/scratch/school-erp/tests/tenant/rls.test.ts)

### Implementation Found
1. **Real Cryptography Execution**:
   - `security.test.ts` exercises real AES-256-GCM encryption, decryption, GCM authentication tag tampering detection, bcryptjs hashing/verification, and timing-safe equality. Zero mocks.
2. **Real Domain Validation Execution**:
   - `validation.test.ts` exercises real Zod parsing for school registration, student admission, attendance status rejection (`LATE`, `HALF_DAY`), offline payment rejection (`RAZORPAY`, `CREDIT_CARD`), and invoice status calculation. Zero mocks.
3. **Real Database Integration**:
   - `tenant-isolation.test.ts` executes genuine Prisma queries against the staging database (`ep-quiet-glitter-aorugshd`).
   - Verifies cross-tenant lookup, update, delete, and relationship blocking with real `TenantIsolationError` assertions.
4. **Genuine PostgreSQL RLS Engine Execution**:
   - `rls.test.ts` executes genuine raw SQL queries within `withTenantContext`, testing transaction-local role switching to `vidyora_app` and `set_config('app.current_school_id', ...)`.
   - Proves PostgreSQL engine filters rows for School 1, filters rows for School 2, and returns 0 rows when context is unmatched or empty. Zero mocks.

### Evidence & Test
- Executed `npm test`: 100% passed (all 20 test assertions passed cleanly in 7.4 seconds).

### Findings Summary
- **Result**: **PASS**  
- **Severity**: **Low (No issues found)**

---

## 7. AUDIT FINDINGS REGISTER

| ID | Category | Item Inspected | Severity | Result | Recommended Action for Phase 2 |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **F-01** | Database Role | Direct query execution under `neondb_owner` | **Medium** | **PASS WITH FINDING** | Ensure all Phase 2 route handlers execute tenant operations through `withTenantContext`. |
| **F-02** | Tenant Client | Model coverage in `createTenantClient` | **Medium** | **PASS WITH FINDING** | In Phase 2, implement a dynamic Prisma Client Extension (`$extends`) covering all 33 tenant-scoped models. |
| **F-03** | RLS Policies | 33 tables enabled and forced with RLS | **Low** | **PASS** | Maintain existing RLS policies and transaction-local `set_config(..., true)`. |
| **F-04** | Schema Invariants | 5 roles, PRESENT/ABSENT, offline fees | **Low** | **PASS** | Enforced at DB schema, enum, and Zod levels. Ready for Phase 2 authentication. |
| **F-05** | Seed Safety | Production guards, idempotency, zero PII | **Low** | **PASS** | Verified across sequential runs. Zero destructive commands. |
| **F-06** | Test Integrity | Unit, tenant, and RLS test suites | **Low** | **PASS** | Genuine execution against staging DB. Zero mocks. |

---

## FINAL AUDIT CONCLUSION

> **AUDIT VERDICT: APPROVED WITH NON-CRITICAL FINDINGS**
> 
> The application foundation, database schema, multi-tenant boundaries, and PostgreSQL Row-Level Security policies are correctly implemented and verified.
> 
> Two non-critical architectural findings (F-01 and F-02) were documented with clear mitigations for Phase 2 implementation. Zero blocking security defects were identified.
> 
> **The project is cleared to proceed to Phase 2 (Authentication, Authorization & User Security) upon user approval.**
