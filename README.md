# 🎓 Vidyora — Smarter Schools. Better Learning.

Official Commercial Multi-Tenant School ERP Platform for Indian Schools (CBSE, ICSE, State Boards).

---

## 🏛️ Project Identity & Overview

- **Official Product Name**: Vidyora
- **Tagline**: Smarter Schools. Better Learning.
- **Technology Stack**:
  - **Framework**: Next.js 16 (App Router)
  - **UI / Styling**: React 19, Tailwind CSS v4, Lucide Icons
  - **Database**: Neon Serverless PostgreSQL 18.6
  - **ORM**: Prisma 6.19.3
  - **Security & Cryptography**: AES-256-GCM (PII Encryption), bcryptjs (Password Hashing)
  - **Validation**: Zod 4.6.5
  - **Mobile Container**: Capacitor 8 (Production App ID: `com.schoolerp.platform`)
  - **Hosting Target**: Vercel

---

## 🛡️ Multi-Tenant Architecture & Defense-in-Depth

Vidyora enforces strict multi-tenant isolation across two independent layers:

```text
┌────────────────────────────────────────────────────────┐
│               Authenticated Request                    │
│      Trusted School ID extracted server-side           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│        Layer 1: Application-Level Tenant Client        │
│          (src/lib/tenant/index.ts)                     │
│  - Merges { schoolId } into every Prisma query        │
│  - Blocks cross-tenant mutations & lookups             │
│  - Fails closed on missing or blank tenant context     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│     Layer 2: PostgreSQL Row-Level Security (RLS)       │
│        Scoped via withTenantContext(schoolId)          │
│  - Executes inside a transaction                      │
│  - Sets role to non-bypass role: vidyora_app (NOBYPASSRLS)
│  - Sets session variable: app.current_school_id       │
│  - PostgreSQL engine enforces RLS across all 33 tables │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│              PostgreSQL Storage Engine                 │
└────────────────────────────────────────────────────────┘
```

---

## 👥 Strict Role-Based Access Control (RBAC)

Only 5 school roles exist in Vidyora. There is **no school-level SUPER_ADMIN**:

1. **ADMIN**: Full school operational control (admissions, academic years, fee structures, settings).
2. **PRINCIPAL**: Academic and leadership authority (result approval, publishing, staff rosters).
3. **ACCOUNTANT**: Financial desk (offline fee collection, invoices, receipts, payment reversals).
4. **TEACHER**: Classroom operations (attendance registers, marks entry, timetable).
5. **PARENT**: Guardian portal (viewing authorized child attendance, report cards, fee receipts).

---

## 📐 Core Domain Invariants

- **Student Attendance**: Strictly `PRESENT` and `ABSENT` only. No Late, Half Day, or Leave for students.
- **School Fee Collection**: Offline only (`CASH`, `UPI`, `BANK_TRANSFER`). Zero online payment gateways or third-party checkouts.
- **Annual Examination Result Rule**:
  $$\text{Percentage} = \left(\frac{\text{Total Marks Obtained Across All Conducted Exams}}{\text{Total Maximum Marks Across Those Exams}}\right) \times 100$$
- **Admission Numbers**: Unique per school and never reused.
- **Receipt Numbers**: Unique sequential series per school, allocated atomically.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+ (Node.js 24 recommended)
- Access to the Vidyora Staging Neon PostgreSQL database

### 2. Configure Environment
```bash
cp .env.example .env.local
```
Ensure `.env.local` contains valid staging database connection strings (`DATABASE_URL` and `DATABASE_URL_UNPOOLED`).

### 3. Deploy Database Migrations & Enable RLS
```bash
node scripts/run-migrate-staging.js
node scripts/apply-rls.js
```

### 4. Seed Synthetic Development Records
```bash
node scripts/run-seed-staging.js
```

### 5. Run Verification Test Suites
```bash
npm test
```

### 6. Start Development Server
```bash
npm run dev
```

---

## 📁 Repository Structure

```text
├── android/                    # Android Capacitor native project container
├── archive/                    # Archived legacy schemas, migrations, and code
├── docs/                       # Architectural & design specifications
├── prisma/
│   ├── schema.prisma           # Fresh normalized relational schema (37 models)
│   ├── migrations/             # Active migration history (0_init)
│   ├── rls/                    # PostgreSQL RLS policies & runtime role definition
│   └── seed.ts                 # Idempotent synthetic development seed
├── public/                     # Static web assets
├── scripts/                    # Automation and migration runner scripts
├── src/
│   ├── app/                    # Next.js App Router (layout, landing, portal stubs)
│   ├── components/             # Reusable UI & toast notifications
│   ├── lib/
│   │   ├── authorization/      # 5-role definitions & permission matrix
│   │   ├── database/           # Prisma client singleton
│   │   ├── security/           # AES-256-GCM PII encryption, bcrypt hashing
│   │   ├── tenant/             # Tenant client & transaction-local RLS runner
│   │   ├── validation/         # Zod schemas for all domain workflows
│   │   ├── env.ts              # Type-safe environment validation
│   │   └── utils.ts            # Formatting, response helpers, CSS utilities
│   ├── modules/                # Domain module definitions
│   └── types/                  # Global TypeScript type definitions
└── tests/
    ├── unit/                   # Security & domain validation unit tests
    └── tenant/                 # Real PostgreSQL tenant isolation & RLS tests
```

---

## 📜 Quality Commands

| Command | Description |
| :--- | :--- |
| `npm run lint` | Runs ESLint across `src/**/*.{ts,tsx}` |
| `npm run test:unit` | Executes cryptography, domain, and validation unit tests |
| `npm run test:tenant` | Executes multi-tenant isolation and PostgreSQL RLS tests against staging |
| `npm test` | Runs both unit and tenant test suites |
| `npm run build` | Produces an optimized Next.js production build |
