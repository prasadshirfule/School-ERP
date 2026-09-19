import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";

const VALID_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * GET /api/timetable?sectionId=X&academicYear=Y
 * Returns all timetable slots for a section.
 */
export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("sectionId") || "";
  const academicYear = searchParams.get("academicYear") || "2026-27";

  if (!sectionId) return badRequest("sectionId is required");

  const slots = await ctx.db.timetableSlot.findMany({
    where: { sectionId, academicYear },
    include: {
      period: true,
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, fullName: true } },
    },
    orderBy: [{ period: { periodNumber: "asc" } }],
  });

  return NextResponse.json(slots);
}

/**
 * POST /api/timetable
 * Assign or update a timetable slot (upsert by unique constraint).
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const sectionId = typeof body.sectionId === "string" ? body.sectionId.trim() : "";
  const dayOfWeek = typeof body.dayOfWeek === "string" ? body.dayOfWeek.trim().toUpperCase() : "";
  const periodId = typeof body.periodId === "string" ? body.periodId.trim() : "";
  const subjectId = typeof body.subjectId === "string" && body.subjectId.trim() ? body.subjectId.trim() : null;
  const teacherId = typeof body.teacherId === "string" && body.teacherId.trim() ? body.teacherId.trim() : null;
  const academicYear = typeof body.academicYear === "string" ? body.academicYear.trim() : "2026-27";

  if (!sectionId) return badRequest("sectionId is required");
  if (!VALID_DAYS.includes(dayOfWeek)) return badRequest("Invalid dayOfWeek. Use MON-SAT");
  if (!periodId) return badRequest("periodId is required");

  // Verify period exists and is not a break
  const period = await ctx.db.period.findUnique({ where: { id: periodId } });
  if (!period) return badRequest("Period not found");
  if (period.isBreak) return badRequest("Cannot assign subjects to break periods");

  const slot = await ctx.db.timetableSlot.upsert({
    where: {
      sectionId_dayOfWeek_periodId_academicYear: {
        sectionId,
        dayOfWeek,
        periodId,
        academicYear,
      },
    },
    create: {
      sectionId,
      dayOfWeek,
      periodId,
      subjectId,
      teacherId,
      academicYear,
    } as any,
    update: {
      subjectId,
      teacherId,
    },
    include: {
      period: true,
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(slot);
}

/**
 * DELETE /api/timetable?id=X
 * Remove a timetable slot assignment.
 */
export async function DELETE(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  if (!id) return badRequest("Slot ID is required");

  const existing = await ctx.db.timetableSlot.findUnique({ where: { id } });
  if (!existing) return badRequest("Timetable slot not found");

  await ctx.db.timetableSlot.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
