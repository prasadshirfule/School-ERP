import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized } from "@/lib/utils";
import { tenantClient } from "@/lib/tenant";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const { id: studentId } = await params;

  // Verify parent has access to this student
  const parent = await prisma.parent.findUnique({
    where: { userId: session.user.id },
    include: { students: true },
  });

  if (!parent || !parent.students.some((sp) => sp.studentId === studentId)) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const db = tenantClient(session.user.schoolId);

  const attendance = await db.attendance.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
    take: 90, // last ~3 months
  });

  return NextResponse.json(attendance);
}
