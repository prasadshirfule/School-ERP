# Vidyora — System Architecture & Modular Design

**Product Identity**: Vidyora ("Smarter Schools. Better Learning.")  
**Phase**: 1B — Fresh Application Foundation  
**Branch**: `rebuild/clean-slate`  

---

## 1. Architectural Philosophy

Vidyora is a commercial, multi-tenant School Enterprise Resource Planning system specifically engineered for the operational realities of Indian educational institutions (CBSE, ICSE, and State Boards).

The architecture adheres to four core design principles:
1. **Defense-in-Depth Multi-Tenancy**: Data separation is guaranteed at both the application layer (Prisma query scoping) and the PostgreSQL engine layer (Row-Level Security with a non-bypass runtime role).
2. **Domain Invariant Enforcement**: Critical institutional business rules (attendance statuses, offline fee collections, annual result calculations) are codified strictly at the database schema and validation layers, preventing UI drift.
3. **Zero Leaky Abstractions**: Database queries, cryptography, tenant context, and authorization checks are isolated from presentational UI components.
4. **Resilient Production Foundations**: All database migrations, synthetic seeds, and administrative utilities fail closed, are completely idempotent, and include production-guard assertions.

---

## 2. System Layers

```text
┌────────────────────────────────────────────────────────┐
│                   Next.js App Router                   │
│   (Server Components, Route Handlers, Edge Proxy)      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Authorization & Validation Layer            │
│   - 5 School Roles (Admin, Principal, Accountant,      │
│     Teacher, Parent)                                   │
│   - Zod Input Parsing & Sanitization                   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              Tenant Boundary & Client Layer            │
│   - createTenantClient(schoolId)                       │
│   - withTenantContext(schoolId, tx)                    │
│   - TenantIsolationError on mismatch                   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               PostgreSQL RLS Engine                    │
│   - Runtime Role: vidyora_app (NOBYPASSRLS)            │
│   - Transaction-Local Setting: app.current_school_id   │
│   - 33 Tenant Tables forced with RLS policies          │
└────────────────────────────────────────────────────────┘
```

---

## 3. Directory Layout

- `src/app/`: Next.js App Router root layout, home overview, health check API (`/api/health`), and portal route stubs (`/admin`, `/principal`, `/accountant`, `/teacher`, `/parent`).
- `src/lib/database/`: PrismaClient singleton management with development connection pooling.
- `src/lib/tenant/`: Tenant isolation client, transaction runner, and relationship assertions.
- `src/lib/authorization/`: The 5 official role definitions and granular capability matrix.
- `src/lib/security/`: AES-256-GCM PII encryption/decryption, bcrypt password hashing, and timing-safe equality.
- `src/lib/validation/`: Zod schemas for all domain inputs and business logic calculators.
- `src/modules/`: Domain interface exports (`students`, `admissions`, `academics`, `attendance`, `fees`, `staff`, `examinations`, `reports`, `notifications`).
- `tests/`: Automated test suite comprising unit and database-backed tenant isolation tests.

---

## 4. Next Steps for Phase 2

With Phase 1B complete, the foundation is prepared for:
1. NextAuth v4 Credentials provider authentication.
2. User login and password reset flows with session invalidation tracking.
3. Multi-factor authentication (MFA) foundation.
4. Server-side session verification in route handlers.
