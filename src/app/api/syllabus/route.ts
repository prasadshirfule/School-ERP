import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";

/**
 * GET /api/syllabus?classId=X&subjectId=Y&academicYear=Z
 * Returns syllabus topics for a class+subject+year, ordered by `order`.
 */
export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId") || "";
  const subjectId = searchParams.get("subjectId") || "";
  const academicYear = searchParams.get("academicYear") || "2026-27";

  if (!classId || !subjectId) return badRequest("classId and subjectId are required");

  const topics = await ctx.db.syllabusTopic.findMany({
    where: { classId, subjectId, academicYear },
    orderBy: { order: "asc" },
    include: {
      subject: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(topics);
}

/**
 * POST /api/syllabus
 * Create a new syllabus topic.
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const classId = typeof body.classId === "string" ? body.classId.trim() : "";
  const subjectId = typeof body.subjectId === "string" ? body.subjectId.trim() : "";
  const academicYear = typeof body.academicYear === "string" ? body.academicYear.trim() : "2026-27";
  const topicTitle = typeof body.topicTitle === "string" ? body.topicTitle.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() || null : null;

  if (!classId || !subjectId) return badRequest("classId and subjectId are required");
  if (!topicTitle) return badRequest("Topic title is required");

  // Auto-assign next order
  const last = await ctx.db.syllabusTopic.findFirst({
    where: { classId, subjectId, academicYear },
    orderBy: { order: "desc" },
  });
  const order = (last?.order ?? 0) + 1;

  const topic = await ctx.db.syllabusTopic.create({
    data: {
      classId,
      subjectId,
      academicYear,
      topicTitle,
      description,
      order,
    } as any,
  });

  return NextResponse.json(topic, { status: 201 });
}

/**
 * PATCH /api/syllabus
 * Update a topic (title, description, order, completion status).
 */
export async function PATCH(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return badRequest("Topic ID is required");

  const existing = await ctx.db.syllabusTopic.findUnique({ where: { id } });
  if (!existing) return badRequest("Topic not found");

  const updateData: any = {};
  if (typeof body.topicTitle === "string") updateData.topicTitle = body.topicTitle.trim();
  if (typeof body.description === "string") updateData.description = body.description.trim() || null;
  if (typeof body.order === "number") updateData.order = body.order;
  if (typeof body.isCompleted === "boolean") {
    updateData.isCompleted = body.isCompleted;
    updateData.completedDate = body.isCompleted ? new Date() : null;
  }

  const updated = await ctx.db.syllabusTopic.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/syllabus?id=X
 */
export async function DELETE(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  if (!id) return badRequest("Topic ID is required");

  const existing = await ctx.db.syllabusTopic.findUnique({ where: { id } });
  if (!existing) return badRequest("Topic not found");

  await ctx.db.syllabusTopic.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
