import { VerificationPurpose } from "@prisma/client";
import { prisma } from "../database/prisma";
import { generateNumericOtp, generateSecureToken, sha256Hash, timingSafeEqual } from "./hashing";

export interface CreateTokenOptions {
  identifier: string;
  purpose: VerificationPurpose;
  isNumericOtp?: boolean;
  otpDigits?: number;
  ttlMinutes?: number;
  resendCooldownSeconds?: number;
  maxAttempts?: number;
  metadata?: Record<string, unknown>;
}

export interface VerifyTokenResult {
  success: boolean;
  error?: "EXPIRED" | "NOT_FOUND" | "ALREADY_USED" | "MAX_ATTEMPTS_EXCEEDED" | "INVALID_CODE";
  metadata?: Record<string, unknown>;
  remainingAttempts?: number;
}

/**
 * Creates a purpose-bound cryptographic verification token or 6-digit OTP.
 * Stores only the SHA-256 hash in the database.
 * Returns the unhashed token strictly for dispatch to the user.
 */
export async function createVerificationToken(options: CreateTokenOptions): Promise<{
  token: string;
  expiresAt: Date;
  resendAfter: Date;
}> {
  const {
    identifier,
    purpose,
    isNumericOtp = false,
    otpDigits = 6,
    ttlMinutes = 10,
    resendCooldownSeconds = 60,
    maxAttempts = 3,
    metadata = {},
  } = options;

  const now = new Date();

  // 1. Check cooldown for recent active token
  const existingActive = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      purpose,
      usedAt: null,
      resendAfter: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingActive && existingActive.resendAfter) {
    const remainingSeconds = Math.ceil((existingActive.resendAfter.getTime() - now.getTime()) / 1000);
    throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new verification code.`);
  }

  // 2. Invalidate any previous unused tokens for this identifier and purpose
  await prisma.verificationToken.updateMany({
    where: {
      identifier,
      purpose,
      usedAt: null,
    },
    data: {
      usedAt: now,
    },
  });

  // 3. Generate raw token or numeric OTP
  const rawToken = isNumericOtp ? generateNumericOtp(otpDigits) : generateSecureToken(32);
  const tokenHash = sha256Hash(rawToken);

  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
  const resendAfter = new Date(now.getTime() + resendCooldownSeconds * 1000);

  // 4. Save hash to database
  await prisma.verificationToken.create({
    data: {
      identifier,
      purpose,
      tokenHash,
      expiresAt,
      resendAfter,
      maxAttempts,
      metadata: metadata as object,
    },
  });

  return {
    token: rawToken,
    expiresAt,
    resendAfter,
  };
}

/**
 * Verifies a token or OTP against its SHA-256 hash.
 * Enforces single-use, expiration, and maximum attempt limits.
 */
export async function verifyVerificationToken(
  identifier: string,
  purpose: VerificationPurpose,
  providedToken: string
): Promise<VerifyTokenResult> {
  if (!providedToken || !identifier) {
    return { success: false, error: "INVALID_CODE" };
  }

  const now = new Date();

  // Find the latest token for identifier and purpose
  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      purpose,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { success: false, error: "NOT_FOUND" };
  }

  if (record.usedAt) {
    return { success: false, error: "ALREADY_USED" };
  }

  if (record.expiresAt < now) {
    return { success: false, error: "EXPIRED" };
  }

  if (record.attempts >= record.maxAttempts) {
    return { success: false, error: "MAX_ATTEMPTS_EXCEEDED" };
  }

  // Hash provided token and verify with timing safe equal
  const providedHash = sha256Hash(providedToken.trim());
  const isMatch = timingSafeEqual(providedHash, record.tokenHash);

  if (!isMatch) {
    const updated = await prisma.verificationToken.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = Math.max(0, updated.maxAttempts - updated.attempts);
    return {
      success: false,
      error: remaining === 0 ? "MAX_ATTEMPTS_EXCEEDED" : "INVALID_CODE",
      remainingAttempts: remaining,
    };
  }

  // Successful match: Mark as used (single use)
  await prisma.verificationToken.update({
    where: { id: record.id },
    data: { usedAt: now },
  });

  return {
    success: true,
    metadata: (record.metadata as Record<string, unknown>) || {},
  };
}
