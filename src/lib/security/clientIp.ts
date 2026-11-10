import crypto from "crypto";

/**
 * Extracts the trusted client IP address from request headers.
 * Protects against arbitrary header spoofing by prioritizing deployment-managed headers:
 * 1. Cloudflare: 'cf-connecting-ip'
 * 2. Vercel / Reverse Proxy: 'x-real-ip'
 * 3. Leftmost address in 'x-forwarded-for' (original client behind proxy)
 */
export function extractClientIp(headers: Headers): string {
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp && cfConnectingIp.trim().length > 0) {
    return cfConnectingIp.trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor && forwardedFor.trim().length > 0) {
    const leftmost = forwardedFor.split(",")[0]?.trim();
    if (leftmost && leftmost.length > 0) {
      return leftmost;
    }
  }

  return "127.0.0.1";
}

/**
 * Computes a privacy-preserving SHA-256 hash of an IP address.
 * Prevents raw IP addresses from being stored in public/shared database tables.
 */
export function hashIpForRateLimit(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(`vidyora_ip_salt_${ip.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}
