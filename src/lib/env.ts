import { z } from "zod";

/**
 * List of known public fallback/demo secrets that must NEVER be used in production.
 */
const FORBIDDEN_DEMO_SECRETS = new Set([
  "school_erp_production_secret_key_min32chars!!",
  "change-this-to-a-super-secret-key-in-production-min-32-chars",
  "change-me-to-a-random-secret-in-production",
  "school_erp_default_pii_key_32bytes!!",
  "school_erp_secure_pii_encryption_key_32chars!",
  "password123",
  "secret",
]);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEON_DATABASE_URL: z.string().min(1, "NEON_DATABASE_URL is required"),
  NEON_DATABASE_URL_UNPOOLED: z.string().min(1, "NEON_DATABASE_URL_UNPOOLED is required"),
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters long").optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  PII_ENCRYPTION_KEY: z.string().min(32, "PII_ENCRYPTION_KEY must be at least 32 characters long").optional(),
  RATE_LIMIT_HMAC_SECRET: z.string().min(32, "RATE_LIMIT_HMAC_SECRET must be at least 32 characters long").optional(),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const rawAuthSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  let rawNextAuthUrl = process.env.NEXTAUTH_URL;

  const isProd = process.env.NODE_ENV === "production";
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_RUNTIME === "edge";

  // Prevent local development URL leaking into production deployments
  if (isProd && rawNextAuthUrl && (rawNextAuthUrl.includes("localhost") || rawNextAuthUrl.includes("127.0.0.1"))) {
    console.warn("[ENV] NEXTAUTH_URL points to localhost in production. Sanitizing to use VERCEL_URL or dynamic request host.");
    if (process.env.VERCEL_URL) {
      rawNextAuthUrl = `https://${process.env.VERCEL_URL}`;
      process.env.NEXTAUTH_URL = rawNextAuthUrl;
    } else {
      rawNextAuthUrl = undefined;
      delete process.env.NEXTAUTH_URL;
    }
  }

  const rawNeonDbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  const rawNeonUnpooledUrl = process.env.NEON_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL_UNPOOLED;

  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEON_DATABASE_URL: rawNeonDbUrl,
    NEON_DATABASE_URL_UNPOOLED: rawNeonUnpooledUrl,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    NEXTAUTH_SECRET: rawAuthSecret,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: rawNextAuthUrl,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    PII_ENCRYPTION_KEY: process.env.PII_ENCRYPTION_KEY,
    RATE_LIMIT_HMAC_SECRET: process.env.RATE_LIMIT_HMAC_SECRET,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  };

  if (isProd && !isBuildPhase) {
    // In live production server runtime, enforce strict requirements without fallbacks
    if (!rawAuthSecret || rawAuthSecret.length < 32) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: NEXTAUTH_SECRET (or AUTH_SECRET) is missing or less than 32 characters in production. " +
        "Generate a secure key with 'openssl rand -base64 32' and configure it in your deployment environment."
      );
    }
    if (FORBIDDEN_DEMO_SECRETS.has(rawAuthSecret)) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: NEXTAUTH_SECRET is set to an insecure demo fallback string. " +
        "You must generate a private, unique 32+ character key for production."
      );
    }

    if (!rawEnv.PII_ENCRYPTION_KEY || rawEnv.PII_ENCRYPTION_KEY.length < 32) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: PII_ENCRYPTION_KEY is missing or less than 32 characters in production. " +
        "Configure a 32-byte secret key in your environment variables to secure student records."
      );
    }
    if (FORBIDDEN_DEMO_SECRETS.has(rawEnv.PII_ENCRYPTION_KEY)) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: PII_ENCRYPTION_KEY is set to a public demo key. " +
        "Configure a private, unique 32+ character key for production."
      );
    }

    if (!rawEnv.NEON_DATABASE_URL) {
      throw new Error("FATAL: NEON_DATABASE_URL is missing in production environment.");
    }
    if (!rawEnv.NEON_DATABASE_URL_UNPOOLED) {
      throw new Error("FATAL: NEON_DATABASE_URL_UNPOOLED is missing in production environment.");
    }

    if (!process.env.RATE_LIMIT_HMAC_SECRET || process.env.RATE_LIMIT_HMAC_SECRET.trim().length < 32) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: Dedicated RATE_LIMIT_HMAC_SECRET is missing or less than 32 characters in production. " +
        "Generate a private key with 'openssl rand -hex 32' and configure it in your deployment environment. " +
        "Falling back to AUTH_SECRET in production is strictly prohibited."
      );
    }
    if (FORBIDDEN_DEMO_SECRETS.has(process.env.RATE_LIMIT_HMAC_SECRET)) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: RATE_LIMIT_HMAC_SECRET is set to an insecure demo fallback string. " +
        "Configure a private, unique 32+ character key for production."
      );
    }
  } else if (isBuildPhase && isProd) {
    if (rawAuthSecret && FORBIDDEN_DEMO_SECRETS.has(rawAuthSecret)) {
      console.warn("⚠️ BUILD NOTICE: NEXTAUTH_SECRET matches a known demo string. Ensure your production deployment environment sets a private random key.");
    }
  }

  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success && isProd && !isBuildPhase) {
    throw new Error(`Environment validation failed: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }

  cachedEnv = (parsed.success ? parsed.data : rawEnv) as EnvConfig;
  return cachedEnv;
}

/**
 * Returns the session-signing secret for NextAuth.
 * Never generates a dynamic random key per request (which would invalidate sessions across requests).
 * Throws clearly if missing in production; uses development fallback only in non-production.
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  const isProd = process.env.NODE_ENV === "production";
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";

  if (secret && secret.trim().length > 0) {
    if (isProd && !isBuildPhase && FORBIDDEN_DEMO_SECRETS.has(secret)) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: NEXTAUTH_SECRET is set to an insecure demo fallback string. " +
        "You must generate a private, unique 32+ character key for production."
      );
    }
    if (isProd && !isBuildPhase && secret.length < 32) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: NEXTAUTH_SECRET must be at least 32 characters long in production."
      );
    }
    return secret;
  }

  if (isProd && !isBuildPhase) {
    throw new Error(
      "FATAL SECURITY CONFIGURATION: NEXTAUTH_SECRET (or AUTH_SECRET) is missing in production environment. " +
      "Configure NEXTAUTH_SECRET in your Vercel project environment variables."
    );
  }

  if (isBuildPhase && isProd) {
    return "build_time_placeholder_secret_min_32_characters_long!";
  }

  // Development/Test fallback only
  return "dev_school_erp_local_development_auth_secret_32chars!";
}

/**
 * Returns the 32-byte PII encryption key.
 */
export function getPIIEncryptionKey(): string {
  const key = process.env.PII_ENCRYPTION_KEY;
  const isProd = process.env.NODE_ENV === "production";
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";

  if (key && key.trim().length > 0) {
    if (isProd && !isBuildPhase && FORBIDDEN_DEMO_SECRETS.has(key)) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: PII_ENCRYPTION_KEY is set to a public demo key. " +
        "Configure a private, unique 32+ character key for production."
      );
    }
    if (isProd && !isBuildPhase && key.length < 32) {
      throw new Error("FATAL SECURITY CONFIGURATION: PII_ENCRYPTION_KEY must be at least 32 characters long in production.");
    }
    return key;
  }

  if (isProd && !isBuildPhase) {
    throw new Error("PII_ENCRYPTION_KEY is required in production");
  }

  if (isBuildPhase && isProd) {
    return "build_time_placeholder_pii_key_min_32_chars_long!";
  }

  // Development/Test fallback only
  return "dev_school_erp_local_pii_encryption_key_32chars!";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Returns the dedicated 32+ character HMAC secret for rate-limiting identifier privacy.
 * In production, strictly requires RATE_LIMIT_HMAC_SECRET and prohibits falling back to AUTH_SECRET.
 */
export function getRateLimitHmacSecret(): string {
  const secret = process.env.RATE_LIMIT_HMAC_SECRET;
  const isProd = process.env.NODE_ENV === "production";
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";

  if (secret && secret.trim().length >= 32) {
    if (isProd && !isBuildPhase && FORBIDDEN_DEMO_SECRETS.has(secret)) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: RATE_LIMIT_HMAC_SECRET is set to an insecure demo fallback string. " +
        "Configure a private, unique 32+ character key for production."
      );
    }
    return secret;
  }

  if (isProd && !isBuildPhase) {
    throw new Error(
      "FATAL SECURITY CONFIGURATION: Dedicated RATE_LIMIT_HMAC_SECRET is missing or less than 32 characters in production. " +
      "Configure RATE_LIMIT_HMAC_SECRET in your Vercel project environment variables (generate with 'openssl rand -hex 32'). " +
      "Falling back to AUTH_SECRET in production is strictly prohibited."
    );
  }

  if (isBuildPhase && isProd) {
    return "build_time_placeholder_rate_limit_hmac_secret_32chars!";
  }

  // Safe development/test fallback only:
  return secret || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-rate-limit-hmac-salt-minimum-32-chars-long!";
}
