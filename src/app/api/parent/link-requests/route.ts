import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { unauthorized } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "PARENT") {
      return unauthorized();
    }

    // Find all parent profiles belonging to this user
    const parents = await prisma.parent.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const parentIds = parents.map((p) => p.id);

    const requests = await prisma.parentStudentLinkRequest.findMany({
      where: {
        parentId: { in: parentIds },
      },
      include: {
        school: { select: { id: true, name: true } },
        student: { select: { id: true, fullName: true, admissionNo: true } },
      },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error: unknown) {
    console.error("[PARENT_LINK_REQUESTS] Error fetching requests:", error);
    return NextResponse.json(
      { error: "Failed to retrieve student link requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "PARENT") {
      return unauthorized();
    }

    const body = await request.json();
    const { schoolId, admissionNo, studentDob, relationship = "Parent", notes } = body;

    if (!schoolId || !admissionNo) {
      return NextResponse.json(
        { error: "School and student admission number are required" },
        { status: 400 }
      );
    }

    const cleanSchoolId = schoolId.trim();
    const cleanAdmissionNo = admissionNo.trim();

    // Verify school
    const school = await prisma.school.findUnique({
      where: { id: cleanSchoolId },
    });

    if (!school || !school.isActive) {
      return NextResponse.json(
        { error: "Target school not found or is currently inactive" },
        { status: 404 }
      );
    }

    // Find student in school
    const student = await prisma.student.findFirst({
      where: {
        schoolId: cleanSchoolId,
        admissionNo: cleanAdmissionNo,
        isActive: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "No active student found matching this admission number in the selected school" },
        { status: 404 }
      );
    }

    // Ensure Parent record exists for this user in this school
    let parent = await prisma.parent.findFirst({
      where: {
        schoolId: cleanSchoolId,
        userId: session.user.id,
      },
    });

    if (!parent) {
      parent = await prisma.parent.create({
        data: {
          schoolId: cleanSchoolId,
          userId: session.user.id,
          fullName: session.user.name || "Parent",
          email: session.user.email,
          phone: (session.user as { phone?: string }).phone || "",
        },
      });
    }

    // Check if already linked
    const existingLink = await prisma.studentParent.findUnique({
      where: {
        studentId_parentId: {
          studentId: student.id,
          parentId: parent.id,
        },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "This student is already linked to your parent account" },
        { status: 409 }
      );
    }

    // Check if pending request exists
    const existingRequest = await prisma.parentStudentLinkRequest.findFirst({
      where: {
        parentId: parent.id,
        schoolId: cleanSchoolId,
        studentId: student.id,
        status: "PENDING",
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "A link request for this student is already pending school administrator review" },
        { status: 409 }
      );
    }

    const linkRequest = await prisma.parentStudentLinkRequest.create({
      data: {
        parentId: parent.id,
        schoolId: cleanSchoolId,
        studentId: student.id,
        relationship: relationship || "GUARDIAN",
        proofDocumentUrl: notes || null,
        status: "PENDING",
      },
      include: {
        student: { select: { fullName: true } },
      },
    });

    // Notify School Administrators
    const schoolAdmins = await prisma.user.findMany({
      where: {
        schoolId: cleanSchoolId,
        role: { in: ["ADMIN", "PRINCIPAL"] },
        isActive: true,
      },
      select: { id: true },
    });

    if (schoolAdmins.length > 0) {
      await prisma.notification.createMany({
        data: schoolAdmins.map((admin) => ({
          schoolId: cleanSchoolId,
          userId: admin.id,
          title: "New Student Link Request",
          message: `${session.user.name || "A parent"} requested to link with student ${student.fullName} (Adm: ${cleanAdmissionNo}).`,
          type: "REGISTRATION",
          linkUrl: "/admin/parent-links",
        })),
      });
    }

    await logAuditEvent({
      schoolId: cleanSchoolId,
      userId: session.user.id,
      userEmail: session.user.email,
      action: "PARENT_LINK_REQUEST_SUBMITTED",
      targetType: "ParentStudentLinkRequest",
      targetId: linkRequest.id,
      details: {
        admissionNo: cleanAdmissionNo,
        studentId: student.id,
        studentName: student.fullName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Student link request submitted successfully. School office will review and approve.",
      request: linkRequest,
    });
  } catch (error: unknown) {
    console.error("[PARENT_LINK_REQUESTS] Error submitting link request:", error);
    return NextResponse.json(
      { error: "Failed to submit student link request" },
      { status: 500 }
    );
  }
}
