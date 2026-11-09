/**
 * Unit Test Suite for RFC 6238 TOTP Engine & Recovery Codes
 * Run: npx ts-node scripts/test-totp-unit.ts
 */

import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  generateRecoveryCodes,
  verifyRecoveryCode,
  generateOtpAuthUrl,
  encryptSecret,
  decryptSecret,
  isTotpReplayed,
  markTotpConsumed,
} from "../src/lib/totp";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

function main() {
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("🔐 TOTP & RECOVERY CODE ENGINE — UNIT VERIFICATION SUITE");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // 1. Base32 roundtrip
  console.log("--- 1. Base32 Encoding / Decoding ---");
  const testBuf = Buffer.from("SchoolERP-SuperAdmin-Secret-Key-2026");
  const encoded = base32Encode(testBuf);
  const decoded = base32Decode(encoded);
  assert(decoded.equals(testBuf), "Base32 roundtrip reproduces original buffer exactly");

  // 2. Secret generation
  console.log("\n--- 2. Cryptographic Secret Generation ---");
  const secret1 = generateTotpSecret();
  const secret2 = generateTotpSecret();
  assert(secret1.length >= 32, "Base32 secret length is at least 32 characters (160 bits)");
  assert(secret1 !== secret2, "Consecutive generated secrets are unique (cryptographically random)");

  // 3. OTP Auth URL format
  console.log("\n--- 3. OTP Auth URL Format ---");
  const url = generateOtpAuthUrl({
    issuer: "School ERP",
    accountName: "admin@school.org",
    secret: secret1,
  });
  assert(url.startsWith("otpauth://totp/School%20ERP%3Aadmin%40school.org?secret="), "otpauth URI formatted correctly for Google Authenticator");
  assert(url.includes("digits=6") && url.includes("period=30"), "URI specifies 6 digits and 30-second period");

  // 4. TOTP Generation & Verification
  console.log("\n--- 4. TOTP Generation & Time-Drift Verification ---");
  const now = Date.now();
  const code = generateTotpCode(secret1, now);
  assert(code.length === 6 && /^\d{6}$/.test(code), "Generated code is exactly 6 numerical digits");

  // Current window verification
  const validNow = verifyTotpCode({ secret: secret1, token: code, timeMs: now });
  assert(validNow === true, "Current 30-second window code validates successfully");

  // Within -20s drift (same or adjacent window)
  const validPrev = verifyTotpCode({ secret: secret1, token: code, timeMs: now + 20000 });
  assert(validPrev === true, "Code within allowable drift window (+20s) validates successfully");

  // Beyond window (+90s)
  const invalidExpired = verifyTotpCode({ secret: secret1, token: code, timeMs: now + 90000 });
  assert(invalidExpired === false, "Expired code (+90s drift) is strictly rejected");

  // Invalid token string
  const wrongCode = code === "123456" ? "654321" : "123456";
  const invalidCode = verifyTotpCode({ secret: secret1, token: wrongCode, timeMs: now });
  assert(invalidCode === false, "Incorrect 6-digit code is strictly rejected");

  // Malformed inputs
  assert(verifyTotpCode({ secret: secret1, token: "12345", timeMs: now }) === false, "5-digit token rejected");
  assert(verifyTotpCode({ secret: secret1, token: "abcdef", timeMs: now }) === false, "Non-numeric token rejected");
  assert(verifyTotpCode({ secret: "", token: code, timeMs: now }) === false, "Empty secret rejected");

  // 5. Recovery Codes Generation & Verification
  console.log("\n--- 5. Single-Use Recovery Codes ---");
  const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
  assert(plainCodes.length === 8, "Generates exactly 8 recovery codes");
  assert(hashedCodes.length === 8, "Generates 8 corresponding SHA-256 hashes");
  assert(plainCodes[0].split("-").length === 3, "Recovery code formatted in XXXX-XXXX-XXXX blocks for human readability");

  // Verify first code
  const testCode = plainCodes[0];
  const matchedHash = verifyRecoveryCode(testCode, hashedCodes);
  assert(matchedHash === hashedCodes[0], "Valid recovery code correctly identifies and matches its stored hash");

  // Formatting tolerance (lowercase and without dashes)
  const rawCode = testCode.toLowerCase().replace(/-/g, " ");
  const matchedTolerant = verifyRecoveryCode(rawCode, hashedCodes);
  assert(matchedTolerant === hashedCodes[0], "Recovery code matching is case-insensitive and tolerant of spaces/hyphens");

  // Invalid recovery code
  const invalidRecovery = verifyRecoveryCode("ZZZZ-9999-0000", hashedCodes);
  assert(invalidRecovery === null, "Invalid recovery code returns null");

  // Empty list
  assert(verifyRecoveryCode(testCode, []) === null, "Empty stored recovery code list returns null");

  // 6. RFC 6238 Appendix B Official Test Vectors
  console.log("\n--- 6. RFC 6238 Appendix B Official Test Vectors ---");
  // Seed in hex: 3132333435363738393031323334353637383930 (ASCII "12345678901234567890")
  const rfcSeedBuf = Buffer.from("12345678901234567890", "ascii");
  const rfcSecret = base32Encode(rfcSeedBuf);

  // Vector 1: Time = 59s -> TOTP = 287082
  const v1 = generateTotpCode(rfcSecret, 59 * 1000);
  assert(v1 === "287082", `RFC 6238 Vector at 59s: expected 287082, got ${v1}`);

  // Vector 2: Time = 1111111109s -> TOTP = 081804
  const v2 = generateTotpCode(rfcSecret, 1111111109 * 1000);
  assert(v2 === "081804", `RFC 6238 Vector at 1111111109s: expected 081804, got ${v2}`);

  // Vector 3: Time = 1111111111s -> TOTP = 050471
  const v3 = generateTotpCode(rfcSecret, 1111111111 * 1000);
  assert(v3 === "050471", `RFC 6238 Vector at 1111111111s: expected 050471, got ${v3}`);

  // Vector 4: Time = 1234567890s -> TOTP = 005924
  const v4 = generateTotpCode(rfcSecret, 1234567890 * 1000);
  assert(v4 === "005924", `RFC 6238 Vector at 1234567890s: expected 005924, got ${v4}`);

  // Vector 5: Time = 2000000000s -> TOTP = 279037
  const v5 = generateTotpCode(rfcSecret, 2000000000 * 1000);
  assert(v5 === "279037", `RFC 6238 Vector at 2000000000s: expected 279037, got ${v5}`);

  // 7. AES-256-GCM Secret Encryption At Rest
  console.log("\n--- 7. AES-256-GCM Secret Encryption At Rest ---");
  const plaintextSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
  const encrypted = encryptSecret(plaintextSecret);
  assert(encrypted.startsWith("enc:v1:"), "Encrypted ciphertext has authenticated version prefix 'enc:v1:'");
  assert(encrypted !== plaintextSecret, "Ciphertext is distinct from plaintext Base32 secret");
  assert(encrypted.slice(7).split(":").length === 3, "Ciphertext payload contains 12-byte IV, 16-byte tag, and ciphertext");

  const decrypted = decryptSecret(encrypted);
  assert(decrypted === plaintextSecret, "AES-256-GCM decryption accurately recovers original plaintext secret");

  // Tamper resistance: modified tag fails decryption
  const parts = encrypted.slice(7).split(":");
  const tamperedTag = "enc:v1:" + parts[0] + ":" + "ff" + parts[1].slice(2) + ":" + parts[2];
  let tamperDetected = false;
  try {
    decryptSecret(tamperedTag);
  } catch {
    tamperDetected = true;
  }
  assert(tamperDetected, "AES-256-GCM authentication tag verification strictly rejects tampered ciphertext");

  // 8. In-Memory TOTP Replay Prevention
  console.log("\n--- 8. In-Memory TOTP Replay Prevention ---");
  const testUserId = "user_totp_replay_test";
  const testTotpCode = "654321";

  assert(!isTotpReplayed(testUserId, testTotpCode), "Fresh TOTP code is not flagged as replayed");
  markTotpConsumed(testUserId, testTotpCode, 2000);
  assert(isTotpReplayed(testUserId, testTotpCode), "Consumed TOTP code is immediately flagged as replayed within window");
  assert(!isTotpReplayed("another_user", testTotpCode), "Replay tracking is isolated per user ID");

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("ALL 26 TOTP & RECOVERY CODE UNIT ASSERTIONS PASSED!");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main();
