import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { tenantClient } from "./tenant";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * Get the current session or return a 401 response.
 * Use in API route handlers.
 */
export async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return null;
  }
  return session;
}

/**
 * Get a tenant-scoped Prisma client from the current session.
 * Returns [db, session] or throws 401.
 */
export async function getTenantDb() {
  const session = await getRequiredSession();
  if (!session) {
    return null;
  }
  return {
    db: tenantClient(session.user.schoolId),
    session,
  };
}

/**
 * Standard 401 Unauthorized response
 */
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Standard 403 Forbidden response
 */
export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Standard 400 Bad Request response
 */
export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Format a Prisma Decimal for JSON serialization.
 * Returns a string to avoid floating-point precision loss.
 */
export function formatDecimal(value: Prisma.Decimal | null): string {
  if (value === null) return "0.00";
  return value.toFixed(2);
}

export { formatDate } from "./formatDate";
