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

    if (linkRequest.status === "APPROVED") {
      return NextResponse.json({ error: "Link request is already approved" }, { status: 400 });
    }

    const targetStudentId = linkRequest.studentId || "";
    if (!targetStudentId) {
      return NextResponse.json({ error: "No matching student identified for this request" }, { status: 400 });
    }

    // Approve inside transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark request approved
      const updated = await tx.parentStudentLinkRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedByUserId: session.user.id,
          reviewedAt: new Date(),
        },
      });

      // 2. Create or upsert StudentParent association
      const link = await tx.studentParent.upsert({
        where: {
          studentId_parentId: {
            studentId: targetStudentId,
            parentId: linkRequest.parentId,
          },
        },
        update: {
          relationship: linkRequest.relationship || "Parent",
        },
        create: {
          studentId: targetStudentId,
          parentId: linkRequest.parentId,
          relationship: linkRequest.relationship || "Parent",
          isPrimary: false,
        },
      });

      // 3. Emit in-app notification to the parent
      if (linkRequest.parent?.userId) {
        await tx.notification.create({
          data: {
            schoolId,
            userId: linkRequest.parent.userId,
            title: "Student Link Approved",
            message: `Your request to link with student ${linkRequest.student?.fullName || "your child"} has been approved by the school office.`,
            type: "APPROVAL",
            linkUrl: "/parent/students",
          },
        });
      }

      return { updated, link };
    });

    await logAuditEvent({
      schoolId,
      userId: session.user.id,
      userEmail: session.user.email,
      action: "PARENT_LINK_APPROVED",
      targetType: "ParentStudentLinkRequest",
      targetId: id,
      details: {
        studentId: targetStudentId,
        studentName: linkRequest.student?.fullName,
        parentId: linkRequest.parentId,
        parentName: linkRequest.parent.fullName,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully approved student link for ${linkRequest.student?.fullName || "student"}.`,
      request: result.updated,
    });
  } catch (error: unknown) {
    console.error("[ADMIN_APPROVE_LINK] Error approving link request:", error);
    return NextResponse.json(
      { error: "Failed to approve student link request" },
      { status: 500 }
    );
  }
}
