import assert from "assert";
import { encryptPII, decryptPII } from "../../src/lib/security/encryption";
import { hashPassword, verifyPassword, generateSecureToken, timingSafeEqual } from "../../src/lib/security/hashing";

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

  console.log("    ✓ PII encryption/decryption roundtrip verified");
  console.log("    ✓ AES-256-GCM authentication tag tamper protection verified");
  console.log("    ✓ bcryptjs password hashing and verification verified");
  console.log("    ✓ Cryptographic token generation and timingSafeEqual verified");
}
