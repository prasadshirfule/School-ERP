import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { unauthorized, forbidden } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.schoolId) {
      return unauthorized();
    }

    if (!["ADMIN", "PRINCIPAL", "SUPER_ADMIN"].includes(session.user.role)) {
      return forbidden();
    }

    const { schoolId } = session.user;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Link request ID is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Information provided does not match student admission records.";

    const linkRequest = await prisma.parentStudentLinkRequest.findFirst({
      where: { id, schoolId },
      include: {
        parent: { include: { user: true } },
        student: true,
      },
    });

    if (!linkRequest) {
      return NextResponse.json({ error: "Link request not found" }, { status: 404 });
    }

    const updated = await prisma.parentStudentLinkRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // Notify parent
    if (linkRequest.parent?.userId) {
      await prisma.notification.create({
        data: {
          schoolId,
          userId: linkRequest.parent.userId,
          title: "Student Link Request Rejected",
          message: `Your request to link with admission no ${linkRequest.student?.admissionNo || ""} was not approved: ${reason}`,
          type: "SYSTEM",
          linkUrl: "/parent/students",
        },
      });
    }

    await logAuditEvent({
      schoolId,
      userId: session.user.id,
      userEmail: session.user.email,
      action: "PARENT_LINK_REJECTED",
      targetType: "ParentStudentLinkRequest",
      targetId: id,
      details: {
        admissionNo: linkRequest.student?.admissionNo,
        reason,
        parentId: linkRequest.parentId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Student link request rejected.",
      request: updated,
    });
  } catch (error: unknown) {
    console.error("[ADMIN_REJECT_LINK] Error rejecting link request:", error);
    return NextResponse.json(
      { error: "Failed to reject student link request" },
      { status: 500 }
    );
  }
}
