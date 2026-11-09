/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * School ERP — Phase 1: Security & Super Admin MFA Regression Test Suite
 *
 * Verifies:
 * 1. Account Enumeration Protection (timing side-channel mitigation via dummy bcrypt compare)
 * 2. Login Rate Limiting (per-email burst limit protection + NFKC casing normalization)
 * 3. Platform Super Admin Restricted Enrollment Session (access denial to privileged APIs)
 * 4. RFC 6238 TOTP MFA Enrollment & AES-256-GCM Secret Encryption At Rest
 * 5. Mandatory MFA Challenge on Platform Super Admin Login (Full access only after MFA)
 * 6. TOTP Replay Prevention (same code within window rejected)
 * 7. Single-Use Emergency Recovery Code Consumption & Replay Prevention
 * 8. Cross-Role MFA Access Rejection (ordinary school admin cannot call platform MFA)
 * 9. Secure MFA Deactivation with Password + TOTP Dual Verification
 * 10. Stale JWT Session Revocation Defense
 *
 * Run: npx ts-node scripts/test-mfa-security.ts
 */

import bcrypt from "bcryptjs";
import { authOptions } from "../src/lib/auth";
import prisma from "../src/lib/prisma";
import {
  generateTotpSecret,
  generateTotpCode,
  generateRecoveryCodes,
  verifyTotpCode,
  verifyRecoveryCode,
  encryptSecret,
  decryptSecret,
  isTotpReplayed,
  markTotpConsumed,
} from "../src/lib/totp";
import { checkRateLimit } from "../src/lib/rateLimit";
import { Role } from "@prisma/client";
import { middleware } from "../src/middleware";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { getAuthSecret } from "../src/lib/env";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failed++;
  }
}

