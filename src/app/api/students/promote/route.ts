import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { z } from "zod";

const StudentPromoteSchema = z.object({
  action: z.enum(["PROMOTE", "RETAIN", "GRADUATE"]),
  studentIds: z.array(z.string().min(1)).min(1, "At least one student must be selected"),
  targetSectionId: z.string().optional().nullable(),
  targetAcademicYear: z.string().min(1, "Target academic year is required"),
});

export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = StudentPromoteSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid promotion payload");
  }

  const { action, studentIds, targetSectionId, targetAcademicYear } = parsed.data;

  // If promoting or retaining, targetSectionId is required
  if ((action === "PROMOTE" || action === "RETAIN") && !targetSectionId) {
    return badRequest("Target section is required for promotion or retention");
  }

  // Verify targetSection belongs to tenant if specified
  if (targetSectionId) {
    const targetSec = await ctx.db.section.findUnique({
      where: { id: targetSectionId },
      include: { class: true },
    });
    if (!targetSec) {
      return badRequest("Target section not found in this school");
    }
  }

  // Verify all students belong to current tenant
  const validStudents = await ctx.db.student.findMany({
    where: {
      id: { in: studentIds },
    },
    select: { id: true, fullName: true, academicYear: true, sectionId: true },
  });

  if (validStudents.length !== studentIds.length) {
    return badRequest("One or more selected students do not belong to this school");
  }

  const db = ctx.db;
  const result = await (db as any).$transaction(async (tx: any) => {
    if (action === "GRADUATE") {
      const updated = await tx.student.updateMany({
        where: {
          id: { in: studentIds },
        },
        data: {
          isActive: false,
        },
      });
      return { count: updated.count, action: "GRADUATE" };
    }

    const updated = await tx.student.updateMany({
      where: {
        id: { in: studentIds },
      },
      data: {
        sectionId: targetSectionId,
        academicYear: targetAcademicYear,
        isActive: true,
      },
    });

    return { count: updated.count, action };
  });

  return NextResponse.json({
    message: `Successfully processed ${result.count} student(s) for ${action}`,
    ...result,
  });
}
