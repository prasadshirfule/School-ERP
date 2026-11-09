/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * School ERP — Phase 2: Database-Backed TOTP Replay & Distributed Rate Limiting Test Suite
 *
 * Verifies:
 * 1. Distributed TOTP Replay Prevention across independent serverless instances
 * 2. Concurrent TOTP Verification race conditions (atomic database uniqueness rejection)
 * 3. Non-plaintext TOTP storage (cryptographically derived codeHash verification)
 * 4. Distributed Login Rate Limiting with HMAC-SHA256 protected identifiers
 * 5. Concurrent Login Attempt race protection (atomic PostgreSQL transactions)
 * 6. Rate-limit counter reset on successful authentication
 * 7. Trusted proxy IP throttling & header parsing (x-forwarded-for, x-real-ip)
 * 8. Database outage / Fail-Closed behavior for privileged accounts (zero fail-open bypass)
 * 9. Expiry, window reset, and active window preservation during cleanup routines
 * 10. Tenant Isolation Safety: 21 direct models + 4 relational models strictly preserved
 *
 * Run: npx ts-node scripts/test-phase2-database-security.ts
 */

import crypto from "crypto";
import prisma from "../src/lib/prisma";
import {
  generateTotpSecret,
  generateTotpCode,
  findMatchingTotpStep,
  recordTotpConsumedAtDatabaseLevel,
  cleanupExpiredTotpTokens,
} from "../src/lib/totp";
import {
  checkDatabaseRateLimit,
  cleanupExpiredRateLimits,
  hashRateLimitIdentifier,
  resetDatabaseRateLimit,
  getClientIp,
  checkIpRateLimit,
  maskIdentifier,
} from "../src/lib/rateLimit";
import { TENANT_SCOPED_MODELS, RELATIONALLY_SCOPED_MODELS } from "../src/lib/tenant";
import { PLATFORM_MODELS } from "./check-tenant-scoping";

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

