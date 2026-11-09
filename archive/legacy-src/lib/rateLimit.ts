interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const MAX_STORE_SIZE = 10000;
const rateLimitStore = new Map<string, RateLimitEntry>();

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
    return `${parts[0]}:${parts[1]}:****:****`;
  }
  return id.length > 4 ? `${id.slice(0, 3)}***` : "***";
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
  if (typeof (interval as any)?.unref === "function") {
    (interval as any).unref();
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
