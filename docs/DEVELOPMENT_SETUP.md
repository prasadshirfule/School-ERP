# Vidyora — Development Setup & Operational Runbook

**Environment Target**: Vidyora Staging Project (`ep-quiet-glitter-aorugshd`)  
**Active Development Branch**: `rebuild/clean-slate`  

---

## 1. Prerequisites

- **Node.js**: v20.x or v24.x
- **Package Manager**: npm v10+
- **Database**: Access to the Vidyora Neon Staging PostgreSQL database

---

## 2. Environment Configuration

1. Create `.env.local` from the template:
   ```bash
   cp .env.example .env.local
   ```

2. Configure staging connection strings in `.env.local`:
   ```env
   DATABASE_URL="postgresql://neondb_owner:***@ep-quiet-glitter-aorugshd-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   DATABASE_URL_UNPOOLED="postgresql://neondb_owner:***@ep-quiet-glitter-aorugshd.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   NEXTAUTH_SECRET="vidyora_dev_auth_secret_minimum_32_characters_random"
   NEXTAUTH_URL="http://localhost:3000"
   PII_ENCRYPTION_KEY="vidyora_dev_pii_encryption_key_min32chars!"
   ```

> [!WARNING]
> Never connect or point `.env.local` to the old School ERP Neon database (`plain-surf-10645492`).

---

## 3. Database Migration & RLS Setup

1. **Verify Database Identity**:
   ```bash
   node scripts/verify-staging-db.js
   ```
   Ensures connection reaches `ep-quiet-glitter-aorugshd`.

2. **Deploy Baseline Migration**:
   ```bash
   node scripts/run-migrate-staging.js
   ```
   Applies `prisma/migrations/0_init/migration.sql` to staging.

3. **Enable PostgreSQL Row-Level Security**:
   ```bash
   node scripts/apply-rls.js
   ```
   Creates the `vidyora_app` non-bypass runtime role and forces RLS across all 33 tenant tables.

4. **Seed Synthetic Development Records**:
   ```bash
   node scripts/run-seed-staging.js
   ```
   Seeds 2 distinct fictional Indian schools (`Aryabhata Vidyapeeth` - CBSE and `Saraswati Vidya Mandir` - State) with zero real PII.

---

## 4. Running Verification Test Suites

```bash
# Run unit tests (cryptography, domain validation, exam rules)
npm run test:unit

# Run PostgreSQL tenant isolation and RLS tests against staging
npm run test:tenant

# Run full test suite
npm test
```

---

## 5. Development Server & Build

```bash
# Start local development server
npm run dev

# Run TypeScript compilation check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Production build check
npm run build
```
