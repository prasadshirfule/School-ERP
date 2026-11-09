import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSuperAdminSession, unauthorized } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

  try {
    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    console.error("[SUPER_ADMIN] Error listing audit logs:", error);
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}
