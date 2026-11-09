import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters long").optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  PII_ENCRYPTION_KEY: z.string().min(32, "PII_ENCRYPTION_KEY must be at least 32 characters long").optional(),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const rawAuthSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  let rawNextAuthUrl = process.env.NEXTAUTH_URL;

  const isProd = process.env.NODE_ENV === "production";

  if (isProd && rawNextAuthUrl && (rawNextAuthUrl.includes("localhost") || rawNextAuthUrl.includes("127.0.0.1"))) {
    console.warn("[ENV] NEXTAUTH_URL points to localhost in production.");
    if (process.env.VERCEL_URL) {
      rawNextAuthUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      rawNextAuthUrl = undefined;
    }
  }

  const rawDbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: rawDbUrl,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED || process.env.NEON_DATABASE_URL_UNPOOLED,
    NEXTAUTH_SECRET: rawAuthSecret,
    NEXTAUTH_URL: rawNextAuthUrl,
    PII_ENCRYPTION_KEY: process.env.PII_ENCRYPTION_KEY,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || "local",
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    console.warn(`[ENV_VALIDATION_WARNING] Non-blocking schema warning: ${errorDetails}`);
  }

  cachedEnv = parsed.success
    ? parsed.data
    : {
        NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") || "development",
        DATABASE_URL: rawDbUrl || "",
        DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED || process.env.NEON_DATABASE_URL_UNPOOLED,
        NEXTAUTH_SECRET: rawAuthSecret,
        NEXTAUTH_URL: rawNextAuthUrl,
        PII_ENCRYPTION_KEY: process.env.PII_ENCRYPTION_KEY,
        STORAGE_PROVIDER: "local",
      };

  return cachedEnv;
}

export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET must be set in production");
    }
    return "vidyora_development_auth_secret_must_be_32_characters_minimum";
  }
  return secret;
}
