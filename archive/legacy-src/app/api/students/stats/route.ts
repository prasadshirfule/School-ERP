import { NextResponse } from "next/server";
import { getTenantDb, unauthorized } from "@/lib/utils";

/**
 * GET /api/students/stats
 * Computes live attendance and student counts for today:
 * - totalStudents: count of active students (optionally scoped to sectionId)
 * - presentToday: count of active students marked PRESENT today
 * - absentToday: count of active students marked ABSENT today
 * - notMarkedToday: count of active students who have NO attendance record today
 *   (computed as total active students minus unique students marked today in any status)
 */
export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("sectionId");

  const todayStr = new Date().toISOString().split("T")[0];
  const todayDate = new Date(todayStr);

  const studentWhere: any = { isActive: true };
  if (sectionId === "unassigned") {
    studentWhere.sectionId = null;
  } else if (sectionId) {
    studentWhere.sectionId = sectionId;
  }

  // 1. Total active students in this school (or scoped to filtered section)
  const totalStudents = await ctx.db.student.count({
    where: studentWhere,
  });

  // 2. Fetch all attendance records for today for active students in this section/school
  const attendanceWhere: any = {
    date: todayDate,
    student: studentWhere,
  };
  if (sectionId && sectionId !== "unassigned") {
    attendanceWhere.sectionId = sectionId;
  }

  const todayAttendance = await ctx.db.attendance.findMany({
    where: attendanceWhere,
    select: {
      studentId: true,
      status: true,
    },
  });

  let presentToday = 0;
  let absentToday = 0;
  const markedStudentIds = new Set<string>();

  for (const record of todayAttendance) {
    markedStudentIds.add(record.studentId);
    if (record.status === "PRESENT") {
      presentToday++;
    } else if (record.status === "ABSENT") {
      absentToday++;
    }
  }

  // Not Marked Yet = total active students minus all students who have any attendance record today
  const notMarkedToday = Math.max(0, totalStudents - markedStudentIds.size);

  return NextResponse.json({
    totalStudents,
    presentToday,
    absentToday,
    notMarkedToday,
  });
}

