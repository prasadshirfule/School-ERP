/**
 * Application URL and Redirect Sanitization Utility
 *
 * Enforces strict relative-path redirect boundaries to prevent Open Redirect vulnerabilities.
 * Safely usable in both Client and Server environments.
 */

export function sanitizeCallbackUrl(
  callbackUrl: string | null | undefined,
  fallbackUrl: string
): string {
  if (!callbackUrl || typeof callbackUrl !== "string") {
    return fallbackUrl;
  }

  const trimmed = callbackUrl.trim();

  // Reject empty strings or strings with control characters
  if (!trimmed || /[\x00-\x1F\x7F]/.test(trimmed)) {
    return fallbackUrl;
  }

  // Reject protocol-relative URLs (e.g., "//evil.com") and backslash-prefixed paths (e.g., "/\\evil.com", "\\evil.com")
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.startsWith("\\")) {
    return fallbackUrl;
  }

  // Must start with a single forward slash
  if (!trimmed.startsWith("/")) {
    return fallbackUrl;
  }

  // Reject authentication loop targets
  if (trimmed === "/login" || trimmed.startsWith("/login?") || trimmed.startsWith("/login/")) {
    return fallbackUrl;
  }

  try {
    const dummyBase = "https://school-erp.local";
    const resolved = new URL(trimmed, dummyBase);

    // Verify origin matches base exactly (prevents protocol-relative and scheme hopping)
    if (resolved.origin !== dummyBase) {
      return fallbackUrl;
    }

    if (!resolved.pathname.startsWith("/") || resolved.pathname.startsWith("//")) {
      return fallbackUrl;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallbackUrl;
  }
}
