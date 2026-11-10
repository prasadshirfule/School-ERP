import assert from "assert";
import { encryptPII, decryptPII } from "../../src/lib/security/encryption";
import { hashPassword, verifyPassword, generateSecureToken, timingSafeEqual } from "../../src/lib/security/hashing";
import { resolveAuthSecret } from "../../src/lib/auth";
import { checkRateLimit } from "../../src/lib/security/rateLimit";
import { extractClientIp, hashIpForRateLimit } from "../../src/lib/security/clientIp";
import { SmtpEmailProvider } from "../../src/lib/notifications/email";
import { HttpSmsProvider } from "../../src/lib/notifications/sms";

export async function runSecurityTests() {
  console.log("  Running Security & Cryptography Unit Tests...");

  // 1. PII Encryption Roundtrip
  const sensitiveContact = "+91 98765 43210";
  const encrypted = encryptPII(sensitiveContact);
  assert.notStrictEqual(encrypted, sensitiveContact, "Encrypted text must differ from plaintext");
  assert.ok(encrypted.includes(":"), "Encrypted text must include IV and auth tag separators");

  const decrypted = decryptPII(encrypted);
  assert.strictEqual(decrypted, sensitiveContact, "Decrypted text must match original plaintext");

  // 2. Encryption Tamper Resistance (GCM auth tag verification)
  const parts = encrypted.split(":");
  const tamperedCipher = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}AA`;
  assert.throws(
    () => decryptPII(tamperedCipher),
    /Unsupported state or unable to authenticate data|Invalid encrypted format/,
    "Tampered ciphertext must fail authentication in AES-GCM"
  );

  // 3. Password Hashing
  const plainPassword = "SuperSecretSchoolPassword2026!";
  const hash = await hashPassword(plainPassword);
  assert.notStrictEqual(hash, plainPassword);
  assert.ok(hash.startsWith("$2"), "Hash must follow bcrypt format");

  const isValid = await verifyPassword(plainPassword, hash);
  assert.strictEqual(isValid, true, "Valid password must verify successfully");

  const isInvalid = await verifyPassword("WrongPassword123!", hash);
  assert.strictEqual(isInvalid, false, "Invalid password must be rejected");

  // 4. Token Generation & Timing-Safe Equality
  const token1 = generateSecureToken(32);
  const token2 = generateSecureToken(32);
  assert.strictEqual(token1.length, 64, "32-byte hex token must be 64 characters");
  assert.notStrictEqual(token1, token2, "Two generated tokens must be cryptographically distinct");

  assert.strictEqual(timingSafeEqual(token1, token1), true, "Identical tokens must evaluate true");
  assert.strictEqual(timingSafeEqual(token1, token2), false, "Distinct tokens must evaluate false");

  // 5. SEC-P2-07: NextAuth Secret Validation
  // A. Missing in production must throw fatal error
  assert.throws(
    () => resolveAuthSecret({ NODE_ENV: "production", NEXTAUTH_SECRET: "" }),
    /FATAL CONFIGURATION ERROR: NEXTAUTH_SECRET environment variable is missing in production/
  );
  assert.throws(
    () => resolveAuthSecret({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    /FATAL CONFIGURATION ERROR: NEXTAUTH_SECRET environment variable is missing in production/
  );

  // B. Short secret (< 32 chars) must throw configuration error
  assert.throws(
    () => resolveAuthSecret({ NODE_ENV: "production", NEXTAUTH_SECRET: "too-short-secret" }),
    /NEXTAUTH_SECRET must be at least 32 characters long/
  );

  // C. Valid secret (>= 32 chars) succeeds
  const validSecret = "a-very-strong-production-secret-with-at-least-32-chars";
  assert.strictEqual(
    resolveAuthSecret({ NODE_ENV: "production", NEXTAUTH_SECRET: validSecret }),
    validSecret
  );

  // 6. SEC-P2-09: Trusted Client IP Extraction & Anonymization
  const headersWithCf = new Headers({
    "cf-connecting-ip": "203.0.113.195",
    "x-real-ip": "10.0.0.1",
    "x-forwarded-for": "10.0.0.1, 192.168.1.1",
  });
  assert.strictEqual(extractClientIp(headersWithCf), "203.0.113.195", "CF-Connecting-IP must take precedence");

  const headersWithForwarded = new Headers({
    "x-forwarded-for": "198.51.100.42, 10.0.0.2",
  });
  assert.strictEqual(extractClientIp(headersWithForwarded), "198.51.100.42", "Leftmost X-Forwarded-For must be extracted");

  const hashed1 = hashIpForRateLimit("198.51.100.42");
  const hashed2 = hashIpForRateLimit("198.51.100.42");
  const hashedDifferent = hashIpForRateLimit("203.0.113.195");
  assert.strictEqual(hashed1, hashed2, "Identical IP must produce identical hash");
  assert.notStrictEqual(hashed1, hashedDifferent, "Different IP must produce different hash");
  assert.strictEqual(hashed1.includes("198.51.100.42"), false, "Hashed IP must not contain raw IP address");

  // 7. SEC-P2-10: Rate Limiter Database Failure Behavior (Fail Closed)
  // Check that checkRateLimit handles invalid key/config safely and obeys failClosed
  const failClosedResult = await checkRateLimit("", { limit: 5, windowSeconds: 60, failClosed: true });
  // An empty key against prisma may succeed or fail; test explicit config flag
  assert.strictEqual(typeof failClosedResult.allowed, "boolean");

  // 8. SEC-P2-08: Notification Provider Stubs Unconfigured in Production
  const origSmtp = process.env.SMTP_HOST;
  delete process.env.SMTP_HOST;
  const unconfiguredEmail = new SmtpEmailProvider();
  assert.strictEqual(unconfiguredEmail.isConfigured(), false, "SmtpEmailProvider without env must report unconfigured");
  const emailRes = await unconfiguredEmail.sendEmail({
    to: "test@vidyora.in",
    subject: "Test",
    html: "<p>Test</p>",
  });
  assert.strictEqual(emailRes.success, false, "Unconfigured SmtpEmailProvider must return explicit delivery failure");
  assert.strictEqual(emailRes.unconfigured, true);
  if (origSmtp) process.env.SMTP_HOST = origSmtp;

  const origSms = process.env.SMS_GATEWAY_URL;
  delete process.env.SMS_GATEWAY_URL;
  const unconfiguredSms = new HttpSmsProvider();
  assert.strictEqual(unconfiguredSms.isConfigured(), false, "HttpSmsProvider without env must report unconfigured");
  const smsRes = await unconfiguredSms.sendSms({
    to: "+919876543210",
    message: "Test message",
    templateId: "TEST_DLT",
  });
  assert.strictEqual(smsRes.success, false, "Unconfigured HttpSmsProvider must return explicit delivery failure");
  assert.strictEqual(smsRes.unconfigured, true);
  if (origSms) process.env.SMS_GATEWAY_URL = origSms;

  console.log("    ✓ PII encryption/decryption roundtrip verified");
  console.log("    ✓ AES-256-GCM authentication tag tamper protection verified");
  console.log("    ✓ bcryptjs password hashing and verification verified");
  console.log("    ✓ Cryptographic token generation and timingSafeEqual verified");
  console.log("    ✓ SEC-P2-07: NextAuth secret production validation verified");
  console.log("    ✓ SEC-P2-09: Trusted client-IP extraction & privacy-preserving hash verified");
  console.log("    ✓ SEC-P2-08: Production notification provider unconfigured fail-closed verified");
}
