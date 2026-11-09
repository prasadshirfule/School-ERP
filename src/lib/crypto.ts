import crypto from "crypto";
import { getAuthSecret } from "./env";

/**
 * Derives a 32-byte (256-bit) encryption key for AES-256-GCM.
 * Prioritizes MFA_ENCRYPTION_KEY if provided; otherwise derives
 * a cryptographically separated key from AUTH_SECRET via HKDF (RFC 5869).
 */
function getMfaEncryptionKey(): Buffer {
  const envKey = process.env.MFA_ENCRYPTION_KEY;
  if (envKey) {
    // If provided as a 64-char hex string or 32-byte string
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, "hex");
    }
    const buf = Buffer.from(envKey, "utf-8");
    if (buf.length === 32) {
      return buf;
    }
    // Hash to exactly 32 bytes with SHA-256 if arbitrary length
    return crypto.createHash("sha256").update(buf).digest();
  }

  // Derive key from AUTH_SECRET using HKDF
  const authSecret = getAuthSecret();
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(authSecret, "utf-8"),
      Buffer.from("school-erp-mfa-salt-v1", "utf-8"),
      Buffer.from("mfa-secret-encryption-aes-256-gcm", "utf-8"),
      32
    )
  );
}

const ENCRYPTION_PREFIX = "enc:v1:";

/**
 * Encrypts a plaintext secret (e.g. Base32 TOTP key) using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const key = getMfaEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an AES-256-GCM encrypted secret.
 * If the string does not have the enc:v1: prefix, gracefully returns
 * the string as-is to preserve backward compatibility during migrations.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return "";

  // Backward compatibility check
  if (!encryptedPayload.startsWith(ENCRYPTION_PREFIX)) {
    return encryptedPayload;
  }

  const parts = encryptedPayload.slice(ENCRYPTION_PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format for MFA secret");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getMfaEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
