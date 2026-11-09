# Vidyora — Environment Variables Specification

All environment variables used in Vidyora are strictly validated using Zod in `src/lib/env.ts`.

---

## 1. Core Variables

| Variable Name | Required | Default / Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | **Yes** | Pooled PostgreSQL connection string for application runtime queries (Neon connection pooler). |
| `DATABASE_URL_UNPOOLED` | Optional | Direct, unpooled PostgreSQL connection string used for schema migrations and administrative operations. |
| `NEXTAUTH_SECRET` | **Yes** (Prod) | Minimum 32-character secret key used to sign and verify NextAuth session JWTs. Fallback provided in dev only. |
| `NEXTAUTH_URL` | Optional | Canonical URL of the application. In production, local hosts (`localhost`, `127.0.0.1`) are automatically stripped. |
| `PII_ENCRYPTION_KEY` | **Yes** (Prod) | Minimum 32-character secret key used to derive AES-256-GCM encryption keys for sensitive student PII. |
| `STORAGE_PROVIDER` | No | `"local"` (default for dev) or `"s3"` (for AWS S3 / Cloudflare R2 cloud storage). |
| `NODE_ENV` | No | `"development"`, `"test"`, or `"production"` (default: `"development"`). |

---

## 2. Legacy Variables Removed

The following legacy variables from School ERP are **no longer supported or permitted** in Vidyora:

- `RAZORPAY_KEY_ID`: Removed. Vidyora fee collection is offline only.
- `RAZORPAY_KEY_SECRET`: Removed. No payment gateway integration.
- `NEON_DATABASE_URL`: Standardized to `DATABASE_URL`.
- `NEON_DATABASE_URL_UNPOOLED`: Standardized to `DATABASE_URL_UNPOOLED`.
