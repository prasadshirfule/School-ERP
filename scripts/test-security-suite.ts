/**
 * Complete Security, Tenant Isolation, PII, Payment, and Authorization Test Suite
 *
 * Run: npx ts-node scripts/test-security-suite.ts
 */

import {
  encryptPII,
  decryptPII,
  maskAadhaar,
  isEncryptedPII,
  EncryptionError,
  DecryptionError,
} from "../src/lib/security";
import { razorpayService } from "../src/lib/razorpay";
import { checkRateLimit, maskIdentifier } from "../src/lib/rateLimit";
import { hasRole, forbidden, unauthorized } from "../src/lib/utils";
import { TENANT_SCOPED_MODELS, RELATIONALLY_SCOPED_MODELS, tenantClient } from "../src/lib/tenant";
import { Role } from "@prisma/client";
import crypto from "crypto";

async function runSecuritySuite() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("🛡️  SCHOOL ERP — COMPREHENSIVE SECURITY AUDIT VERIFICATION SUITE");
  console.log("════════════════════════════════════════════════════════════════\n");

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

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1: PII ENCRYPTION & KEY SAFETY
  // ═══════════════════════════════════════════════════════════════════
  console.log("--- 1. PII Encryption & Authenticated AES-256-GCM Verification ---");

  const testAadhaar = "5432 9876 1234";
  const encrypted1 = encryptPII(testAadhaar);
  const encrypted2 = encryptPII(testAadhaar);
  if (!encrypted1 || !encrypted2) throw new Error("Encryption failed");

  assert(isEncryptedPII(encrypted1), "encryptPII returns format matching v1 envelope header");
  assert(encrypted1 !== testAadhaar, "Ciphertext does not equal plaintext");
  assert(
    encrypted1 !== encrypted2,
    "Identical plaintexts generate different ciphertexts (unique random nonce per encryption)"
  );

  const decrypted = decryptPII(encrypted1);
  assert(decrypted === testAadhaar, "decryptPII recovers original plaintext accurately");

  // Tamper detection: flip bytes in ciphertext (parts = [ivHex, authTagHex, cipherHex])
  const parts = encrypted1.split(":");
  const tamperedCiphertext = `${parts[0]}:${parts[1]}:ffff${parts[2].slice(4)}`;
  let tamperedBlocked = false;
  try {
    decryptPII(tamperedCiphertext);
  } catch (err: any) {
    tamperedBlocked = true;
    assert(
      err instanceof DecryptionError,
      "Tampered ciphertext triggers typed DecryptionError with tag verification failure"
    );
  }
  assert(tamperedBlocked, "Tampered ciphertext cannot be decrypted");

  // Malformed envelope handling: colon-separated string that fails hex or length checks
  let malformedBlocked = false;
  try {
    decryptPII("bad_iv:bad_tag:bad_cipher");
  } catch (err: any) {
    if (err instanceof DecryptionError) {
      malformedBlocked = true;
    }
  }
  assert(malformedBlocked, "Malformed envelope string is rejected with DecryptionError without plaintext fallback");

  // Legacy plaintext compatibility: non-colon string
  const legacyPlaintext = decryptPII("987654321012");
  assert(legacyPlaintext === "987654321012", "Legacy plaintext without envelope colons is safely returned for migration");

  // Masking
  const maskedAadhaar = maskAadhaar(testAadhaar);
  assert(maskedAadhaar === "XXXX-XXXX-1234", "maskAadhaar displays only last 4 digits (XXXX-XXXX-1234)");
  assert(!maskedAadhaar.includes("5432"), "maskAadhaar does not disclose leading digits");

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: PAYMENT GATEWAY & SIGNATURE TAMPER INTEGRITY
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 2. Razorpay Signature Verification & Production Safety ---");

  const orderId = "order_test_987654";
  const paymentId = "pay_test_123456";
  const testSecret = razorpayService.getKeySecret();

  const validSignature = crypto
    .createHmac("sha256", testSecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const verified = razorpayService.verifyPaymentSignature({
    orderId,
    paymentId,
    signature: validSignature,
  });
  assert(verified, "Legitimate HMAC-SHA256 signature is successfully verified");

  const invalidSigVerified = razorpayService.verifyPaymentSignature({
    orderId,
    paymentId,
    signature: "invalid_tampered_signature_hex",
  });
  assert(!invalidSigVerified, "Forged or tampered signature is rejected");

  // Production mock rejection test
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    (process.env as any).NODE_ENV = "production";
    const mockAcceptedInProd = razorpayService.verifyPaymentSignature({
      orderId,
      paymentId,
      signature: `mock_sig_${paymentId}`,
    });
    assert(!mockAcceptedInProd, "Mock signature 'mock_sig_...' is STRICTLY REJECTED in production");
  } finally {
    (process.env as any).NODE_ENV = originalNodeEnv;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: RATE LIMITING & AUDIT IDENTIFIER PRIVACY
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 3. Rate Limiting Hardening & Privacy Masking ---");

  const testKey = `test-client-${Date.now()}`;
  const limit = 5;
  const windowMs = 1000;

  let allAllowed = true;
  for (let i = 0; i < limit; i++) {
    const res = checkRateLimit(testKey, limit, windowMs);
    if (!res.allowed) allAllowed = false;
  }
  assert(allAllowed, `Initial ${limit} requests within window are allowed`);

  const blockedRes = checkRateLimit(testKey, limit, windowMs);
  assert(!blockedRes.allowed && blockedRes.remaining === 0, "Request exceeding limit is blocked");

  // Masking identifiers in telemetry/logs
  assert(maskIdentifier("admin@greenfield.edu") === "ad***@greenfield.edu", "Email identifier is masked in logs");
  assert(maskIdentifier("192.168.1.100") === "192.168.***.***", "IPv4 address is masked in logs");
  assert(maskIdentifier("2001:db8:85a3:8d3:1319:8a2e:370:7348").includes("****"), "IPv6 address is masked in logs");

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4: TENANT EXTENSION & RELATIONAL SCOPING REGRESSION
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 4. Multi-Tenant Relational & Model Coverage ---");

  assert(
    TENANT_SCOPED_MODELS.size === 21,
    `All 21 direct schoolId models are registered (got ${TENANT_SCOPED_MODELS.size})`
  );
  assert(
    RELATIONALLY_SCOPED_MODELS.size === 4,
    `All 4 relational models (Teacher, Marks, StudentParent, TeacherSubject) are registered (got ${RELATIONALLY_SCOPED_MODELS.size})`
  );

  const schoolA = "school_test_alpha";
  const schoolB = "school_test_beta";
  const clientA = tenantClient(schoolA);
  const clientB = tenantClient(schoolB);

  assert(typeof clientA.student.findMany === "function", "tenantClient returns functional client for School A");
  assert(typeof clientB.student.findMany === "function", "tenantClient returns functional client for School B");

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 5: ROLE-BASED ACCESS CONTROL (RBAC) UTILITY MATRIX
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 5. RBAC Helper & Response Contract Verification ---");

  const adminSession = { user: { role: Role.ADMIN } };
  const teacherSession = { user: { role: Role.TEACHER } };
  const parentSession = { user: { role: Role.PARENT } };
  const accountantSession = { user: { role: Role.ACCOUNTANT } };

  assert(hasRole(adminSession, ["ADMIN", "PRINCIPAL"]), "ADMIN passes admin check");
  assert(!hasRole(teacherSession, ["ADMIN", "PRINCIPAL"]), "TEACHER blocked from admin check");
  assert(hasRole(teacherSession, ["ADMIN", "PRINCIPAL", "TEACHER"]), "TEACHER passes teacher check");
  assert(!hasRole(parentSession, ["ACCOUNTANT", "ADMIN"]), "PARENT blocked from accountant check");
  assert(hasRole(accountantSession, ["ACCOUNTANT"]), "ACCOUNTANT passes financial check");

  const forbiddenRes = forbidden();
  assert(forbiddenRes.status === 403, "forbidden() returns HTTP 403");

  const unauthorizedRes = unauthorized();
  assert(unauthorizedRes.status === 401, "unauthorized() returns HTTP 401");

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(`SECURITY AUDIT TEST SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log("════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecuritySuite().catch((err) => {
  console.error("Security suite crashed:", err);
  process.exit(1);
});
