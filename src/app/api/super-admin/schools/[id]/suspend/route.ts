import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSuperAdminSession, unauthorized } from "@/lib/utils";
import { logAuditEvent } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdminSession();
  if (!session) {
    return unauthorized();
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "School ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "SUSPEND"; // "SUSPEND" or "REINSTATE"
    const reason = body.reason || "Administrative review";

    const school = await prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const isSuspending = action === "SUSPEND";

    const updated = await prisma.school.update({
      where: { id },
      data: {
        status: isSuspending ? "SUSPENDED" : "APPROVED",
        isActive: !isSuspending,
        suspendedReason: isSuspending ? reason : null,
      },
    });

    await logAuditEvent({
      schoolId: id,
      userId: session.user.id,
      userEmail: session.user.email,
      action: isSuspending ? "SCHOOL_SUSPENDED" : "SCHOOL_REINSTATED",
      targetType: "School",
      targetId: id,
      details: {
        schoolName: school.name,
        reason: isSuspending ? reason : "Reinstated by Super Admin",
      },
    });

    return NextResponse.json({
      success: true,
      school: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        isActive: updated.isActive,
        suspendedReason: updated.suspendedReason,
      },
    });
  } catch (error: unknown) {
    console.error("[SUPER_ADMIN] Error toggling school suspension:", error);
    return NextResponse.json({ error: "Failed to update school status" }, { status: 500 });
  }
}
