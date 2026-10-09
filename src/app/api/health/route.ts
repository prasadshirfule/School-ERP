import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "healthy";
  let dbLatency = 0;

  try {
    const pingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - pingStart;
  } catch (error: any) {
    dbStatus = "unhealthy";
  }

  const memoryUsage = process.memoryUsage();

  return NextResponse.json(
    {
      status: dbStatus === "healthy" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      memory: {
        heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMb: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
        rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
      },
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      responseTimeMs: Date.now() - startTime,
    },
    { status: dbStatus === "healthy" ? 200 : 503 }
  );
}
