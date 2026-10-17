# 🚀 School ERP — Production Deployment, Migration & Operations Runbook

**Document Version:** 1.0.0  
**Target Platform:** Vercel (Frontend & Serverless API) + PostgreSQL (Managed RDS / Supabase / Neon / Self-Hosted)  
**Strict Policy:** Zero downtime, zero data destruction, guaranteed tenant isolation.

---

## 1. Environment Configuration Matrix

The application strictly validates environment variables on startup. The following variables must be configured in Vercel Project Settings and local `.env` files:

### 1.1 Required Production Variables

| Variable Name | Required In | Format / Description | Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | All | PostgreSQL connection string with connection pool (`pgbouncer=true` if using serverless pooler) | `postgresql://user:pass@ep-xyz.us-east-1.aws.neon.tech/school_erp?sslmode=require` |
| `NEXTAUTH_SECRET` | All | Minimum 32-character cryptographically random secret (`openssl rand -base64 32`) | `k9J3xL...min-32-chars...` |
| `NEXTAUTH_URL` | Local / Staging | Full canonical origin of the application | `https://school-erp-wb73.vercel.app` (on Vercel, omit or set canonically) |
| `AUTH_TRUST_HOST` | Production (Vercel) | Set to `true` on Vercel to allow NextAuth to resolve the deployment host dynamically | `true` |
| `PII_ENCRYPTION_KEY` | All | Minimum 32-character secret key for AES-256-GCM Aadhaar and medical record encryption | `e8F1...min-32-chars...` |
| `STORAGE_PROVIDER` | All | `local` (development only) or `s3` (production) | `s3` |

### 1.2 Cloud Storage (AWS S3 / Cloudflare R2) Settings
*Required if `STORAGE_PROVIDER="s3"` in production:*

| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `AWS_S3_BUCKET` | Dedicated private or CDN-backed S3 bucket | `school-erp-production-uploads` |
| `AWS_S3_REGION` | S3 region or `auto` for Cloudflare R2 | `us-east-1` or `auto` |
| `AWS_ACCESS_KEY_ID` | IAM Access Key with restricted bucket permissions | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | IAM Secret Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_S3_ENDPOINT` | Custom endpoint for Cloudflare R2 / MinIO | `https://<account_id>.r2.cloudflarestorage.com` |

### 1.3 Razorpay Payment Gateway
| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | Razorpay Key ID (`rzp_live_...` in prod, `rzp_test_...` in dev) | `rzp_live_AbCdEf123456` |
| `RAZORPAY_KEY_SECRET` | Secret key for HMAC-SHA256 signature verification | Authoritative API Secret from Razorpay Dashboard |

---

## 2. Pre-Deployment Database Backup & Recovery Procedure

> [!CAUTION]
> Never execute database schema modifications or migrations without an active, verified backup.

### 2.1 Generating a Point-in-Time Database Backup
Execute against the target PostgreSQL database before applying any schema change:

```bash
# 1. Full schema + data compressed dump
pg_dump -h <HOST> -U <USER> -d <DATABASE> -F c -b -v -f "school_erp_pre_deploy_$(date +%Y%m%d_%H%M%S).dump"

# 2. Verify dump file size and structure
pg_restore -l "school_erp_pre_deploy_*.dump" | head -n 30
```

### 2.2 Point-in-Time Database Rollback Procedure
If a migration fails or data corruption occurs:

```bash
# Terminate existing connections to allow restore
psql -h <HOST> -U <USER> -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'school_erp' AND pid <> pg_backend_pid();"

# Restore database from backup archive
pg_restore -h <HOST> -U <USER> -d <DATABASE> --clean --if-exists -v "school_erp_pre_deploy_<TIMESTAMP>.dump"
```

---

## 3. Database Migration Deployment Order

> [!IMPORTANT]
> `prisma db push` is strictly forbidden in production environments. All production schema changes must use version-controlled migrations via `prisma migrate deploy`.

### Step 1: Validate Schema Locally
```bash
npx prisma validate
```

### Step 2: Generate Migration SQL (in development)
```bash
npx prisma migrate dev --name <descriptive_migration_name> --create-only
```
Review the generated SQL file in `prisma/migrations/` to verify:
1. No destructive `DROP TABLE` or `DROP COLUMN` statements exist without data preservation.
2. New foreign keys and indexes do not lock live production tables excessively.

### Step 3: Apply Migrations in Production CI/CD
In the production build / deployment pipeline:
```bash
npx prisma migrate deploy
```

---

## 4. Seeding Safety & Guardrails

1. **Production Seed Block:** `prisma/seed.ts` contains an automated environment check:
   ```ts
   if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DESTRUCTIVE_SEED) {
     console.error("❌ Refusing to run destructive seed in production!");
     process.exit(1);
   }
   ```
2. **Never Seed Automatically in Builds:** Ensure `package.json` build script is strictly:
   ```json
   "build": "next build"
   ```
   Do not attach `prisma db seed` to `postinstall` or `build`.
3. **Idempotent Demo Setup (Development Only):**
   In local development, seed demo accounts using:
   ```bash
   npm run prisma:seed
   ```

---

## 5. Vercel Production Deployment Step-by-Step

### 5.1 Step 1: Set Environment Variables in Vercel
In the Vercel Dashboard -> Project -> Settings -> Environment Variables:
1. Set `DATABASE_URL` (ensure connection pooling URL is used).
2. Set `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`).
3. Set `AUTH_TRUST_HOST` to `true`.
4. Set `PII_ENCRYPTION_KEY` (32 characters).
5. Set `STORAGE_PROVIDER` to `s3` (with AWS/R2 credentials).
6. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.

### 5.2 Step 2: Deploy from Audit Branch to Preview
Push changes to branch `fix/school-erp-security-audit`. Vercel creates an ephemeral Preview Deployment.

### 5.3 Step 3: Run Smoke Verification on Preview Deployment
Execute the automated smoke checklist against the preview URL:
1. `GET /api/health` -> HTTP 200 `{ "status": "ok" }`.
2. `GET /api/auth/csrf` -> HTTP 200 `{ "csrfToken": "..." }` (**Verifies resolution of Bug-001**).
3. Test login with authorized school account.
4. Verify tenant isolation between two test schools.
5. Verify `/uploads/...` files persist correctly.

### 5.4 Step 4: Promote to Production
Merge the audited pull request to `main` and verify production deployment status in Vercel Dashboard.

---

## 6. Secret Rotation Runbook

### 6.1 NEXTAUTH_SECRET Rotation
Rotating `NEXTAUTH_SECRET` will immediately invalidate all active user sessions, requiring all users to log in again.
1. Generate new 32-byte secret: `openssl rand -base64 32`.
2. Update `NEXTAUTH_SECRET` in Vercel Environment Variables.
3. Trigger deployment redeploy.
4. Notify administrators that active sessions will expire.

### 6.2 PII_ENCRYPTION_KEY Rotation
Do NOT change `PII_ENCRYPTION_KEY` without running a re-encryption migration, otherwise existing Aadhaar numbers and medical conditions become unreadable!
**Controlled Rotation Workflow:**
1. Configure secondary variable `PII_ENCRYPTION_KEY_OLD`.
2. Run database migration script `scripts/rotate-pii-keys.ts` that decrypts records using `PII_ENCRYPTION_KEY_OLD` and encrypts with `PII_ENCRYPTION_KEY`.
3. Verify 100% of encrypted records are readable with new key.
4. Remove `PII_ENCRYPTION_KEY_OLD`.
