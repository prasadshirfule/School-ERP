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
    const school = await prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const updated = await prisma.school.update({
      where: { id },
      data: {
        status: "APPROVED",
        isActive: true,
        suspendedReason: null,
      },
    });

    await logAuditEvent({
      schoolId: id,
      userId: session.user.id,
      userEmail: session.user.email,
      action: "SCHOOL_REINSTATED",
      targetType: "School",
      targetId: id,
      details: {
        schoolName: school.name,
        reason: "Reactivated by Super Admin",
      },
    });

    return NextResponse.json({
      success: true,
      message: `${school.name} has been successfully reactivated.`,
      school: updated,
    });
  } catch (error: unknown) {
    console.error("[SUPER_ADMIN] Error reactivating school:", error);
    return NextResponse.json({ error: "Failed to reactivate school" }, { status: 500 });
  }
}
