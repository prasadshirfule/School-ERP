import crypto from "crypto";

// 32-byte key for AES-256-GCM encryption
const ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY || "school_erp_default_pii_key_32bytes!!"; // 32 chars
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Encrypt sensitive PII text (e.g. Aadhaar number, medical conditions)
 */
export function encryptPII(text: string | null | undefined): string | null {
  if (!text) return null;
  try {
    const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    // Format: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("PII encryption error:", err);
    return text; // Fallback to plain text on error to avoid data loss
  }
}

/**
 * Decrypt sensitive PII text
 */
export function decryptPII(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null;
  // If not in the iv:authTag:encrypted format, return as-is (e.g. legacy plain text)
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    return encryptedText;
  }

  try {
    const [ivHex, authTagHex, encrypted] = parts;
    const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    // Return original if decryption fails
    return encryptedText;
  }
}

/**
 * Mask Indian Aadhaar Number to display only last 4 digits (e.g. "XXXX-XXXX-4321")
 */
export function maskAadhaar(aadhaar: string | null | undefined): string {
  if (!aadhaar) return "-";
  const raw = decryptPII(aadhaar) || "";
  const cleaned = raw.replace(/\D/g, "");
  if (cleaned.length < 4) return "XXXX-XXXX-XXXX";
  const last4 = cleaned.slice(-4);
  return `XXXX-XXXX-${last4}`;
}
