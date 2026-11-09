import { SecurityEventSeverity } from "@prisma/client";
import { prisma } from "../database/prisma";

export interface LogSecurityEventOptions {
  schoolId?: string | null;
  userId?: string | null;
  eventType: string;
  severity?: SecurityEventSeverity;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

// Keys that must NEVER be written to security logs
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "adminPassword",
  "adminPasswordHash",
  "token",
  "otp",
  "secret",
  "tokenHash",
]);

function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Persists an audited security event with strict sanitization of any credentials or tokens.
 */
export async function logSecurityEvent(options: LogSecurityEventOptions): Promise<void> {
  const {
    schoolId = null,
    userId = null,
    eventType,
    severity = SecurityEventSeverity.INFO,
    ipAddress = null,
    userAgent = null,
    metadata,
  } = options;

  try {
    const cleanMeta = sanitizeMetadata(metadata);
    await prisma.securityEvent.create({
      data: {
        schoolId,
        userId,
        eventType,
        severity,
        ipAddress,
        userAgent,
        metadata: cleanMeta ? (cleanMeta as object) : undefined,
      },
    });
  } catch (error) {
    console.error("[SecurityEvent] Failed to record security event:", error);
  }
}
