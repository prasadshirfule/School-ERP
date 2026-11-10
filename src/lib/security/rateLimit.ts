import { prisma } from "../database/prisma";

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  /**
   * Whether to fail closed (allowed: false) when the rate limiter backing store is unreachable.
   * Defaults to `true` for security-sensitive authentication and verification paths.
   */
  failClosed?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: Date;
  isBackendFailure?: boolean;
  error?: string;
}

/**
 * Serverless-compatible rate limiter backed by PostgreSQL.
 * Operates safely across multi-instance, serverless lambdas, and edge containers.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = config;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    const bucket = await prisma.rateLimitBucket.findUnique({
      where: { key },
    });

    if (!bucket || bucket.expiresAt < now) {
      // Create new or reset expired bucket
      const updated = await prisma.rateLimitBucket.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          expiresAt: resetAt,
        },
        update: {
          count: 1,
          expiresAt: resetAt,
        },
      });

      return {
        allowed: 1 <= limit,
        count: 1,
        remaining: Math.max(0, limit - 1),
        resetAt: updated.expiresAt,
      };
    }

    // Existing active bucket: increment count
    const updated = await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    const allowed = updated.count <= limit;
    return {
      allowed,
      count: updated.count,
      remaining: Math.max(0, limit - updated.count),
      resetAt: updated.expiresAt,
    };
  } catch (error) {
    // Log database failure safely without leaking credentials or query text
    console.error(`[RateLimiter] Backing store error evaluating key ${key}:`, error instanceof Error ? error.message : "Database error");
    const shouldFailClosed = config.failClosed ?? true;

    if (shouldFailClosed) {
      // Fail closed for security-critical endpoints to prevent brute-force attacks during database degradation
      return {
        allowed: false,
        count: limit + 1,
        remaining: 0,
        resetAt,
        isBackendFailure: true,
        error: "RATE_LIMITER_SERVICE_UNAVAILABLE",
      };
    }

    // For non-critical background operations explicitly configured with failClosed: false
    return {
      allowed: true,
      count: 1,
      remaining: 1,
      resetAt,
      isBackendFailure: true,
    };
  }
}

/**
 * Periodic or on-demand cleanup of expired rate limit buckets.
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await prisma.rateLimitBucket.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}
