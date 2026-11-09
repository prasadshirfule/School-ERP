import { NextResponse } from "next/server";
import { getTenantDb, unauthorized } from "@/lib/utils";

/**
 * GET /api/timetable/teacher
 * Returns the logged-in teacher's personal timetable across all sections.
 */
export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  // Get the teacher profile for this user
  const teacher = await ctx.db.teacher.findUnique({
    where: { userId: ctx.session.user.id },
  });

  if (!teacher) {
    return NextResponse.json([]);
  }

  const slots = await ctx.db.timetableSlot.findMany({
    where: { teacherId: teacher.id },
    include: {
      period: true,
      subject: { select: { id: true, name: true } },
      section: {
        select: {
          id: true,
          name: true,
          class: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ period: { periodNumber: "asc" } }],
  });

  return NextResponse.json(slots);
}
