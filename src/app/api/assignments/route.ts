import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";

/**
 * GET /api/assignments
 * Query assignments.
 * Query params: ?sectionId=..., ?subjectId=...
 */
export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("sectionId") || "";
  const subjectId = searchParams.get("subjectId") || "";

  const whereClause: any = {};
  if (sectionId) whereClause.sectionId = sectionId;
  if (subjectId) whereClause.subjectId = subjectId;

  // If teacher with no filters, show their own assignments
  if (!sectionId && !subjectId && ctx.session.user.role === "TEACHER") {
    const teacher = await ctx.db.teacher.findUnique({
      where: { userId: ctx.session.user.id },
    });
    if (teacher) {
      whereClause.teacherId = teacher.id;
    }
  }

  const assignments = await ctx.db.assignment.findMany({
    where: whereClause,
    include: {
      section: {
        select: {
          id: true,
          name: true,
          class: { select: { id: true, name: true } },
        },
      },
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, fullName: true } },
    },
    orderBy: [
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(assignments);
}

/**
 * POST /api/assignments
 * Create a new assignment or study note.
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (
    ctx.session.user.role !== "ADMIN" &&
    ctx.session.user.role !== "PRINCIPAL" &&
    ctx.session.user.role !== "TEACHER"
  ) {
    return unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const sectionId = typeof body.sectionId === "string" ? body.sectionId.trim() : "";
  const subjectId = typeof body.subjectId === "string" ? body.subjectId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const dueDateStr = typeof body.dueDate === "string" ? body.dueDate.trim() : "";
  const attachmentUrl = typeof body.attachmentUrl === "string" && body.attachmentUrl.trim()
    ? body.attachmentUrl.trim()
    : null;

  if (!sectionId) return badRequest("Section is required");
  if (!subjectId) return badRequest("Subject is required");
  if (!title) return badRequest("Title is required");

  // Determine teacherId
  let teacherId = typeof body.teacherId === "string" ? body.teacherId.trim() : "";
  if (!teacherId && ctx.session.user.role === "TEACHER") {
    const t = await ctx.db.teacher.findUnique({
      where: { userId: ctx.session.user.id },
    });
    if (t) teacherId = t.id;
  }

  if (!teacherId) {
    // If admin creating, use first teacher or HOD or require teacherId
    const firstTeacher = await ctx.db.teacher.findFirst();
    if (firstTeacher) teacherId = firstTeacher.id;
    else return badRequest("A valid teacher is required to associate with the assignment");
  }

  let dueDate: Date | null = null;
  if (dueDateStr) {
    const d = new Date(dueDateStr);
    if (!isNaN(d.getTime())) dueDate = d;
  }

  const assignment = await ctx.db.assignment.create({
    data: {
      sectionId,
      subjectId,
      teacherId,
      title,
      description,
      dueDate,
      attachmentUrl,
    } as any,
    include: {
      section: {
        select: {
          id: true,
          name: true,
          class: { select: { id: true, name: true } },
        },
      },
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}

/**
 * PATCH /api/assignments
 * Update assignment details.
 */
export async function PATCH(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (
    ctx.session.user.role !== "ADMIN" &&
    ctx.session.user.role !== "PRINCIPAL" &&
    ctx.session.user.role !== "TEACHER"
  ) {
    return unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return badRequest("Assignment ID is required");

  const existing = await ctx.db.assignment.findUnique({ where: { id } });
  if (!existing) return badRequest("Assignment not found");

  const updateData: any = {};
  if (typeof body.title === "string" && body.title.trim()) {
    updateData.title = body.title.trim();
  }
  if (typeof body.description === "string") {
    updateData.description = body.description.trim();
  }
  if (body.dueDate !== undefined) {
    if (body.dueDate) {
      const d = new Date(body.dueDate);
      updateData.dueDate = isNaN(d.getTime()) ? null : d;
    } else {
      updateData.dueDate = null;
    }
  }
  if (body.attachmentUrl !== undefined) {
    updateData.attachmentUrl = body.attachmentUrl || null;
  }
  if (typeof body.sectionId === "string" && body.sectionId.trim()) {
    updateData.sectionId = body.sectionId.trim();
  }
  if (typeof body.subjectId === "string" && body.subjectId.trim()) {
    updateData.subjectId = body.subjectId.trim();
  }

  const updated = await ctx.db.assignment.update({
    where: { id },
    data: updateData,
    include: {
      section: {
        select: {
          id: true,
          name: true,
          class: { select: { id: true, name: true } },
        },
      },
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/assignments
 * Delete assignment.
 */
export async function DELETE(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (
    ctx.session.user.role !== "ADMIN" &&
    ctx.session.user.role !== "PRINCIPAL" &&
    ctx.session.user.role !== "TEACHER"
  ) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  if (!id) return badRequest("Assignment ID is required");

  const existing = await ctx.db.assignment.findUnique({ where: { id } });
  if (!existing) return badRequest("Assignment not found");

  await ctx.db.assignment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
