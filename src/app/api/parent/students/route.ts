import { NextResponse } from "next/server";
import { getTenantDb, unauthorized } from "@/lib/utils";

/** GET: returns students linked to the current parent user */
export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  // Find the parent profile for this user
  const parent = await ctx.db.parent.findUnique({
    where: { userId: ctx.session.user.id },
    include: {
      students: {
        include: {
          student: {
            include: {
              section: { include: { class: true } },
            },
          },
        },
      },
    },
  });

  if (!parent) {
    return NextResponse.json([]);
  }

  // Verify parent belongs to the same school
  if (parent.schoolId !== ctx.session.user.schoolId) {
    return NextResponse.json([]);
  }

  const students = parent.students.map((sp) => ({
    ...sp.student,
    relationship: sp.relationship,
    isPrimary: sp.isPrimary,
  }));

  return NextResponse.json(students);
}
