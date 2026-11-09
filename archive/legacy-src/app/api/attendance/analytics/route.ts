import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";

/**
 * GET /api/attendance/analytics?sectionId=...&date=...&academicYear=...
 * Computes section-wise attendance analytics, monthly percentages, and absentee alert roster
 */
export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("sectionId");
  const dateStr = searchParams.get("date");
  const academicYear = searchParams.get("academicYear") || "2026-27";

  if (!sectionId) {
    return badRequest("sectionId is required");
  }

  // Target date for daily absentee alert
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const dateOnly = new Date(targetDate.toISOString().slice(0, 10));

  // Fetch section info with class
  const section = await ctx.db.section.findUnique({
    where: { id: sectionId },
    include: { class: true },
  });

  if (!section) {
    return badRequest("Section not found");
  }

  // Fetch all active students in section
  const students = await ctx.db.student.findMany({
    where: { sectionId, isActive: true },
    select: {
      id: true,
      admissionNo: true,
      rollNumber: true,
      fullName: true,
      fatherName: true,
      fatherPhone: true,
      motherPhone: true,
      emergencyContactPhone: true,
    },
    orderBy: { rollNumber: "asc" },
  });

  // Fetch attendance records for this section in the academic year
  const allRecords = await ctx.db.attendance.findMany({
    where: { sectionId },
    orderBy: { date: "desc" },
  });

  // Distinct recorded dates (working days)
  const distinctDates = Array.from(new Set(allRecords.map((r: any) => new Date(r.date).toISOString().slice(0, 10))));
  const totalWorkingDays = distinctDates.length;

  // Student-wise metrics
  const studentMetrics = students.map((s: any) => {
    const sRecords = allRecords.filter((r: any) => r.studentId === s.id);
    const presentDays = sRecords.filter((r: any) => r.status === "PRESENT" || r.status === "LATE").length;
    const absentDays = sRecords.filter((r: any) => r.status === "ABSENT").length;
    const leaveDays = sRecords.filter((r: any) => r.status === "LEAVE" || r.status === "HALF_DAY").length;
    const pct = totalWorkingDays > 0 ? ((presentDays / totalWorkingDays) * 100).toFixed(1) : "0.0";

    return {
      studentId: s.id,
      admissionNo: s.admissionNo,
      rollNumber: s.rollNumber || "—",
      fullName: s.fullName,
      totalRecordedDays: sRecords.length,
      presentDays,
      absentDays,
      leaveDays,
      attendancePercentage: pct,
    };
  });

  // Today's records & absentees for SMS/WhatsApp alert roster
  const todayRecords = allRecords.filter(
    (r: any) => new Date(r.date).toISOString().slice(0, 10) === dateOnly.toISOString().slice(0, 10)
  );

  const absenteeList = students
    .filter((s: any) => {
      const rec = todayRecords.find((r: any) => r.studentId === s.id);
      return rec && rec.status === "ABSENT";
    })
    .map((s: any) => ({
      studentId: s.id,
      fullName: s.fullName,
      rollNumber: s.rollNumber,
      parentPhone: s.fatherPhone || s.motherPhone || s.emergencyContactPhone || null,
      parentName: s.fatherName || "Parent",
      messageTemplate: `Dear Parent, your ward ${s.fullName} (${section.class.name}-${section.name}) is marked ABSENT today (${dateOnly.toLocaleDateString("en-IN")}). Please contact the school office if this is an error.`,
    }));

  const overallSectionPct =
    studentMetrics.length > 0
      ? (
          studentMetrics.reduce((acc: number, sm: any) => acc + parseFloat(sm.attendancePercentage), 0) /
          studentMetrics.length
        ).toFixed(1)
      : "0.0";

  return NextResponse.json({
    section: {
      id: section.id,
      name: section.name,
      className: section.class.name,
      academicYear,
    },
    totalStudents: students.length,
    totalWorkingDays,
    overallSectionAttendancePct: overallSectionPct,
    todaySummary: {
      date: dateOnly,
      markedCount: todayRecords.length,
      presentCount: todayRecords.filter((r: any) => r.status === "PRESENT" || r.status === "LATE").length,
      absentCount: todayRecords.filter((r: any) => r.status === "ABSENT").length,
    },
    absenteesForAlerts: absenteeList,
    studentMetrics,
  });
}
