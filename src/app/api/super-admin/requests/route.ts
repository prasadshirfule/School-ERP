import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSuperAdminSession, unauthorized } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const requests = await prisma.schoolRegistrationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error: unknown) {
    console.error("[SUPER_ADMIN] Error listing registration requests:", error);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}
