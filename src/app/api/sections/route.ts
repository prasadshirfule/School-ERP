import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { SectionCreateSchema } from "@/lib/validations";

export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const sections = await ctx.db.section.findMany({
    include: {
      class: true,
      classTeacher: true,
      _count: { select: { students: true } },
    },
    orderBy: [{ class: { order: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json(sections);
}

/**
 * POST — Add a single section to an existing class.
 * Used from the expanded class row "Add Section" action.
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = SectionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid section data");
  }

  const { classId, name, academicYear, classTeacherId } = parsed.data;

  try {
    const section = await ctx.db.section.create({
      data: {
        classId,
        name: name.trim(),
        academicYear,
        classTeacherId: classTeacherId || null,
      } as any,
      include: { class: true, classTeacher: true, _count: { select: { students: true } } },
    });
    return NextResponse.json(section, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return badRequest("This section already exists for this class and academic year");
    }
    throw e;
  }
}

/**
 * PATCH — Rename a section or reassign its class teacher.
 * Body: { id, name?, classTeacherId? }
 */
export async function PATCH(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, name, classTeacherId } = body;

  if (!id) {
    return badRequest("Section id is required");
  }

  const updateData: Record<string, any> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (classTeacherId !== undefined) updateData.classTeacherId = classTeacherId || null;

  if (Object.keys(updateData).length === 0) {
    return badRequest("Nothing to update — provide name or classTeacherId");
  }

  try {
    const section = await ctx.db.section.update({
      where: { id },
      data: updateData as any,
      include: { class: true, classTeacher: true, _count: { select: { students: true } } },
    });
    return NextResponse.json(section);
  } catch (e: any) {
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }
    if (e.code === "P2002") {
      return badRequest("A section with this name already exists for this class");
    }
    throw e;
  }
}

/**
 * DELETE — Remove a section (only if it has zero students).
 * Body: { id }
 */
export async function DELETE(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return badRequest("Section id is required");
  }

  // Check student count — block deletion if students are enrolled
  const section = await ctx.db.section.findFirst({
    where: { id },
    include: { _count: { select: { students: true } } },
  });

  if (!section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  if ((section as any)._count.students > 0) {
    return badRequest(
      `Cannot delete this section — ${(section as any)._count.students} student(s) are currently enrolled. Reassign students first.`
    );
  }

  await ctx.db.section.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
