-- ============================================================================
-- Phase 1: Platform Governance, Multi-School Administration & Audit Trail
-- Nature: Strictly Forward-Compatible & Additive Reconciliation DDL
-- Target: Neon PostgreSQL (Applied via Prisma Migrate)
-- ============================================================================
-- SAFETY POSTURE:
-- 1. All DDL statements use IF NOT EXISTS semantics to guarantee idempotency.
-- 2. New columns on existing tables provide non-breaking defaults.
-- 3. Enum values are added conditionally without recreating types.
-- 4. Constraint adjustments on Parent and User safely preserve referential integrity.
-- 5. Zero existing tables or application records are truncated or dropped.
-- ============================================================================

-- 1. Add SUPER_ADMIN to Role enum (idempotent addition)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- 2. School multi-tenancy & approval status fields
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "approvedByUserId" TEXT;

-- 3. User multi-school and status fields
ALTER TABLE "User" ALTER COLUMN "schoolId" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);

-- 4. Student primary parent email link
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "parentEmail" TEXT;

-- 5. Parent multi-school support and constraint restructuring
ALTER TABLE "Parent" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- Safely drop legacy 1-to-1 unique index on Parent(userId) to enable multi-school parents
DROP INDEX IF EXISTS "Parent_userId_key";

-- Add composite unique constraints and performance indexes for Parent
CREATE UNIQUE INDEX IF NOT EXISTS "Parent_schoolId_email_key" ON "Parent"("schoolId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "Parent_schoolId_userId_key" ON "Parent"("schoolId", "userId");
CREATE INDEX IF NOT EXISTS "Parent_email_idx" ON "Parent"("email");
CREATE INDEX IF NOT EXISTS "Parent_userId_idx" ON "Parent"("userId");

-- 6. Create SchoolRegistrationRequest table
CREATE TABLE IF NOT EXISTS "SchoolRegistrationRequest" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "boardType" TEXT NOT NULL,
    "officialEmail" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "principalName" TEXT NOT NULL,
    "affiliationNo" TEXT,
    "adminEmail" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "adminPhone" TEXT,
    "adminPasswordHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "schoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolRegistrationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolRegistrationRequest_officialEmail_key" ON "SchoolRegistrationRequest"("officialEmail");
CREATE INDEX IF NOT EXISTS "SchoolRegistrationRequest_status_idx" ON "SchoolRegistrationRequest"("status");
CREATE INDEX IF NOT EXISTS "SchoolRegistrationRequest_adminEmail_idx" ON "SchoolRegistrationRequest"("adminEmail");

-- 7. Create EmailVerificationToken table
CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_email_type_idx" ON "EmailVerificationToken"("email", "type");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_token_idx" ON "EmailVerificationToken"("token");

-- 8. Create AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_schoolId_idx" ON "AuditLog"("schoolId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
