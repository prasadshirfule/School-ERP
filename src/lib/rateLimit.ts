import crypto from "crypto";
import prisma from "./prisma";
import { getRateLimitHmacSecret } from "./env";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const MAX_STORE_SIZE = 10000;
const rateLimitStore = new Map<string, RateLimitEntry>();

// Regular expressions to validate genuine IPv4 and IPv6 addresses (guards against header injection)
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^(?:[a-fA-F0-9]{1,4}:){1,7}[a-fA-F0-9]{1,4}$|^::1$|^::$/;

/**
 * Derives a cryptographically secure, keyed HMAC-SHA256 hash of a rate-limit identifier.
 * Uses dedicated RATE_LIMIT_HMAC_SECRET (fails safely in production if missing).
 * Ensures the database NEVER stores plaintext user emails or IP addresses,
 * eliminating account enumeration and privacy exposure during database inspection.
 */
export function hashRateLimitIdentifier(rawIdentifier: string): string {
  const normalized = rawIdentifier.trim().toLowerCase().normalize("NFKC");
  const secret = getRateLimitHmacSecret();
  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
}

function isPrivateIp(ip: string): boolean {
  if (/^10\./.test(ip)) return true;
  if (/^127\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (ip === "::1") return true;
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(ip)) return true;
  if (/^fe[89ab][0-9a-f]:/i.test(ip)) return true;
  return false;
}

/**
 * Extracts the trusted client IP address from request headers.
 * Safely handles platform headers with strict trust precedence:
 *   1. x-vercel-forwarded-for / x-vercel-ip (Injected directly by Vercel edge infrastructure;
 *      clients cannot spoof because Vercel strips client-sent x-vercel-* headers)
 *   2. x-real-ip (Injected by trusted edge reverse-proxies from the remote TCP socket)
 *   3. x-forwarded-for (Fallback forwarding chain inspected right-to-left, skipping trusted
 *      private proxy hops to extract true public client and ignore client-injected leading IPs)
 * Strictly validates IP format (IPv4 / IPv6 regex) to reject header injection or malformed addresses.
 * Returns null if the header is missing, invalid, or forged; NEVER pools unidentifiable
 * clients into a shared 127.0.0.1 bucket to prevent collateral denial-of-service.
 */
export function getClientIp(
  headers: Headers | Record<string, string | string[] | undefined> | undefined | null
): string | null {
  if (!headers) return null;

  const getHeader = (name: string): string | undefined => {
    if (typeof (headers as Headers)?.get === "function") {
      return (headers as Headers).get(name) || undefined;
    }
    const rawObj = headers as Record<string, string | string[] | undefined>;
    const val = rawObj[name.toLowerCase()] || rawObj[name];
    return Array.isArray(val) ? val[0] : val;
  };

  // 1. Prioritize trusted platform-generated edge headers (set by Vercel infrastructure)
  const vercelIp = getHeader("x-vercel-forwarded-for") || getHeader("x-vercel-ip");
  if (vercelIp && typeof vercelIp === "string") {
    const candidate = vercelIp.split(",")[0].trim();
    if (IPV4_REGEX.test(candidate) || IPV6_REGEX.test(candidate)) {
      return candidate;
    }
  }

  // 2. Prioritize remote TCP socket IP from edge proxy
  const realIp = getHeader("x-real-ip");
  if (realIp && typeof realIp === "string") {
    const candidate = realIp.split(",")[0].trim();
    if (IPV4_REGEX.test(candidate) || IPV6_REGEX.test(candidate)) {
      return candidate;
    }
  }

  // 3. Fallback to x-forwarded-for only if platform edge headers are absent.
  // In x-forwarded-for, reverse proxies append the client's socket address to the right.
  // We inspect right-to-left, skipping trusted internal/private reverse-proxy hops (RFC 1918)
  // to prioritize the true public client address while ignoring client-injected leading IPs.
  const forwardedFor = getHeader("x-forwarded-for");
  if (forwardedFor && typeof forwardedFor === "string") {
    const parts = forwardedFor.split(",").map((s) => s.trim()).filter(Boolean);
    const validIps = parts.filter((part) => IPV4_REGEX.test(part) || IPV6_REGEX.test(part));

    for (let i = validIps.length - 1; i >= 0; i--) {
      if (!isPrivateIp(validIps[i])) {
        return validIps[i];
      }
    }
    // If all valid IPs are private (e.g. dev/staging environment), return the rightmost valid IP
    if (validIps.length > 0) {
      return validIps[validIps.length - 1];
    }
  }

  // Return null if missing or malformed to avoid shared rate-limit pooling
  return null;
}

