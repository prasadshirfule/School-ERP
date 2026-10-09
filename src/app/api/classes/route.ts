import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import prisma from "@/lib/prisma";

export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const classes = await ctx.db.class.findMany({
    include: {
      sections: {
        include: {
          classTeacher: true,
          _count: { select: { students: true } },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(classes);
}

export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, sections } = body;

  if (!name) {
    return badRequest("name is required");
  }

  if (!Array.isArray(sections) || sections.length === 0) {
    return badRequest("At least one section is required");
  }

  // Validate sections
  for (const sec of sections) {
    if (!sec.name || typeof sec.name !== "string" || sec.name.trim() === "") {
      return badRequest("Each section must have a non-empty name");
    }
  }

  // Check for duplicate section names in the request
  const sectionNames = sections.map((s: any) => s.name.trim().toUpperCase());
  if (new Set(sectionNames).size !== sectionNames.length) {
    return badRequest("Duplicate section names are not allowed");
  }

  const schoolId = ctx.session.user.schoolId;
  const academicYear = "2026-27"; // Default academic year

  try {
    const db = ctx.db;
    const result = await (db as any).$transaction(async (tx: any) => {
      // Auto-compute sort order: highest existing order + 1 (or 1 if none)
      const maxResult = await tx.class.aggregate({
        _max: { order: true },
      });
      const nextOrder = (maxResult._max.order ?? 0) + 1;

      const cls = await tx.class.create({
        data: {
          name: name.trim(),
          order: nextOrder,
        },
      });

      // Create all sections
      const sectionData = sections.map((sec: any) => ({
        classId: cls.id,
        name: sec.name.trim(),
        academicYear,
        classTeacherId: sec.classTeacherId || null,
      }));

      await tx.section.createMany({ data: sectionData });

      // Fetch the complete class with sections for the response
      const complete = await tx.class.findUnique({
        where: { id: cls.id },
        include: {
          sections: {
            include: {
              classTeacher: true,
              _count: { select: { students: true } },
            },
            orderBy: { name: "asc" },
          },
        },
      });

      return complete;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return badRequest("A class with this name already exists in your school");
    }
    throw e;
  }
}
