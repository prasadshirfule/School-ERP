import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    // Database connectivity probe
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "healthy",
        app: "Vidyora",
        tagline: "Smarter Schools. Better Learning.",
        version: "1.0.0-phase1b",
        database: "connected",
        timestamp,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Database connection failed";
    console.error("[HEALTH_CHECK_ERROR]", error);
    return NextResponse.json(
      {
        status: "degraded",
        app: "Vidyora",
        database: "disconnected",
        error: "Database connectivity check failed",
        timestamp,
      },
      { status: 503 }
    );
  }
}
