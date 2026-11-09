/**
 * RFC 6238 Time-Based One-Time Password (TOTP) & Recovery Code Engine
 *
 * Implements pure Node.js native crypto TOTP generation, validation,
 * base32 serialization, and single-use recovery code management.
 * Zero external dependencies.
 */

import crypto from "crypto";
import prisma from "./prisma";
export { encryptSecret, decryptSecret } from "./crypto";

interface ConsumedTotpEntry {
  expiresAt: number;
}

const consumedTotpTokens = new Map<string, ConsumedTotpEntry>();

/**
 * Checks if a TOTP code has already been consumed for a given user within its validity window.
 * Returns true if replayed (already used), false if fresh.
 */
export function isTotpReplayed(userId: string, code: string): boolean {
  const now = Date.now();
  const key = `${userId}:${code.trim()}`;
  const entry = consumedTotpTokens.get(key);
  if (entry && entry.expiresAt > now) {
    return true;
  }
  return false;
}

/**
 * Marks a TOTP code as consumed for a given user, preventing replay attacks within the 90s window.
 */
export function markTotpConsumed(userId: string, code: string, ttlMs: number = 90 * 1000): void {
  const now = Date.now();
  const key = `${userId}:${code.trim()}`;
  consumedTotpTokens.set(key, { expiresAt: now + ttlMs });

  // Clean expired tokens if cache exceeds threshold
  if (consumedTotpTokens.size > 2000) {
    for (const [k, v] of consumedTotpTokens.entries()) {
      if (now > v.expiresAt) {
        consumedTotpTokens.delete(k);
      }
    }
  }
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encodes a buffer to a standard RFC 4648 Base32 string (without padding)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes an RFC 4648 Base32 string into a Buffer
 */
export function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically secure 20-byte Base32 secret for TOTP
 */
export function generateTotpSecret(): string {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

/**
 * Generates an otpauth:// URI suitable for QR codes and authenticator apps
 */
export function generateOtpAuthUrl({
  issuer = "SchoolERP",
  accountName,
  secret,
}: {
  issuer?: string;
  accountName: string;
  secret: string;
}): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates the 6-digit TOTP code for a given secret and timestamp (RFC 6238 / RFC 4226)
 */
export function generateTotpCode(
  secretOrOptions: string | { secret: string; timeMs?: number },
  optionalTimeMs?: number
): string {
  const secret = typeof secretOrOptions === "string" ? secretOrOptions : secretOrOptions.secret;
  const timeMs =
    typeof secretOrOptions === "object" && secretOrOptions.timeMs !== undefined
      ? secretOrOptions.timeMs
      : optionalTimeMs ?? Date.now();

  const key = base32Decode(secret);
  const counter = Math.floor(timeMs / 1000 / 30);

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verifies a 6-digit TOTP code with +-1 window tolerance (+-30 seconds clock drift)
 */
export function verifyTotpCode({
  secret,
  token,
  timeMs = Date.now(),
  window = 1,
}: {
  secret: string;
  token: string;
  timeMs?: number;
  window?: number;
}): boolean {
  if (!secret || !token || token.length !== 6 || !/^\d{6}$/.test(token)) {
    return false;
  }

  const currentStep = Math.floor(timeMs / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    const stepTime = (currentStep + i) * 30 * 1000;
    const expected = generateTotpCode(secret, stepTime);

    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

/**
 * Finds the exact matching TOTP counter step for a secret and token within tolerance window.
 * Returns the matching step integer, or null if no step matched.
 */
export function findMatchingTotpStep(
  secret: string,
  token: string,
  timeMs: number = Date.now(),
  window: number = 1
): number | null {
  if (!secret || !token || token.length !== 6 || !/^\d{6}$/.test(token)) {
    return null;
  }

  const currentStep = Math.floor(timeMs / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    const step = currentStep + i;
    const stepTime = step * 30 * 1000;
    const expected = generateTotpCode(secret, stepTime);

    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return step;
    }
  }

  return null;
}

/**
 * Atomically consumes a TOTP time-step at the PostgreSQL database level.
 * Guarantees cross-instance replay prevention across all Vercel serverless lambdas.
 * Uses unique constraint [userId, step] so concurrent requests fail atomically with P2002.
 * Never stores the plaintext TOTP code.
 */
export async function recordTotpConsumedAtDatabaseLevel(
  userId: string,
  step: number,
  code: string
): Promise<void> {
  const codeHash = crypto
    .createHash("sha256")
    .update(`${userId}:${step}:${code.trim()}`)
    .digest("hex");

  const expiresAt = new Date((step + 3) * 30 * 1000); // 90s grace window

  try {
    await prisma.usedTotpToken.create({
      data: {
        userId,
        step: BigInt(step),
        codeHash,
        expiresAt,
      },
    });
    // Also mark in-memory for immediate local caching
    markTotpConsumed(userId, code);
  } catch (err: unknown) {
    const prismaError = err as { code?: string; message?: string };
    if (prismaError?.code === "P2002" || prismaError?.message?.includes("Unique constraint")) {
      throw new Error("INVALID_MFA_CODE: Multi-factor code has already been used. Please wait for the next 30-second code.");
    }
    // Privileged MFA authentication strictly fails closed if the database is unavailable.
    // In-memory fallback is disabled to prevent distributed replay bypass across serverless lambdas.
    console.error("[TOTP] Database error recording consumed token:", err instanceof Error ? err.message : String(err));
    throw new Error("MFA_DATABASE_ERROR: Multi-factor authentication database verification failed. Access denied.");
  }
}

/**
 * Prunes expired UsedTotpToken records from PostgreSQL
 */
export async function cleanupExpiredTotpTokens(): Promise<number> {
  try {
    const res = await prisma.usedTotpToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return res.count;
  } catch {
    return 0;
  }
}

/**
 * Generates a set of single-use, cryptographically secure recovery codes.
 * Returns both the plain-text codes (to show user once) and their SHA-256 hashes (for DB storage).
 */
export function generateRecoveryCodes(count: number = 8): {
  plainCodes: string[];
  hashedCodes: string[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(6).toString("hex").toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    plainCodes.push(formatted);
    hashedCodes.push(hashRecoveryCode(formatted));
  }

  return { plainCodes, hashedCodes };
}

/**
 * Computes SHA-256 hash of a normalized recovery code
 */
export function hashRecoveryCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Verifies if an entered code matches any stored recovery code hash.
 * Returns the matching hash if found (so it can be consumed/removed from DB), or null.
 */
export function verifyRecoveryCode(
  enteredCode: string,
  storedHashedCodes: string[]
): string | null {
  if (!enteredCode || !storedHashedCodes || storedHashedCodes.length === 0) {
    return null;
  }

  const targetHash = hashRecoveryCode(enteredCode);

  for (const stored of storedHashedCodes) {
    if (crypto.timingSafeEqual(Buffer.from(targetHash, "hex"), Buffer.from(stored, "hex"))) {
      return stored;
    }
  }

  return null;
}
