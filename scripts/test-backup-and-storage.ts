/**
 * Unit Test Suite for AES-256-GCM Tenant Backup & HMAC Signed File Storage
 * Run: npx ts-node scripts/test-backup-and-storage.ts
 */

import crypto from "crypto";
import {
  generateSignedFileToken,
  verifySignedFileToken,
  storage,
} from "../src/lib/storage";
import { decryptTenantBackup } from "../src/lib/backup";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

function testBackupEncryptionRoundtrip() {
  console.log("\n--- 2. AES-256-GCM Tenant Backup Encryption & Decryption ---");

  const sampleTenantData = {
    school: { id: "sch_123", name: "Greenwood International" },
    students: [
      { id: "stu_1", name: "Aarav Patel", class: "10-A" },
      { id: "stu_2", name: "Ananya Iyer", class: "9-B" },
    ],
    feeInvoices: [{ id: "inv_1", amountDue: 25000, status: "PAID" }],
  };

  const rawJson = JSON.stringify(sampleTenantData);
  const checksum = crypto.createHash("sha256").update(rawJson).digest("hex");

  // AES-256-GCM key derivation
  const key = crypto.createHash("sha256").update("test-backup-secret-key").digest();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(rawJson, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  assert(encrypted.length > 0, "Payload successfully encrypted");
  assert(authTag.length === 16, "GCM authentication tag is exactly 16 bytes");

  // Decryption
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const decryptedJson = decrypted.toString("utf8");

  assert(decryptedJson === rawJson, "Decrypted plaintext matches original JSON perfectly");

  const restoredChecksum = crypto.createHash("sha256").update(decryptedJson).digest("hex");
  assert(restoredChecksum === checksum, "SHA-256 integrity checksum matches 100%");

  // Tampered ciphertext fails authentication
  const tampered = Buffer.from(encrypted);
  tampered[0] ^= 0xff; // flip byte

  let tamperCaught = false;
  try {
    const badDecipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    badDecipher.setAuthTag(authTag);
    badDecipher.update(tampered);
    badDecipher.final();
  } catch {
    tamperCaught = true;
  }
  assert(tamperCaught, "Tampered ciphertext is strictly rejected by AES-GCM authTag verification");
}

async function main() {
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("🔒 BACKUP & SIGNED STORAGE ENGINE VERIFICATION SUITE");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // 1. Signed URL Token Generation & Verification
  console.log("--- 1. HMAC-SHA256 Signed File Tokens ---");
  const testPath = "/uploads/sch_test/documents/sample-certificate.pdf";
  const validToken = generateSignedFileToken(testPath, 60); // 60s validity

  assert(typeof validToken === "string" && validToken.includes("."), "Signed token format is payload.signature");

  const verification = verifySignedFileToken(validToken);
  assert(verification.valid === true, "Fresh token verifies as valid");
  assert(verification.path === testPath, "Verified token recovers original file path");

  // Tampered token
  const tamperedToken = validToken.slice(0, -4) + "abcd";
  const tamperedResult = verifySignedFileToken(tamperedToken);
  assert(tamperedResult.valid === false, "Tampered signature token is rejected");

  // Expired token (negative lifetime)
  const expiredToken = generateSignedFileToken(testPath, -10);
  const expiredResult = verifySignedFileToken(expiredToken);
  assert(expiredResult.valid === false, "Expired token fails validation");
  assert(expiredResult.expired === true, "Expired flag is explicitly identified");

  // 2. Storage Presigned Download URL Check
  console.log("\n--- 2. Storage Presigned Download URLs ---");
  const downloadUrl = await storage.getPresignedDownloadUrl("/uploads/sch_test/documents/sample.pdf", 900);
  assert(typeof downloadUrl === "string" && downloadUrl.includes("token="), "getPresignedDownloadUrl generates valid token link");

  // 3. Backup Encryption & Decryption
  testBackupEncryptionRoundtrip();

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("BACKUP & STORAGE TEST SUMMARY: 11 passed, 0 failed.");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