/**
 * Mask sensitive identifiers (IP, email) for safe audit logging
 */
export function maskIdentifier(id: string): string {
  if (!id) return "anonymous";
  if (id.includes("@")) {
    const [user, domain] = id.split("@");
    const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : "***";
    return `${maskedUser}@${domain || "unknown"}`;
  }
  // IP address masking
  if (id.includes(".")) {
    const parts = id.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  }
  if (id.includes(":")) {
    const parts = id.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:****:****`;
    }
  }
  return id.length > 8 ? `${id.slice(0, 4)}***${id.slice(-4)}` : "***";
}

/**
 * Prunes expired keys and enforces maximum size bounds to prevent memory denial-of-service
 */
function pruneRateLimitStore(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  // If still above maximum capacity after expired cleanup, drop oldest entries
  if (rateLimitStore.size >= MAX_STORE_SIZE) {
    const keysToDelete = Array.from(rateLimitStore.keys()).slice(0, Math.floor(MAX_STORE_SIZE * 0.2));
    for (const k of keysToDelete) {
      rateLimitStore.delete(k);
    }
  }
}

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  const interval = setInterval(() => {
    pruneRateLimitStore(Date.now());
  }, 5 * 60 * 1000);
  if (typeof interval === "object" && interval !== null && "unref" in interval && typeof (interval as { unref: () => void }).unref === "function") {
    (interval as { unref: () => void }).unref();
  }
}

/**
 * Memory-bounded sliding window rate limiter
 * @param key Unique identifier (e.g. IP address or userId + action)
 * @param limit Maximum allowed requests in window
 * @param windowMs Time window in milliseconds (default: 60,000 = 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  if (rateLimitStore.size >= MAX_STORE_SIZE) {
    pruneRateLimitStore(now);
  }

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Shared, Neon PostgreSQL-backed atomic rate limiter.
 * Enforces rate limits across all distributed Vercel serverless lambdas.
 * Uses atomic transactions and single-record-per-identifier bounding to
 * eliminate concurrency race conditions and prevent unbounded record growth.
 * Persists only HMAC-SHA256 hashed identifiers to prevent leaking user emails or IPs.
 */
export async function checkDatabaseRateLimit(
  identifier: string,
  limit: number = 15,
  windowMs: number = 5 * 60 * 1000,
  options?: { isPrivileged?: boolean; failClosed?: boolean }
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // If identifier is not already a 64-char hex string, hash it with HMAC-SHA256
  const isHashed = /^[a-f0-9]{64}$/i.test(identifier);
  const hashedIdentifier = isHashed ? identifier.toLowerCase() : hashRateLimitIdentifier(identifier);
  const now = new Date();
  const windowExpiresAt = new Date(Date.now() + windowMs);

  try {
    return await prisma.$transaction(async (tx) => {
      let existing = await tx.loginAttempt.findUnique({
        where: { identifier: hashedIdentifier },
      });

      // If expired, reset the window atomically
      if (existing && now > existing.windowExpiresAt) {
        existing = await tx.loginAttempt.update({
          where: { identifier: hashedIdentifier },
          data: {
            attempts: 1,
            windowExpiresAt,
          },
        });
        return {
          allowed: true,
          remaining: limit - 1,
          resetTime: windowExpiresAt.getTime(),
        };
      }

      if (!existing) {
        try {
          await tx.loginAttempt.create({
            data: {
              identifier: hashedIdentifier,
              attempts: 1,
              windowExpiresAt,
            },
          });
          return {
            allowed: true,
            remaining: limit - 1,
            resetTime: windowExpiresAt.getTime(),
          };
        } catch (createErr: unknown) {
          const prismaErr = createErr as { code?: string; message?: string };
          // If concurrent request created the record, re-fetch and proceed to increment
          if (prismaErr?.code === "P2002" || prismaErr?.message?.includes("Unique constraint")) {
            existing = await tx.loginAttempt.findUnique({
              where: { identifier: hashedIdentifier },
            });
          } else {
            throw createErr;
          }
        }
      }

      if (existing && existing.attempts >= limit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: existing.windowExpiresAt.getTime(),
        };
      }

      const updated = await tx.loginAttempt.update({
        where: { identifier: hashedIdentifier },
        data: { attempts: { increment: 1 } },
      });

      return {
        allowed: updated.attempts <= limit,
        remaining: Math.max(0, limit - updated.attempts),
        resetTime: (existing || updated).windowExpiresAt.getTime(),
      };
    });
  } catch (err: unknown) {
    if (options?.isPrivileged || options?.failClosed) {
      console.error("[RATE_LIMIT] Database unavailable for privileged rate limit check:", err instanceof Error ? err.message : String(err));
      throw new Error("AUTH_DATABASE_UNAVAILABLE: Authentication service is temporarily unavailable for privileged accounts. Please try again later.");
    }
    // Fallback to memory limiter if DB is temporarily unreachable for unprivileged traffic
    return checkRateLimit(hashedIdentifier, limit, windowMs);
  }
}

/**
 * IP-based rate limiting helper for login and sensitive endpoints.
 * Throttles aggressive brute-force attacks across multiple accounts originating from the same IP.
 * Safely allows requests with absent/unverifiable IP to proceed to account-level rate limiting,
 * preventing collective denial-of-service on legitimate users without trusted IP headers.
 */
export async function checkIpRateLimit(
  clientIp: string | null | undefined,
  limit: number = 60,
  windowMs: number = 5 * 60 * 1000
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  if (!clientIp) {
    return {
      allowed: true,
      remaining: limit,
      resetTime: Date.now() + windowMs,
    };
  }
  const ipKey = `ip:${clientIp}`;
  return checkDatabaseRateLimit(ipKey, limit, windowMs);
}

/**
 * Resets the rate limit counter for an identifier upon successful authentication.
 * Deletes both the HMAC hash and legacy plaintext identifier to safely unlock legitimate users.
 */
export async function resetDatabaseRateLimit(rawIdentifier: string): Promise<void> {
  const isHashed = /^[a-f0-9]{64}$/i.test(rawIdentifier);
  const hashedIdentifier = isHashed ? rawIdentifier.toLowerCase() : hashRateLimitIdentifier(rawIdentifier);
  const targets = isHashed ? [hashedIdentifier] : [hashedIdentifier, rawIdentifier.trim().toLowerCase()];

  try {
    await prisma.loginAttempt.deleteMany({
      where: {
        identifier: { in: targets },
      },
    });
  } catch (err: unknown) {
    console.warn("[RATE_LIMIT] Failed to reset rate limit after successful login:", err instanceof Error ? err.message : String(err));
  }
}

/**
 * Prunes expired LoginAttempt rate limit records from PostgreSQL.
 * Strictly guarantees that active windows (windowExpiresAt >= now) are NEVER touched.
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  try {
    const res = await prisma.loginAttempt.deleteMany({
      where: {
        windowExpiresAt: { lt: new Date() },
      },
    });
    return res.count;
  } catch {
    return 0;
  }
}
