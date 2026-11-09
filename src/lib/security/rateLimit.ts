import { prisma } from "../database/prisma";

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: Date;
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
    // If rate limiter experiences transient database issue, fail safe or log
    console.error(`[RateLimiter] Error evaluating key ${key}:`, error);
    // Return allowed with 1 remaining so critical user flows aren't broken by transient DB errors
    return {
      allowed: true,
      count: 1,
      remaining: 1,
      resetAt,
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
