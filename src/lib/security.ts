import crypto from "crypto";
import { getPIIEncryptionKey } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

export class EncryptionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "EncryptionError";
  }
}

export class DecryptionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DecryptionError";
  }
}

export class AuthenticationTagError extends DecryptionError {
  constructor(message: string = "Failed to authenticate ciphertext: invalid tag or corrupted data") {
    super(message);
    this.name = "AuthenticationTagError";
  }
}

/**
 * Derives a consistent 32-byte binary key from the validated environment secret.
 */
function getKeyBuffer(): Buffer {
  const secret = getPIIEncryptionKey();
  // Using SHA-256 digest ensures exactly 32 bytes (256 bits) for AES-256
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

/**
 * Checks if a string matches the standard encrypted PII format: ivHex:authTagHex:ciphertextHex
 */
export function isEncryptedPII(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  const [ivHex, authTagHex, cipherHex] = parts;
  // IV must be 12 bytes (24 hex characters)
  if (ivHex.length !== IV_LENGTH * 2 || !/^[0-9a-fA-F]+$/.test(ivHex)) return false;
  // Auth tag must be 16 bytes (32 hex characters)
  if (authTagHex.length !== AUTH_TAG_LENGTH * 2 || !/^[0-9a-fA-F]+$/.test(authTagHex)) return false;
  // Ciphertext must be non-empty hex
  if (cipherHex.length === 0 || !/^[0-9a-fA-F]+$/.test(cipherHex)) return false;
  return true;
}

/**
 * Encrypts sensitive PII text (e.g. Aadhaar number, medical conditions) using AES-256-GCM.
 * NEVER falls back to plain text on error.
 *
 * @throws {EncryptionError} if encryption fails
 */
export function encryptPII(text: string | null | undefined): string | null {
  if (!text || text.trim() === "") return null;

  // If already encrypted, do not re-encrypt
  if (isEncryptedPII(text)) {
    return text;
  }

  try {
    const key = getKeyBuffer();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    // Format: ivHex:authTagHex:ciphertextHex
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err: unknown) {
    // Fail securely: NEVER return plaintext on error
    throw new EncryptionError(
      "Failed to securely encrypt sensitive PII data. Mutation aborted to protect data integrity.",
      err
    );
  }
}

/**
 * Decrypts sensitive PII text.
 * NEVER returns raw ciphertext as plaintext if decryption fails.
 * Supports legacy unencrypted records transparently during migration.
 *
 * @throws {DecryptionError} if ciphertext is malformed or authentication fails
 */
export function decryptPII(encryptedText: string | null | undefined): string | null {
  if (!encryptedText || encryptedText.trim() === "") return null;

  // If formatted with colons (attempted envelope), validate strictly
  if (encryptedText.includes(":")) {
    if (!isEncryptedPII(encryptedText)) {
      throw new DecryptionError("Malformed ciphertext envelope: invalid IV, tag, or payload structure.");
    }
  } else {
    // Legacy unencrypted plaintext record (e.g. raw Aadhaar or medical note)
    return encryptedText;
  }

  const parts = encryptedText.split(":");
  const [ivHex, authTagHex, encrypted] = parts;

  try {
    const key = getKeyBuffer();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err: unknown) {
    // Fail securely: NEVER return ciphertext as plaintext
    throw new AuthenticationTagError(
      "Failed to decrypt PII: authentication tag verification failed or key mismatch."
    );
  }
}

/**
 * Safe decrypt that catches errors and returns null instead of throwing.
 * Useful for display contexts where a decryption failure should not crash the entire view.
 */
export function safeDecryptPII(encryptedText: string | null | undefined): string | null {
  try {
    return decryptPII(encryptedText);
  } catch {
    return null;
  }
}

/**
 * Masks Indian Aadhaar Number to display only last 4 digits (e.g. "XXXX-XXXX-4321").
 * Decrypts if encrypted, cleans non-digits, and handles edge cases securely.
 */
export function maskAadhaar(aadhaar: string | null | undefined): string {
  if (!aadhaar) return "-";
  const raw = safeDecryptPII(aadhaar);
  if (!raw) return "XXXX-XXXX-XXXX";
  const cleaned = raw.replace(/\D/g, "");
  if (cleaned.length < 4) return "XXXX-XXXX-XXXX";
  const last4 = cleaned.slice(-4);
  return `XXXX-XXXX-${last4}`;
}
