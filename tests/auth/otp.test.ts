import assert from "assert";
import { VerificationPurpose } from "@prisma/client";
import { prisma } from "../../src/lib/database/prisma";
import {
  createVerificationToken,
  verifyVerificationToken,
} from "../../src/lib/security/tokens";
import { sha256Hash } from "../../src/lib/security/hashing";

export async function runOtpTests() {
  console.log("  Running Cryptographic OTP & Token Verification Tests...");

  const testId = `test-otp-${Date.now()}`;

  // 1. Generate 6-digit numeric OTP and check hash storage
  const otpResult = await createVerificationToken({
    identifier: testId,
    purpose: VerificationPurpose.EMAIL_VERIFICATION,
    isNumericOtp: true,
    otpDigits: 6,
    ttlMinutes: 10,
    resendCooldownSeconds: 60,
    maxAttempts: 3,
    metadata: { source: "otp-test" },
  });

  assert.strictEqual(otpResult.token.length, 6, "OTP must be exactly 6 digits");
  assert.match(otpResult.token, /^\d{6}$/, "OTP must be numeric");

  // Verify only the SHA-256 hash was persisted, never plaintext
  const storedRecord = await prisma.verificationToken.findFirst({
    where: { identifier: testId, purpose: VerificationPurpose.EMAIL_VERIFICATION },
    orderBy: { createdAt: "desc" },
  });

  assert.ok(storedRecord, "Token record must exist in DB");
  assert.strictEqual(storedRecord.tokenHash, sha256Hash(otpResult.token), "DB must store SHA-256 hash");
  assert.notStrictEqual(storedRecord.tokenHash, otpResult.token, "Plaintext OTP must NEVER be stored in DB");
  console.log("    ✓ 6-digit OTP generated and SHA-256 hash storage verified");

  // 2. Purpose binding check: verifying under different purpose fails
  const wrongPurposeResult = await verifyVerificationToken(
    testId,
    VerificationPurpose.MOBILE_OTP,
    otpResult.token
  );
  assert.strictEqual(wrongPurposeResult.success, false, "Verification must fail on purpose mismatch");
  assert.strictEqual(wrongPurposeResult.error, "NOT_FOUND", "Mismatched purpose must fail closed");
  console.log("    ✓ Purpose binding verified (cross-purpose verification blocked)");

  // 3. Resend cooldown check
  let cooldownBlocked = false;
  try {
    await createVerificationToken({
      identifier: testId,
      purpose: VerificationPurpose.EMAIL_VERIFICATION,
      isNumericOtp: true,
      resendCooldownSeconds: 60,
    });
  } catch (err: unknown) {
    cooldownBlocked = true;
    assert.match((err as Error).message, /wait \d+ seconds/i);
  }
  assert.strictEqual(cooldownBlocked, true, "Rapid resend must be blocked by cooldown");
  console.log("    ✓ Resend cooldown enforcement verified");

  // 4. Incorrect OTP verification: increments attempt count
  const wrongCodeResult = await verifyVerificationToken(
    testId,
    VerificationPurpose.EMAIL_VERIFICATION,
    "000000"
  );
  assert.strictEqual(wrongCodeResult.success, false, "Incorrect OTP must fail");
  assert.strictEqual(wrongCodeResult.error, "INVALID_CODE");
  assert.strictEqual(wrongCodeResult.remainingAttempts, 2, "Remaining attempts must decrement");

  // Check attempt 2
  const wrongCodeResult2 = await verifyVerificationToken(
    testId,
    VerificationPurpose.EMAIL_VERIFICATION,
    "111111"
  );
  assert.strictEqual(wrongCodeResult2.remainingAttempts, 1);

  // Check attempt 3 (Max attempts reached)
  const wrongCodeResult3 = await verifyVerificationToken(
    testId,
    VerificationPurpose.EMAIL_VERIFICATION,
    "222222"
  );
  assert.strictEqual(wrongCodeResult3.error, "MAX_ATTEMPTS_EXCEEDED");
  assert.strictEqual(wrongCodeResult3.remainingAttempts, 0);

  // Even if correct code is entered after lockout, must remain blocked
  const postLockoutResult = await verifyVerificationToken(
    testId,
    VerificationPurpose.EMAIL_VERIFICATION,
    otpResult.token
  );
  assert.strictEqual(postLockoutResult.success, false, "Must fail after max attempts exceeded");
  assert.strictEqual(postLockoutResult.error, "MAX_ATTEMPTS_EXCEEDED");
  console.log("    ✓ Attempt limit and lockout verified (max 3 attempts)");

  // 5. Successful verification & single-use test
  const validTestId = `valid-otp-${Date.now()}`;
  const validOtp = await createVerificationToken({
    identifier: validTestId,
    purpose: VerificationPurpose.EMAIL_VERIFICATION,
    isNumericOtp: true,
    resendCooldownSeconds: 0,
  });

  const successResult = await verifyVerificationToken(
    validTestId,
    VerificationPurpose.EMAIL_VERIFICATION,
    validOtp.token
  );
  assert.strictEqual(successResult.success, true, "Valid OTP must verify successfully");

  // Re-use must fail
  const reuseResult = await verifyVerificationToken(
    validTestId,
    VerificationPurpose.EMAIL_VERIFICATION,
    validOtp.token
  );
  assert.strictEqual(reuseResult.success, false, "Reused OTP must be rejected");
  assert.strictEqual(reuseResult.error, "ALREADY_USED");
  console.log("    ✓ Valid OTP verification and single-use protection verified");

  // 6. Expired token check
  const expiredTestId = `expired-${Date.now()}`;
  await prisma.verificationToken.create({
    data: {
      identifier: expiredTestId,
      purpose: VerificationPurpose.EMAIL_VERIFICATION,
      tokenHash: sha256Hash("999999"),
      expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
    },
  });

  const expiredResult = await verifyVerificationToken(
    expiredTestId,
    VerificationPurpose.EMAIL_VERIFICATION,
    "999999"
  );
  assert.strictEqual(expiredResult.success, false, "Expired token must fail");
  assert.strictEqual(expiredResult.error, "EXPIRED");
  console.log("    ✓ Token expiration fail-closed enforcement verified");

  // Cleanup test tokens
  await prisma.verificationToken.deleteMany({
    where: { identifier: { in: [testId, validTestId, expiredTestId] } },
  });
}
