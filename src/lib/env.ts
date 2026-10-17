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
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters long").optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  PII_ENCRYPTION_KEY: z.string().min(32, "PII_ENCRYPTION_KEY must be at least 32 characters long").optional(),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    PII_ENCRYPTION_KEY: process.env.PII_ENCRYPTION_KEY,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  };

  const isProd = process.env.NODE_ENV === "production";
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_RUNTIME === "edge";

  if (isProd && !isBuildPhase) {
    // In live production server runtime, enforce strict requirements without fallbacks
    if (!rawEnv.NEXTAUTH_SECRET || rawEnv.NEXTAUTH_SECRET.length < 32) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: NEXTAUTH_SECRET is missing or less than 32 characters in production. " +
        "Generate a secure key with 'openssl rand -base64 32' and configure it in your deployment environment."
      );
    }
    if (FORBIDDEN_DEMO_SECRETS.has(rawEnv.NEXTAUTH_SECRET)) {
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

    if (!rawEnv.DATABASE_URL) {
      throw new Error("FATAL: DATABASE_URL is missing in production environment.");
    }
  } else if (isBuildPhase && isProd) {
    if (rawEnv.NEXTAUTH_SECRET && FORBIDDEN_DEMO_SECRETS.has(rawEnv.NEXTAUTH_SECRET)) {
      console.warn("⚠️ BUILD NOTICE: NEXTAUTH_SECRET matches a known demo string. Ensure your production deployment environment sets a private random key.");
    }
  }

  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success && isProd) {
    throw new Error(`Environment validation failed: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }

  cachedEnv = (parsed.success ? parsed.data : rawEnv) as EnvConfig;
  return cachedEnv;
}

/**
 * Returns the session-signing secret for NextAuth.
 * Never generates a dynamic random key per request (which would invalidate sessions across requests).
 */
export function getAuthSecret(): string {
  const env = validateEnv();
  if (env.NEXTAUTH_SECRET) {
    return env.NEXTAUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET is required in production");
  }

  // Development/Test fallback only
  return "dev_school_erp_local_development_auth_secret_32chars!";
}

/**
 * Returns the 32-byte PII encryption key.
 */
export function getPIIEncryptionKey(): string {
  const env = validateEnv();
  if (env.PII_ENCRYPTION_KEY) {
    return env.PII_ENCRYPTION_KEY;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("PII_ENCRYPTION_KEY is required in production");
  }

  // Development/Test fallback only
  return "dev_school_erp_local_pii_encryption_key_32chars!";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
