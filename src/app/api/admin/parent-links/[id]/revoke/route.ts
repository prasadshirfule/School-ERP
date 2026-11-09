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
    const reason = body.reason || "Administrative revocation of parent guardian access.";

    const linkRequest = await prisma.parentStudentLinkRequest.findFirst({
      where: { id, schoolId },
      include: {
        parent: { include: { user: true } },
        student: true,
      },
    });

    if (!linkRequest) {
      return NextResponse.json({ error: "Link record not found" }, { status: 404 });
    }

    // 1. Transactionally remove the StudentParent relationship and update request status
    await prisma.$transaction(async (tx) => {
      await tx.studentParent.deleteMany({
        where: {
          studentId: linkRequest.studentId,
          parentId: linkRequest.parentId,
        },
      });

      await tx.parentStudentLinkRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: `Revoked: ${reason}`,
          reviewedByUserId: session.user.id,
          reviewedAt: new Date(),
        },
      });

      // 2. Notify the parent user
      if (linkRequest.parent?.userId) {
        await tx.notification.create({
          data: {
            schoolId,
            userId: linkRequest.parent.userId,
            title: "Student Guardian Access Revoked",
            message: `Guardian access for student ${linkRequest.student?.fullName || "your child"} (Adm: ${linkRequest.student?.admissionNo || ""}) has been revoked by school administration: ${reason}`,
            type: "SYSTEM",
            linkUrl: "/parent/students",
          },
        });
      }
    });

    // 3. Security Audit Log
    await logAuditEvent({
      schoolId,
      userId: session.user.id,
      userEmail: session.user.email,
      action: "PARENT_LINK_REVOKED",
      targetType: "StudentParent",
      targetId: `${linkRequest.studentId}_${linkRequest.parentId}`,
      details: {
        studentId: linkRequest.studentId,
        studentName: linkRequest.student?.fullName,
        parentId: linkRequest.parentId,
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Parent-student access link has been revoked.",
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to revoke parent link";
    console.error("[ADMIN_REVOKE_PARENT_LINK] Error:", error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
