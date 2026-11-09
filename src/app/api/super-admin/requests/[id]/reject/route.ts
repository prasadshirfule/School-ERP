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
    return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Did not meet platform eligibility criteria";

    const regRequest = await prisma.schoolRegistrationRequest.findUnique({
      where: { id },
    });

    if (!regRequest) {
      return NextResponse.json({ error: "Registration request not found" }, { status: 404 });
    }

    const updated = await prisma.schoolRegistrationRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "SCHOOL_REJECTED",
      targetType: "SchoolRegistrationRequest",
      targetId: id,
      details: {
        schoolName: regRequest.schoolName,
        adminEmail: regRequest.adminEmail,
        reason,
      },
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error: unknown) {
    console.error("[SUPER_ADMIN] Error rejecting request:", error);
    return NextResponse.json({ error: "Failed to reject request" }, { status: 500 });
  }
}
