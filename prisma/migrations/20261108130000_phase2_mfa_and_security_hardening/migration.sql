-- ============================================================================
-- Phase 2: MFA & Security Hardening Migration
-- Nature: Strictly Forward-Compatible & Additive DDL
-- Target: Neon PostgreSQL (Applied via Prisma Migrate)
-- ============================================================================
-- SAFETY POSTURE:
-- 1. All statements use IF NOT EXISTS semantics to guarantee idempotency.
-- 2. New columns on existing tables have safe defaults (e.g. mfaEnabled = false).
-- 3. Zero existing data or tables are altered or dropped.
--
-- ROLLBACK & OPERATIONAL GUIDELINES:
-- 1. RECOMMENDED (Non-Destructive Forward-Fix):
--    If an issue occurs in production, disable MFA or rate limiting via application
--    configuration or a forward code deployment. Leave the database columns and tables
--    dormant to preserve existing admin enrollments, secrets, and audit history.
--
-- 2. DESTRUCTIVE ROLLBACK (Disaster Recovery Runbook Only):
--    Executing DROP TABLE or DROP COLUMN statements permanently deletes all stored
--    MFA secrets, recovery codes, and replay records. It is inherently DESTRUCTIVE
--    and must NEVER be run in production without verified offline database backups
--    and explicit authorization.
-- ============================================================================

-- 1. Add MFA fields to User table (safe IF NOT EXISTS with non-breaking defaults)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Create UsedTotpToken table for distributed TOTP replay prevention
CREATE TABLE IF NOT EXISTS "UsedTotpToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "step" BIGINT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedTotpToken_pkey" PRIMARY KEY ("id")
);

-- Unique constraint enforcing single-use per user time-step
CREATE UNIQUE INDEX IF NOT EXISTS "UsedTotpToken_userId_step_key" ON "UsedTotpToken"("userId", "step");
CREATE INDEX IF NOT EXISTS "UsedTotpToken_userId_idx" ON "UsedTotpToken"("userId");
CREATE INDEX IF NOT EXISTS "UsedTotpToken_expiresAt_idx" ON "UsedTotpToken"("expiresAt");

-- Foreign key constraint with cascade delete
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UsedTotpToken_userId_fkey'
    ) THEN
        ALTER TABLE "UsedTotpToken" ADD CONSTRAINT "UsedTotpToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Create LoginAttempt table for distributed serverless rate limiting
CREATE TABLE IF NOT EXISTS "LoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "windowExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoginAttempt_identifier_key" ON "LoginAttempt"("identifier");
CREATE INDEX IF NOT EXISTS "LoginAttempt_identifier_idx" ON "LoginAttempt"("identifier");
CREATE INDEX IF NOT EXISTS "LoginAttempt_windowExpiresAt_idx" ON "LoginAttempt"("windowExpiresAt");
