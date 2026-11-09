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
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "GRADUATED"; // GRADUATED, WITHDRAWN, TRANSFERRED, OTHER

    // Ensure student exists and belongs to this school
    const student = await prisma.student.findFirst({
      where: { id, schoolId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found in your school" }, { status: 404 });
    }

    if (!student.isActive && student.archivedAt) {
      return NextResponse.json({ error: "Student is already archived" }, { status: 400 });
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedReason: reason,
        archivedByUserId: session.user.id,
      },
    });

    await logAuditEvent({
      schoolId,
      userId: session.user.id,
      userEmail: session.user.email,
      action: "STUDENT_ARCHIVED",
      targetType: "Student",
      targetId: id,
      details: {
        studentName: student.fullName,
        admissionNo: student.admissionNo,
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Student "${student.fullName}" has been successfully archived. All historical academic records are retained.`,
      student: updated,
    });
  } catch (error: unknown) {
    console.error("[STUDENT_ARCHIVE] Error archiving student:", error);
    return NextResponse.json(
      { error: "Failed to archive student record" },
      { status: 500 }
    );
  }
}
