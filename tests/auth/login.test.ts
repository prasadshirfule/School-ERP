import assert from "assert";
import { prisma } from "../../src/lib/database/prisma";
import { authOptions } from "../../src/lib/auth";
import { hashPassword, verifyPassword } from "../../src/lib/security/hashing";
import { requestPasswordReset, resetPassword } from "../../src/lib/services/password";

export async function runLoginTests() {
  console.log("  Running Authentication, Session & Password Security Tests...");

  // Credentials provider authorize handler
  const credentialsProvider = authOptions.providers.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.id === "credentials"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authorize = (credentialsProvider as any).options?.authorize || (credentialsProvider as any).authorize;

  // Clear test rate limits
  await prisma.rateLimitBucket.deleteMany({
    where: { key: { contains: "admin@aryabhata.edu.in" } },
  });

  // 1. Valid login using seeded admin
  await prisma.user.update({
    where: { email: "admin@aryabhata.edu.in" },
    data: {
      passwordHash: await hashPassword("AdminPassword123!"),
      isActive: true,
      suspendedAt: null,
    },
  });

  const userAdmin = await authorize(
    { email: "admin@aryabhata.edu.in", password: "AdminPassword123!" },
    { headers: { "x-forwarded-for": "127.0.0.1" } }
  );

  assert.ok(userAdmin, "Valid credentials must return user object");
  assert.strictEqual(userAdmin.email, "admin@aryabhata.edu.in");
  assert.strictEqual(userAdmin.role, "ADMIN");
  assert.ok(userAdmin.schoolId, "User must have active schoolId");
  assert.ok(userAdmin.sessionVersion >= 1, "User must have valid sessionVersion");
  console.log("    ✓ Valid credential authentication verified (Admin credentials)");

  // 2. Invalid password
  const invalidPasswordUser = await authorize(
    { email: "admin@aryabhata.edu.in", password: "WrongPassword999!" },
    { headers: { "x-forwarded-for": "127.0.0.1" } }
  );
  assert.strictEqual(invalidPasswordUser, null, "Invalid password must return null (fail closed)");
  console.log("    ✓ Invalid password authentication rejected (fails closed)");

  // 3. Inactive / suspended account rejection
  const testSuspendedEmail = `suspended-${Date.now()}@test.edu.in`;
  const school = await prisma.school.findFirst();
  assert.ok(school, "School must exist");

  const suspendedUser = await prisma.user.create({
    data: {
      email: testSuspendedEmail,
      fullName: "Suspended Staff",
      passwordHash: await hashPassword("ValidStaffPassword123!"),
      role: "TEACHER",
      isActive: false, // Inactive
      memberships: {
        create: {
          schoolId: school.id,
          role: "TEACHER",
          isActive: true,
        },
      },
    },
  });

  let suspendedRejected = false;
  try {
    await authorize(
      { email: testSuspendedEmail, password: "ValidStaffPassword123!" },
      { headers: { "x-forwarded-for": "127.0.0.1" } }
    );
  } catch (err: unknown) {
    suspendedRejected = true;
    assert.match((err as Error).message, /deactivated or suspended/i);
  }
  assert.strictEqual(suspendedRejected, true, "Suspended account must be blocked from login");
  console.log("    ✓ Suspended / inactive account login blocked");

  // 4. Generic password reset request (anti-enumeration check)
  const testIp = `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const existingReset = await requestPasswordReset("admin@aryabhata.edu.in", testIp);
  const nonexistentReset = await requestPasswordReset("nonexistent-person-999@random.com", testIp);
  assert.strictEqual(existingReset.success, true);
  assert.strictEqual(nonexistentReset.success, true);
  assert.strictEqual(
    existingReset.message,
    nonexistentReset.message,
    "Reset response must be identical to prevent email enumeration"
  );
  console.log("    ✓ Password reset anti-enumeration verified (identical responses)");

  // 5. Password reset flow and session invalidation
  const testIp2 = `10.1.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const resetUserEmail = `reset-user-${Date.now()}@test.edu.in`;
  const initialHash = await hashPassword("OldPassword123456!");
  const resetUser = await prisma.user.create({
    data: {
      email: resetUserEmail,
      fullName: "Reset Test User",
      passwordHash: initialHash,
      role: "TEACHER",
      isActive: true,
      sessionVersion: 1,
      memberships: {
        create: {
          schoolId: school.id,
          role: "TEACHER",
          isActive: true,
        },
      },
    },
  });

  // Request reset
  await requestPasswordReset(resetUserEmail, testIp2);

  // Retrieve generated token from DB
  const tokenRecord = await prisma.verificationToken.findFirst({
    where: { identifier: resetUser.id, purpose: "PASSWORD_RESET" },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(tokenRecord, "Password reset token must be created");

  // In testing we simulate providing raw token matching hash, or testing resetPassword directly
  // Let's create a known token to test execution
  const knownRawToken = "test-secure-raw-reset-token-1234567890abcdef1234567890abcdef";
  const { sha256Hash } = await import("../../src/lib/security/hashing");
  await prisma.verificationToken.create({
    data: {
      identifier: resetUser.id,
      purpose: "PASSWORD_RESET",
      tokenHash: sha256Hash(knownRawToken),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const resetResult = await resetPassword(
    resetUser.id,
    knownRawToken,
    "BrandNewSecurePassword1234!"
  );
  assert.strictEqual(resetResult.success, true, "Password reset must succeed with valid token");

  // Verify password changed
  const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: resetUser.id } });
  const isNewPasswordValid = await verifyPassword("BrandNewSecurePassword1234!", updatedUser.passwordHash);
  assert.strictEqual(isNewPasswordValid, true, "New password must verify successfully");
  assert.strictEqual(updatedUser.sessionVersion, 2, "sessionVersion must be incremented to revoke active sessions");
  console.log("    ✓ Password reset execution and session revocation version bump verified");

  // 6. JWT session revocation callback check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jwtCallback = (authOptions.callbacks as any).jwt;
  const revokedTokenResult = await jwtCallback({
    token: {
      id: resetUser.id,
      email: resetUser.email,
      sessionVersion: 1, // Stale session version
      lastActive: Math.floor(Date.now() / 1000),
    },
  });
  assert.strictEqual(revokedTokenResult.id, undefined, "JWT callback must invalidate stale sessionVersion");
  console.log("    ✓ Server-side JWT session invalidation verified");

  // 7. Inactivity timeout check (2 hours)
  const expiredActivityTokenResult = await jwtCallback({
    token: {
      id: resetUser.id,
      email: resetUser.email,
      sessionVersion: 2,
      lastActive: Math.floor(Date.now() / 1000) - (2 * 3600 + 60), // Inactive for > 2 hours
    },
  });
  assert.strictEqual(expiredActivityTokenResult.id, undefined, "JWT callback must invalidate session after 2 hours inactivity");
  console.log("    ✓ 2-hour session inactivity timeout verified");

  // Cleanup test users
  await prisma.user.deleteMany({
    where: { id: { in: [suspendedUser.id, resetUser.id] } },
  });
}
