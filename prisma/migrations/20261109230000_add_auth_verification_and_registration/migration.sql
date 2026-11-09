-- CreateEnum
CREATE TYPE "RegistrationApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'DOCUMENTS_REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFICATION', 'MOBILE_OTP', 'PASSWORD_RESET', 'ADMIN_ACTIVATION', 'PARENT_INVITATION');

-- CreateEnum
CREATE TYPE "GuardianVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'REVOKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspendedReason" TEXT;

-- AlterTable
ALTER TABLE "SchoolMembership" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudentGuardian" ADD COLUMN "verificationStatus" "GuardianVerificationStatus" NOT NULL DEFAULT 'VERIFIED';

-- CreateTable
CREATE TABLE "SchoolRegistrationApplication" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "schoolEmail" TEXT NOT NULL,
    "contactMobile" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "boardType" TEXT NOT NULL DEFAULT 'CBSE',
    "affiliationNumber" TEXT,
    "adminFullName" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminMobile" TEXT NOT NULL,
    "adminPasswordHash" TEXT NOT NULL,
    "status" "RegistrationApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "emailVerifiedAt" TIMESTAMP(3),
    "mobileVerifiedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "requestedDocuments" TEXT,
    "submittedDocuments" JSONB,
    "createdSchoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolRegistrationApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "resendAfter" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolRegistrationApplication_schoolEmail_key" ON "SchoolRegistrationApplication"("schoolEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolRegistrationApplication_adminEmail_key" ON "SchoolRegistrationApplication"("adminEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolRegistrationApplication_createdSchoolId_key" ON "SchoolRegistrationApplication"("createdSchoolId");

-- CreateIndex
CREATE INDEX "SchoolRegistrationApplication_status_idx" ON "SchoolRegistrationApplication"("status");

-- CreateIndex
CREATE INDEX "SchoolRegistrationApplication_schoolEmail_idx" ON "SchoolRegistrationApplication"("schoolEmail");

-- CreateIndex
CREATE INDEX "SchoolRegistrationApplication_adminEmail_idx" ON "SchoolRegistrationApplication"("adminEmail");

-- CreateIndex
CREATE INDEX "VerificationToken_identifier_purpose_idx" ON "VerificationToken"("identifier", "purpose");

-- CreateIndex
CREATE INDEX "VerificationToken_tokenHash_idx" ON "VerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "VerificationToken_expiresAt_idx" ON "VerificationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE INDEX "SchoolMembership_schoolId_isActive_idx" ON "SchoolMembership"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "StudentGuardian_schoolId_verificationStatus_idx" ON "StudentGuardian"("schoolId", "verificationStatus");

-- AddForeignKey
ALTER TABLE "SchoolRegistrationApplication" ADD CONSTRAINT "SchoolRegistrationApplication_createdSchoolId_fkey" FOREIGN KEY ("createdSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