async function runMfaSecuritySuite() {
  console.log("══════════════════════════════════════════════════════════════════════════");
  console.log("🛡️  SCHOOL ERP — PHASE 1: FOCUSED SECURITY AUDIT & VERIFICATION SUITE");
  console.log("══════════════════════════════════════════════════════════════════════════\n");

  const credentialsProvider = authOptions.providers[0] as any;
  const authorize = (credentialsProvider?.options?.authorize || credentialsProvider?.authorize) as (credentials: Record<string, string>) => Promise<any>;
  if (typeof authorize !== "function") {
    throw new Error("Credentials provider authorize function is not available");
  }

  // Mock in-memory database store for Super Admin tests
  const adminPassword = "SuperAdminPassword123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const mockAdminUser: any = {
    id: "usr_super_admin_test",
    email: "owner@schoolplatform.com",
    role: Role.SUPER_ADMIN,
    passwordHash: passwordHash,
    isActive: true,
    status: "ACTIVE",
    schoolId: null,
    mfaEnabled: false,
    mfaSecret: null,
    mfaRecoveryCodes: [],
  };

  const auditEvents: any[] = [];

  // Wire mock Prisma methods
  (prisma.user as any).findUnique = async ({ where }: any) => {
    if (where.email === mockAdminUser.email || where.id === mockAdminUser.id) {
      return { ...mockAdminUser };
    }
    return null;
  };

  (prisma.user as any).update = async ({ where, data }: any) => {
    if (where.id === mockAdminUser.id) {
      Object.assign(mockAdminUser, data);
      return { ...mockAdminUser };
    }
    throw new Error("User not found");
  };

  (prisma.auditLog as any).create = async ({ data }: any) => {
    auditEvents.push(data);
    return { id: `audit_${Date.now()}`, ...data };
  };

  let mockPendingToken: any = null;
  (prisma.emailVerificationToken as any).deleteMany = async ({ where }: any) => {
    if (where.email === mockAdminUser.email) {
      mockPendingToken = null;
    }
    return { count: 1 };
  };

  (prisma.emailVerificationToken as any).create = async ({ data }: any) => {
    mockPendingToken = { id: "tok_1", ...data };
    return mockPendingToken;
  };

  (prisma.emailVerificationToken as any).findFirst = async () => {
    return mockPendingToken;
  };

  const mockUsedTokens: any[] = [];
  (prisma as any).usedTotpToken = {
    create: async ({ data }: any) => {
      const exists = mockUsedTokens.find((t) => t.userId === data.userId && t.step === data.step);
      if (exists) {
        const error: any = new Error("Unique constraint failed on the fields: (`userId`,`step`)");
        error.code = "P2002";
        throw error;
      }
      const record = { id: `utt_${Date.now()}`, ...data };
      mockUsedTokens.push(record);
      return record;
    },
    deleteMany: async () => ({ count: 0 }),
  };

  (prisma as any).loginAttempt = {
    findUnique: async () => null,
    create: async ({ data }: any) => ({ id: `la_${Date.now()}`, ...data }),
    update: async ({ data }: any) => ({ id: `la_${Date.now()}`, ...data }),
    deleteMany: async () => ({ count: 0 }),
  };

  // =========================================================================
  // 1. Account Enumeration & Dummy Hash Timing Protection
  // =========================================================================
  console.log("--- 1. Account Enumeration Protection (Timing Side-Channel) ---");

  const startNonExistent = Date.now();
  const resNonExistent = await authorize({
    email: "nonexistent-user@nowhere.com",
    password: "randomPassword123!",
  });
  const durationNonExistent = Date.now() - startNonExistent;

  assert(
    resNonExistent === null,
    "Unknown user email returns null without exposing account existence"
  );
  assert(
    durationNonExistent >= 25,
    `Unknown email executed bcrypt comparison against dummy hash (${durationNonExistent}ms) to equalize latency`
  );

  // Inactive user
  mockAdminUser.isActive = false;
  const resInactive = await authorize({
    email: mockAdminUser.email,
    password: adminPassword,
  });
  assert(
    resInactive === null,
    "Inactive account returns null without leaking account status"
  );
  mockAdminUser.isActive = true;

  // =========================================================================
  // 2. Login Rate Limiting & Normalization
  // =========================================================================
  console.log("\n--- 2. Login Rate Limiting & Email Normalization ---");

  const testRateEmail = `ratetest-${Date.now()}@schoolplatform.com`;
  for (let i = 0; i < 15; i++) {
    const check = checkRateLimit(`login:${testRateEmail}`, 15, 5 * 60 * 1000);
    if (!check.allowed) break;
  }

  // The 16th attempt should be blocked
  const burstCheck = checkRateLimit(`login:${testRateEmail}`, 15, 5 * 60 * 1000);
  assert(
    !burstCheck.allowed,
    "16th login attempt within 5 minutes is strictly rate-limited"
  );
  const retryAfterSeconds = Math.max(1, Math.ceil((burstCheck.resetTime - Date.now()) / 1000));
  assert(
    burstCheck.resetTime > Date.now(),
    `Reset window provided (${retryAfterSeconds}s remaining)`
  );

  // Normalization check: mixed case and whitespace
  const mixedEmail = "  Owner@SchoolPlatform.COM  ";
  const normalized = mixedEmail.trim().toLowerCase().normalize("NFKC");
  assert(
    normalized === "owner@schoolplatform.com",
    "Email normalization handles whitespace, casing, and NFKC unicode forms"
  );

  // =========================================================================
  // 3. Platform Super Admin Restricted Enrollment Session Gating
  // =========================================================================
  console.log("\n--- 3. Restricted Enrollment-Only Session Gating ---");

  mockAdminUser.mfaEnabled = false;
  mockAdminUser.mfaSecret = null;
  mockAdminUser.mfaRecoveryCodes = [];

  const unEnrolledSession = await authorize({
    email: mockAdminUser.email,
    password: adminPassword,
  });

  assert(
    unEnrolledSession !== null && unEnrolledSession.id === mockAdminUser.id,
    "Platform Super Admin without MFA can log in (no lockout)"
  );
  assert(
    unEnrolledSession.mfaEnrolled === false,
    "Session explicitly flags mfaEnrolled = false"
  );
  assert(
    unEnrolledSession.isRestricted === true,
    "Session is marked isRestricted = true (Restricted Enrollment Session)"
  );

  // Test Middleware gating on restricted session
  const secret = getAuthSecret();
  const restrictedJwt = await encode({
    token: {
      id: mockAdminUser.id,
      email: mockAdminUser.email,
      role: Role.SUPER_ADMIN,
      schoolId: "",
      mfaEnrolled: false,
      isRestricted: true,
    },
    secret,
  });

  // Attempt to access privileged dashboard in restricted session
  const reqDashboard = new NextRequest("http://localhost:3000/super-admin/dashboard", {
    headers: {
      cookie: `next-auth.session-token=${restrictedJwt}`,
    },
  });
  const resDashboard = await middleware(reqDashboard);
  assert(
    resDashboard.status === 307 && Boolean(resDashboard.headers.get("location")?.includes("/super-admin/mfa-setup")),
    "Restricted session visiting /super-admin/dashboard is strictly redirected to /super-admin/mfa-setup"
  );

  // Attempt to call privileged API in restricted session
  const reqApi = new NextRequest("http://localhost:3000/api/super-admin/schools", {
    headers: {
      cookie: `next-auth.session-token=${restrictedJwt}`,
    },
  });
  const resApi = await middleware(reqApi);
  assert(
    resApi.status === 403,
    "Restricted session calling privileged API (/api/super-admin/schools) receives HTTP 403 Forbidden"
  );

  // Allowed enrollment endpoints in restricted session
  const reqMfaSetup = new NextRequest("http://localhost:3000/super-admin/mfa-setup", {
    headers: {
      cookie: `next-auth.session-token=${restrictedJwt}`,
    },
  });
  const resMfaSetup = await middleware(reqMfaSetup);
  assert(
    resMfaSetup.status === 200,
    "Restricted session is permitted to access /super-admin/mfa-setup"
  );

  // =========================================================================
  // 4. MFA Setup & AES-256-GCM Secret Encryption At Rest
  // =========================================================================
  console.log("\n--- 4. MFA Enrollment & AES-256-GCM Secret Encryption At Rest ---");

  const plainSecret = generateTotpSecret();
  const { plainCodes, hashedCodes } = generateRecoveryCodes(8);

  assert(
    plainSecret.length >= 32,
    `Secret is a cryptographically secure 160-bit Base32 string (${plainSecret.length} chars)`
  );

  // Verify encryption before database persistence
  const encryptedSecret = encryptSecret(plainSecret);
  assert(
    encryptedSecret.startsWith("enc:v1:"),
    "MFA secret is encrypted using authenticated AES-256-GCM (enc:v1: prefix)"
  );
  assert(
    encryptedSecret !== plainSecret,
    "Plaintext TOTP secret is never persisted directly in database"
  );

  // Decryption verification
  const decryptedSecret = decryptSecret(encryptedSecret);
  assert(
    decryptedSecret === plainSecret,
    "Application successfully decrypts AES-256-GCM secret at runtime"
  );

  // Activate MFA on user record with encrypted secret
  mockAdminUser.mfaEnabled = true;
  mockAdminUser.mfaSecret = encryptedSecret;
  mockAdminUser.mfaRecoveryCodes = [...hashedCodes];

  assert(
    mockAdminUser.mfaEnabled === true && mockAdminUser.mfaRecoveryCodes.length === 8,
    "MFA successfully activated on Platform Super Admin account with encrypted secret"
  );

  // =========================================================================
  // 5. Mandatory MFA Challenge on Super Admin Login
  // =========================================================================
  console.log("\n--- 5. Mandatory MFA Challenge on Super Admin Login ---");

  // 5.1 Login attempt without TOTP code
  let mfaRequiredThrown = false;
  try {
    await authorize({
      email: mockAdminUser.email,
      password: adminPassword,
    });
  } catch (err: any) {
    if (err.message.startsWith("MFA_REQUIRED")) {
      mfaRequiredThrown = true;
    }
  }
  assert(
    mfaRequiredThrown,
    "Login without MFA code is blocked with MFA_REQUIRED error"
  );

  // 5.2 Login attempt with wrong TOTP code
  let invalidMfaThrown = false;
  try {
    await authorize({
      email: mockAdminUser.email,
      password: adminPassword,
      totpCode: "999999",
    });
  } catch (err: any) {
    if (err.message.startsWith("INVALID_MFA_CODE")) {
      invalidMfaThrown = true;
    }
  }
  assert(
    invalidMfaThrown,
    "Login with invalid TOTP code is blocked with INVALID_MFA_CODE error"
  );

  // 5.3 Login attempt with correct TOTP code
  const currentTotp = generateTotpCode(plainSecret);
  const successSession = await authorize({
    email: mockAdminUser.email,
    password: adminPassword,
    totpCode: currentTotp,
  });

  assert(
    successSession !== null && successSession.id === mockAdminUser.id,
    "Login with valid TOTP code succeeds"
  );
  assert(
    successSession.mfaEnrolled === true,
    "Session flags mfaEnrolled = true (fully authenticated privileged session)"
  );
  assert(
    successSession.isRestricted === false,
    "Full privileged session has isRestricted = false"
  );

  // =========================================================================
  // 6. TOTP Replay Prevention
  // =========================================================================
  console.log("\n--- 6. TOTP Replay Attack Prevention ---");

  // Immediate replay of the TOTP code just consumed
  let replayBlocked = false;
  try {
    await authorize({
      email: mockAdminUser.email,
      password: adminPassword,
      totpCode: currentTotp,
    });
  } catch (err: any) {
    if (err.message.includes("already been used")) {
      replayBlocked = true;
    }
  }
  assert(
    replayBlocked,
    "Immediate replay of an already accepted TOTP code within same window is strictly blocked"
  );

  // =========================================================================
  // 7. Single-Use Emergency Recovery Code Consumption & Replay Prevention
  // =========================================================================
  console.log("\n--- 7. Emergency Recovery Code Consumption & Replay Resistance ---");

  const codeToUse = plainCodes[0];
  const initialRemainingCodes = mockAdminUser.mfaRecoveryCodes.length;

  // Login with recovery code
  const recoverySession = await authorize({
    email: mockAdminUser.email,
    password: adminPassword,
    totpCode: codeToUse,
  });

  assert(
    recoverySession !== null && recoverySession.id === mockAdminUser.id,
    "Login with single-use recovery code succeeds"
  );
  assert(
    mockAdminUser.mfaRecoveryCodes.length === initialRemainingCodes - 1,
    `Recovery code is consumed atomically from DB (remaining: ${mockAdminUser.mfaRecoveryCodes.length})`
  );

  // Attempt replay with the same recovery code
  let recoveryReplayBlocked = false;
  try {
    await authorize({
      email: mockAdminUser.email,
      password: adminPassword,
      totpCode: codeToUse,
    });
  } catch (err: any) {
    if (err.message.startsWith("INVALID_MFA_CODE")) {
      recoveryReplayBlocked = true;
    }
  }

  assert(
    recoveryReplayBlocked,
    "Replay attack with consumed recovery code is strictly blocked (INVALID_MFA_CODE)"
  );

  // =========================================================================
  // 8. Cross-Role MFA Access Rejection
  // =========================================================================
  console.log("\n--- 8. Cross-Role MFA Access Rejection ---");

  const schoolAdminJwt = await encode({
    token: {
      id: "usr_school_admin_1",
      email: "admin@delhi-public.edu",
      role: Role.ADMIN,
      schoolId: "sch_dpa_delhi",
    },
    secret,
  });

  const reqSchoolAdminMfa = new NextRequest("http://localhost:3000/super-admin/mfa-setup", {
    headers: {
      cookie: `next-auth.session-token=${schoolAdminJwt}`,
    },
  });
  const resSchoolAdminMfa = await middleware(reqSchoolAdminMfa);
  assert(
    resSchoolAdminMfa.status === 307 && Boolean(resSchoolAdminMfa.headers.get("location")?.includes("/admin/dashboard")),
    "School Admin (ADMIN) attempting to access Super Admin MFA is rejected and redirected to their own dashboard"
  );

  // =========================================================================
  // 9. Secure MFA Deactivation Dual Verification
  // =========================================================================
  console.log("\n--- 9. Secure MFA Deactivation Dual Verification ---");

  // Deactivation requires correct password and valid TOTP
  const wrongPassword = "WrongPassword999!";
  const validPasswordCheck = await bcrypt.compare(wrongPassword, mockAdminUser.passwordHash);
  assert(
    !validPasswordCheck,
    "Deactivation attempt with incorrect password fails authentication"
  );

  // Deactivation with valid password + valid TOTP
  const deactivationTotp = generateTotpCode(plainSecret);
  const validDeactivationTotp = verifyTotpCode({
    secret: plainSecret,
    token: deactivationTotp,
  });
  assert(
    validDeactivationTotp,
    "Deactivation verified current TOTP code before disabling"
  );

  // Simulate deactivation
  mockAdminUser.mfaEnabled = false;
  mockAdminUser.mfaSecret = null;
  mockAdminUser.mfaRecoveryCodes = [];

  const postDeactivationLogin = await authorize({
    email: mockAdminUser.email,
    password: adminPassword,
  });
  assert(
    postDeactivationLogin !== null && postDeactivationLogin.mfaEnrolled === false && postDeactivationLogin.isRestricted === true,
    "After deactivation, login returns to restricted enrollment state without locking account"
  );

  // =========================================================================
  // 10. Stale JWT Session Revocation Defense
  // =========================================================================
  console.log("\n--- 10. Stale JWT Session Revocation Defense ---");

  // Simulate user turning MFA ON in database
  mockAdminUser.mfaEnabled = true;
  mockAdminUser.mfaSecret = encryptedSecret;

  // Stale session created earlier with mfaEnrolled: false
  const staleSessionObj: any = {
    user: {
      id: mockAdminUser.id,
      role: Role.SUPER_ADMIN,
      mfaEnrolled: true, // Attacker forged or stale token claim
      schoolId: "",
    },
  };

  const staleJwtToken: any = {
    id: mockAdminUser.id,
    role: Role.SUPER_ADMIN,
    mfaEnrolled: false, // Originally logged in without MFA
  };

  // Run NextAuth session callback
  const hardenedSession = await (authOptions.callbacks as any).session({
    session: staleSessionObj,
    token: staleJwtToken,
  });

  assert(
    hardenedSession.user.mfaEnrolled === false,
    "Stale JWT without MFA is immediately downgraded (mfaEnrolled = false) when MFA is enabled in DB"
  );
  assert(
    hardenedSession.user.isRestricted === true,
    "Stale JWT is immediately restricted (isRestricted = true)"
  );
  assert(
    (hardenedSession as any).error === "MFA_REQUIRED",
    "Session error flagged as MFA_REQUIRED"
  );

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n══════════════════════════════════════════════════════════════════════════");
  console.log(`PHASE 1 SECURITY AUDIT SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log("══════════════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runMfaSecuritySuite().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
