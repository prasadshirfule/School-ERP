import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";

export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("sectionId");
  const date = searchParams.get("date");

  if (!sectionId || !date) {
    return badRequest("sectionId and date are required");
  }

  const records = await ctx.db.attendance.findMany({
    where: {
      sectionId,
      date: new Date(date),
    },
    include: { student: true },
    orderBy: { student: { fullName: "asc" } },
  });

  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "TEACHER" && ctx.session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { sectionId, date, records } = body as {
    sectionId: string;
    date: string;
    records: { studentId: string; status: string }[];
  };

  if (!sectionId || !date || !records?.length) {
    return badRequest("sectionId, date, and records are required");
  }

  const dateObj = new Date(date);
  const results = [];

  for (const rec of records) {
    // Use upsert to respect @@unique([studentId, date]):
    // - If no record exists → creates with the tenant's schoolId
    // - If record exists for same tenant → updates status
    // - If record exists for different tenant → blocked by tenant.ts
    const attendance = await ctx.db.attendance.upsert({
      where: {
        studentId_date: {
          studentId: rec.studentId,
          date: dateObj,
        },
      },
      create: {
        studentId: rec.studentId,
        sectionId,
        date: dateObj,
        status: rec.status as any,
        markedBy: ctx.session.user.id,
      } as any,
      update: {
        status: rec.status as any,
        markedBy: ctx.session.user.id,
      },
    });
    results.push(attendance);
  }

  return NextResponse.json({
    message: `Attendance saved for ${results.length} students`,
    count: results.length,
  });
}
