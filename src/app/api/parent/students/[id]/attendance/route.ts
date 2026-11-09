import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { unauthorized } from "@/lib/utils";
import { tenantClient } from "@/lib/tenant";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "PARENT") return unauthorized();

  const { id: studentId } = await params;
  if (!studentId) {
    return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
  }

  // Find verified parent profile linked to this user and student
  const verifiedLink = await prisma.studentParent.findFirst({
    where: {
      studentId,
      parent: {
        userId: session.user.id,
      },
    },
    include: {
      student: { select: { schoolId: true, isActive: true } },
      parent: {
        include: {
          school: { select: { id: true, isActive: true, status: true } },
        },
      },
    },
  });

  if (!verifiedLink || !verifiedLink.parent?.school) {
    return NextResponse.json({ error: "Student not found or access denied" }, { status: 404 });
  }

  // Immediate suspension check on the student's school
  if (!verifiedLink.parent.school.isActive || verifiedLink.parent.school.status === "SUSPENDED") {
    return NextResponse.json(
      { error: "Access suspended for this school institution" },
      { status: 403 }
    );
  }

  // Tenant-scoped database query using the verified student's schoolId
  const db = tenantClient(verifiedLink.parent.schoolId);
  const attendance = await db.attendance.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
    take: 90, // last ~3 months
  });

  return NextResponse.json(attendance);
}
