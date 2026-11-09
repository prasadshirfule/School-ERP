import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16; // Standard 128-bit auth tag

function getEncryptionKey(): Buffer {
  const rawKey = process.env.PII_ENCRYPTION_KEY;
  if (!rawKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PII_ENCRYPTION_KEY must be set in production");
    }
    // Deterministic 32-byte fallback key strictly for local development and unit tests
    return crypto.createHash("sha256").update("vidyora_dev_pii_encryption_key_32b!").digest();
  }

  // Derive 32-byte key using SHA-256 to ensure exact 256-bit key length
  return crypto.createHash("sha256").update(rawKey).digest();
}

export function encryptPII(plainText: string): string {
  if (!plainText) return plainText;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  // Format: iv:authTag:encrypted (colon-delimited base64 strings)
  return `${iv.toString("base64")}:${authTag}:${encrypted}`;
}

export function decryptPII(cipherText: string): string {
  if (!cipherText || !cipherText.includes(":")) return cipherText;

  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }

  const [ivB64, authTagB64, dataB64] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(dataB64, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