async function runPhase2DatabaseSecuritySuite() {
  console.log("══════════════════════════════════════════════════════════════════════════");
  console.log("🔒 SCHOOL ERP — PHASE 2: DATABASE-BACKED SECURITY ARCHITECTURE SUITE");
  console.log("══════════════════════════════════════════════════════════════════════════\n");

  // In-memory mock database tables for isolated test execution
  const mockUsedTotpTokens: any[] = [];
  const mockLoginAttempts = new Map<string, any>();
  let dbSimulatedFailure = false;

  // Mock prisma.usedTotpToken
  (prisma as any).usedTotpToken = {
    create: async ({ data }: any) => {
      if (dbSimulatedFailure) {
        throw new Error("Neon connection failed: ECONNREFUSED 5432");
      }
      // Enforce unique constraint [userId, step]
      const exists = mockUsedTotpTokens.find(
        (t) => t.userId === data.userId && t.step === data.step
      );
      if (exists) {
        const error: any = new Error("Unique constraint failed on the fields: (`userId`,`step`)");
        error.code = "P2002";
        throw error;
      }
      const record = { id: `utt_${Date.now()}_${Math.random()}`, ...data };
      mockUsedTotpTokens.push(record);
      return record;
    },
    deleteMany: async ({ where }: any) => {
      if (dbSimulatedFailure) {
        throw new Error("Neon connection failed: ECONNREFUSED 5432");
      }
      const threshold = where?.expiresAt?.lt || new Date();
      const initialCount = mockUsedTotpTokens.length;
      for (let i = mockUsedTotpTokens.length - 1; i >= 0; i--) {
        if (mockUsedTotpTokens[i].expiresAt < threshold) {
          mockUsedTotpTokens.splice(i, 1);
        }
      }
      return { count: initialCount - mockUsedTotpTokens.length };
    },
  };

  // Mock prisma.loginAttempt
  (prisma as any).loginAttempt = {
    findUnique: async ({ where }: any) => {
      if (dbSimulatedFailure) {
        throw new Error("Neon connection failed: ECONNREFUSED 5432");
      }
      const entry = mockLoginAttempts.get(where.identifier);
      return entry ? { ...entry } : null;
    },
    create: async ({ data }: any) => {
      if (dbSimulatedFailure) {
        throw new Error("Neon connection failed: ECONNREFUSED 5432");
      }
      if (mockLoginAttempts.has(data.identifier)) {
        const error: any = new Error("Unique constraint failed on the fields: (`identifier`)");
        error.code = "P2002";
        throw error;
      }
      const created = { id: `la_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
      mockLoginAttempts.set(data.identifier, created);
      return created;
    },
    update: async ({ where, data }: any) => {
      if (dbSimulatedFailure) {
        throw new Error("Neon connection failed: ECONNREFUSED 5432");
      }
      const existing = mockLoginAttempts.get(where.identifier);
      if (!existing) throw new Error("Record to update not found.");
      let attempts = existing.attempts;
      if (data.attempts?.increment) {
        attempts += data.attempts.increment;
      } else if (typeof data.attempts === "number") {
        attempts = data.attempts;
      }
      const updated = {
        ...existing,
        ...data,
        attempts,
        updatedAt: new Date(),
      };
      mockLoginAttempts.set(where.identifier, updated);
      return updated;
    },
    deleteMany: async ({ where }: any) => {
      if (dbSimulatedFailure) {
        throw new Error("Neon connection failed: ECONNREFUSED 5432");
      }
      let deletedCount = 0;
      if (where?.identifier?.in) {
        for (const id of where.identifier.in) {
          if (mockLoginAttempts.delete(id)) {
            deletedCount++;
          }
        }
      } else if (where?.windowExpiresAt?.lt) {
        const threshold = where.windowExpiresAt.lt;
        for (const [key, val] of mockLoginAttempts.entries()) {
          if (val.windowExpiresAt < threshold) {
            mockLoginAttempts.delete(key);
            deletedCount++;
          }
        }
      }
      return { count: deletedCount };
    },
  };

  // Mock interactive transaction
  (prisma as any).$transaction = async (fn: any) => {
    if (dbSimulatedFailure) {
      throw new Error("Neon connection pool exhausted / timeout");
    }
    return await fn((prisma as any));
  };

  // =========================================================================
  // 1. Distributed TOTP Replay Prevention Across Independent Serverless Instances
  // =========================================================================
  console.log("--- 1. Distributed TOTP Replay Prevention Across Serverless Instances ---");

  const secret = generateTotpSecret();
  const testUserId = "usr_super_admin_production_1";
  const now = Date.now();
  const validCode = generateTotpCode(secret, now);
  const matchedStep = findMatchingTotpStep(secret, validCode, now);

  assert(matchedStep !== null, "Step resolution identified valid RFC 6238 time step");

  // Serverless Instance 1 consumes code
  let instance1Success = false;
  try {
    await recordTotpConsumedAtDatabaseLevel(testUserId, matchedStep!, validCode);
    instance1Success = true;
  } catch (err) {
    instance1Success = false;
  }
  assert(instance1Success, "Serverless Instance 1 accepts and atomically records TOTP code");

  // Serverless Instance 2 (completely separate memory space) receives the identical code
  let instance2ReplayBlocked = false;
  try {
    await recordTotpConsumedAtDatabaseLevel(testUserId, matchedStep!, validCode);
  } catch (err: any) {
    if (err.message.includes("already been used")) {
      instance2ReplayBlocked = true;
    }
  }
  assert(
    instance2ReplayBlocked,
    "Serverless Instance 2 strictly blocks replayed TOTP code via PostgreSQL unique constraint"
  );

  // =========================================================================
  // 2. Concurrent TOTP Verification Race Conditions
  // =========================================================================
  console.log("\n--- 2. Concurrent TOTP Verification Race Conditions ---");

  const nextStep = matchedStep! + 10;
  const concurrentCode = generateTotpCode(secret, nextStep * 30 * 1000);

  // Fire 5 concurrent requests simultaneously
  const results = await Promise.allSettled(
    Array.from({ length: 5 }).map(() =>
      recordTotpConsumedAtDatabaseLevel(testUserId, nextStep, concurrentCode)
    )
  );

  const fulfilled = results.filter((r) => r.status === "fulfilled").length;
  const rejected = results.filter(
    (r) => r.status === "rejected" && (r as PromiseRejectedResult).reason.message.includes("already been used")
  ).length;

  assert(fulfilled === 1, `Exactly 1 concurrent request succeeded (got ${fulfilled})`);
  assert(rejected === 4, `Remaining 4 concurrent requests rejected atomically (got ${rejected})`);

  // =========================================================================
  // 3. Non-Plaintext TOTP Storage
  // =========================================================================
  console.log("\n--- 3. Cryptographically Derived Identifier (Zero Plaintext Code in DB) ---");

  const storedRecord = mockUsedTotpTokens[0];
  assert(Boolean(storedRecord), "Consumed token record exists in database");
  assert(
    !("code" in storedRecord) && storedRecord.codeHash !== validCode,
    "Plaintext 6-digit TOTP code is NOT stored anywhere in the database record"
  );
  assert(
    storedRecord.codeHash.length === 64 && /^[0-9a-f]{64}$/.test(storedRecord.codeHash),
    "Token identifier stored as a 256-bit SHA-256 derived hash"
  );

  // =========================================================================
  // 4. HMAC Identifier Privacy & Protection (Zero Plaintext Emails)
  // =========================================================================
  console.log("\n--- 4. HMAC-SHA256 Identifier Privacy & Protection ---");

  const testEmail1 = "SuperAdmin@SchoolPlatform.com";
  const testEmail2 = "superadmin@schoolplatform.com ";
  const hmac1 = hashRateLimitIdentifier(`login:${testEmail1}`);
  const hmac2 = hashRateLimitIdentifier(`login:${testEmail2}`);

  assert(hmac1.length === 64 && /^[0-9a-f]{64}$/.test(hmac1), "hashRateLimitIdentifier produces 64-char hex digest");
  assert(hmac1 === hmac2, "Normalized and case-folded emails produce identical HMAC-SHA256 digests");
  assert(!hmac1.includes("superadmin") && !hmac1.includes("@"), "HMAC digest contains zero plaintext email strings");

  // =========================================================================
  // 5. Distributed Login Rate Limiting with HMAC-Protected Identifiers
  // =========================================================================
  console.log("\n--- 5. Distributed Login Rate Limiting Across Serverless Instances ---");

  const targetEmail = "DistributedAdmin@SchoolPlatform.COM";
  const expectedHmacKey = hashRateLimitIdentifier(`login:${targetEmail}`);

  // Simulate 10 attempts from Instance 1
  for (let i = 0; i < 10; i++) {
    const res = await checkDatabaseRateLimit(`login:${targetEmail}`, 15, 5 * 60 * 1000);
    assert(res.allowed, `Instance 1 attempt #${i + 1} allowed (remaining: ${res.remaining})`);
    if (!res.allowed) break;
  }

  // Simulate 5 attempts from Instance 2
  for (let i = 10; i < 15; i++) {
    const res = await checkDatabaseRateLimit(`login:${targetEmail}`, 15, 5 * 60 * 1000);
    assert(res.allowed, `Instance 2 attempt #${i + 1} allowed (remaining: ${res.remaining})`);
    if (!res.allowed) break;
  }

  // Attempt #16 from Instance 3 must be blocked across instances
  const blockedCheck = await checkDatabaseRateLimit(`login:${targetEmail}`, 15, 5 * 60 * 1000);
  assert(!blockedCheck.allowed, "Instance 3 attempt #16 is strictly blocked across distributed instances");
  assert(blockedCheck.remaining === 0, "Remaining attempts reported as 0");
  assert(blockedCheck.resetTime > Date.now(), "Valid future reset time returned");

  // Verify single bounded record in database under HMAC key (NOT plaintext email)
  const attemptRecord = mockLoginAttempts.get(expectedHmacKey);
  assert(Boolean(attemptRecord), "LoginAttempt record persisted under HMAC-SHA256 hashed identifier");
  assert(!mockLoginAttempts.has(`login:${targetEmail.toLowerCase()}`), "Plaintext email NEVER persisted in database");
  assert(
    attemptRecord?.attempts === 15,
    "Record accurately tracked 15 attempts without creating unbounded database rows"
  );

  // =========================================================================
  // 6. Rate Limit Counter Reset on Successful Authentication
  // =========================================================================
  console.log("\n--- 6. Rate Limit Reset on Successful Authentication ---");

  assert(mockLoginAttempts.has(expectedHmacKey), "Rate limit record exists prior to login success");
  await resetDatabaseRateLimit(`login:${targetEmail}`);
  assert(!mockLoginAttempts.has(expectedHmacKey), "Rate limit record purged upon successful login reset");

  const freshCheck = await checkDatabaseRateLimit(`login:${targetEmail}`, 15, 5 * 60 * 1000);
  assert(freshCheck.allowed && freshCheck.remaining === 14, "Subsequent attempt allowed with full quota restored");

  // =========================================================================
  // 7. Concurrent Login Attempt Race Protection (Atomic Transactions)
  // =========================================================================
  console.log("\n--- 7. Concurrent Login Attempt Race Protection ---");

  const concurrentEmail = "concurrent-burst@schoolplatform.com";
  const concurrentHmacKey = hashRateLimitIdentifier(`login:${concurrentEmail}`);

  // Fire 10 concurrent requests at once
  await Promise.all(
    Array.from({ length: 10 }).map(() =>
      checkDatabaseRateLimit(`login:${concurrentEmail}`, 15, 5 * 60 * 1000)
    )
  );

  const concurrentEntry = mockLoginAttempts.get(concurrentHmacKey);
  assert(
    concurrentEntry && concurrentEntry.attempts === 10,
    `Atomic transaction safely recorded all 10 concurrent attempts without race loss (got ${concurrentEntry?.attempts})`
  );

  // =========================================================================
  // 8. Trusted Proxy IP Throttling & Header Parsing
  // =========================================================================
  console.log("\n--- 8. Trusted Proxy IP Throttling & Header Parsing ---");

  const singleIpHeaders = { "x-forwarded-for": "203.0.113.195" };
  const multiProxyHeaders = { "x-forwarded-for": "198.51.100.42, 10.0.0.1, 172.16.0.1" };
  const realIpHeaders = { "x-real-ip": "198.51.100.99" };
  const emptyHeaders = {};

  assert(getClientIp(singleIpHeaders) === "203.0.113.195", "getClientIp extracts single IP correctly");
  assert(getClientIp(multiProxyHeaders) === "198.51.100.42", "getClientIp extracts client from multi-proxy X-Forwarded-For");
  assert(getClientIp(realIpHeaders) === "198.51.100.99", "getClientIp falls back to X-Real-IP");
  assert(getClientIp(emptyHeaders) === null, "getClientIp returns null when headers are missing to avoid pooling into 127.0.0.1");

  // Masking audit helper
  assert(maskIdentifier("203.0.113.195") === "203.0.***.***", "maskIdentifier correctly sanitizes IPv4 addresses");
  assert(maskIdentifier("user@example.com") === "us***@example.com", "maskIdentifier correctly sanitizes email addresses");

  // IP Rate limiting
  const testIp = "198.51.100.42";
  for (let i = 0; i < 5; i++) {
    const ipRes = await checkIpRateLimit(testIp, 5, 60 * 1000);
    assert(ipRes.allowed, `IP request #${i + 1} allowed`);
  }
  const ipBlocked = await checkIpRateLimit(testIp, 5, 60 * 1000);
  assert(!ipBlocked.allowed, "IP request #6 correctly blocked by IP limiter");

  // =========================================================================
  // 9. Database Outage & Fail-Closed Behavior
  // =========================================================================
  console.log("\n--- 9. Database Outage & Fail-Closed Privileged Enforcement ---");

  dbSimulatedFailure = true;

  // Privileged rate limiter must fail closed (throw AUTH_DATABASE_UNAVAILABLE)
  let rateLimiterFailedClosed = false;
  try {
    await checkDatabaseRateLimit("login:superadmin@schoolerp.com", 15, 60000, {
      failClosed: true,
      isPrivileged: true,
    });
  } catch (err: any) {
    if (err.message.includes("AUTH_DATABASE_UNAVAILABLE")) {
      rateLimiterFailedClosed = true;
    }
  }
  assert(rateLimiterFailedClosed, "Privileged rate limiter strictly fails closed on database outage");

  // Privileged TOTP must fail closed (throw MFA_DATABASE_ERROR, zero in-memory fallback)
  let totpFailedClosed = false;
  try {
    await recordTotpConsumedAtDatabaseLevel(testUserId, matchedStep! + 99, "123456");
  } catch (err: any) {
    if (err.message.includes("MFA_DATABASE_ERROR")) {
      totpFailedClosed = true;
    }
  }
  assert(totpFailedClosed, "Privileged TOTP verification strictly fails closed on database outage (no in-memory bypass)");

  dbSimulatedFailure = false; // Restore DB

  // =========================================================================
  // 10. Rate-Limit Expiry, Window Reset & Active Window Preservation
  // =========================================================================
  console.log("\n--- 10. Window Expiry & Active Window Preservation ---");

  // Simulate window expiry on concurrent entry
  concurrentEntry.windowExpiresAt = new Date(Date.now() - 1000);

  // Next attempt resets window
  const resetRes = await checkDatabaseRateLimit(`login:${concurrentEmail}`, 15, 5 * 60 * 1000);
  assert(resetRes.allowed, "Attempt after window expiry is allowed");
  assert(resetRes.remaining === 14, "Attempts counter reset to 1 (14 remaining)");

  // Active records must NOT be deleted by cleanup routines
  const activeRecord = mockLoginAttempts.get(concurrentHmacKey);
  assert(activeRecord.windowExpiresAt > new Date(), "Record has an active future expiration window");

  const expiredRateLimitsCount = await cleanupExpiredRateLimits();
  assert(typeof expiredRateLimitsCount === "number", "cleanupExpiredRateLimits executed successfully");
  assert(
    mockLoginAttempts.has(concurrentHmacKey),
    "cleanupExpiredRateLimits NEVER purges active rate-limit windows"
  );

  const activeTotpToken = mockUsedTotpTokens[0];
  activeTotpToken.expiresAt = new Date(Date.now() + 60000); // 60s active in future
  const expiredTotpTokensCount = await cleanupExpiredTotpTokens();
  assert(typeof expiredTotpTokensCount === "number", "cleanupExpiredTotpTokens executed successfully");
  assert(
    mockUsedTotpTokens.some((t) => t.id === activeTotpToken.id),
    "cleanupExpiredTotpTokens NEVER purges active (<90s) TOTP tokens"
  );

  // =========================================================================
  // 11. Tenant Isolation Safety Verification
  // =========================================================================
  console.log("\n--- 11. Tenant Isolation Safety & Schema Model Ownership ---");

  assert(
    TENANT_SCOPED_MODELS.size === 25,
    `TENANT_SCOPED_MODELS invariant strictly maintained at 25 models (got ${TENANT_SCOPED_MODELS.size})`
  );
  assert(
    RELATIONALLY_SCOPED_MODELS.size === 4,
    `RELATIONALLY_SCOPED_MODELS invariant strictly maintained at 4 models (got ${RELATIONALLY_SCOPED_MODELS.size})`
  );
  assert(
    PLATFORM_MODELS.has("UsedTotpToken"),
    "UsedTotpToken explicitly categorized as a platform security infrastructure model"
  );
  assert(
    PLATFORM_MODELS.has("LoginAttempt"),
    "LoginAttempt explicitly categorized as a platform security infrastructure model"
  );

  console.log("\n══════════════════════════════════════════════════════════════════════════");
  console.log(`PHASE 2 DATABASE SECURITY SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log("══════════════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2DatabaseSecuritySuite().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
