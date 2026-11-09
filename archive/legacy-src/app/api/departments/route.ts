import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { DepartmentCreateSchema } from "@/lib/validations";

/**
 * GET /api/departments
 * Returns all departments for the school with HOD info and assigned teachers.
 */
export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const departments = await ctx.db.department.findMany({
    include: {
      headOfDepartment: {
        select: { id: true, fullName: true },
      },
      teachers: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments);
}

/**
 * POST /api/departments
 * Create a new department.
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const parsed = DepartmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid department data");
  }

  const name = parsed.data.name.trim();
  const headOfDepartmentId = parsed.data.headTeacherId || (body.headOfDepartmentId ? String(body.headOfDepartmentId).trim() : null);

  // Check unique name per school
  const existing = await ctx.db.department.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    return badRequest(`A department named "${name}" already exists.`);
  }

  const department = await ctx.db.department.create({
    data: {
      name,
      headOfDepartmentId,
    } as any,
    include: {
      headOfDepartment: { select: { id: true, fullName: true } },
      teachers: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(department, { status: 201 });
}

/**
 * PATCH /api/departments
 * Update an existing department (name, HOD, and optionally assign/reassign teachers).
 */
export async function PATCH(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return badRequest("Department ID is required");

  const existing = await ctx.db.department.findUnique({ where: { id } });
  if (!existing) return badRequest("Department not found");

  const updateData: any = {};
  if (typeof body.name === "string" && body.name.trim()) {
    updateData.name = body.name.trim();
  }

  if (body.headOfDepartmentId !== undefined) {
    updateData.headOfDepartmentId = body.headOfDepartmentId || null;
  }

  const updated = await ctx.db.department.update({
    where: { id },
    data: updateData,
    include: {
      headOfDepartment: { select: { id: true, fullName: true } },
      teachers: { select: { id: true, fullName: true } },
    },
  });

  // If teacherIds provided, update teachers' departmentId
  if (Array.isArray(body.teacherIds)) {
    // Unlink teachers currently in this department who are not in the list
    await ctx.db.teacher.updateMany({
      where: { departmentId: id, id: { notIn: body.teacherIds } },
      data: { departmentId: null } as any,
    });
    // Link newly assigned teachers
    if (body.teacherIds.length > 0) {
      await ctx.db.teacher.updateMany({
        where: { id: { in: body.teacherIds } },
        data: { departmentId: id } as any,
      });
    }
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/departments
 * Delete a department (unlinks teachers).
 */
export async function DELETE(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  if (!id) return badRequest("Department ID is required");

  const existing = await ctx.db.department.findUnique({ where: { id } });
  if (!existing) return badRequest("Department not found");

  // Unlink teachers first
  await ctx.db.teacher.updateMany({
    where: { departmentId: id },
    data: { departmentId: null } as any,
  });

  await ctx.db.department.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
