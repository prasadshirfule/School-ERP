import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { SubjectCreateSchema } from "@/lib/validations";

export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const role = ctx.session.user.role;

  // If TEACHER: only return subjects assigned to this teacher via TeacherSubject
  if (role === "TEACHER") {
    const teacher = await ctx.db.teacher.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json([]);
    }

    const assignedSubjects = teacher.subjects
      .map((ts: any) => ts.subject)
      .filter((s: any) => s.schoolId === ctx.session.user.schoolId)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json(assignedSubjects);
  }

  // ADMIN / PRINCIPAL / other authorized roles: return all subjects for this school
  const subjects = await ctx.db.subject.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(subjects);
}

export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const parsed = SubjectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid subject name");
  }

  const name = parsed.data.name.trim();

  // Case-insensitive duplicate check within this school
  const existing = await ctx.db.subject.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return badRequest(`A subject named "${existing.name}" already exists.`);
  }

  // Create subject tenant-scoped
  const subject = await ctx.db.subject.create({
    data: {
      name,
    } as any,
  });

  // If created by a teacher, automatically link TeacherSubject so the teacher can immediately use it
  const role = ctx.session.user.role;
  if (role === "TEACHER") {
    const teacher = await ctx.db.teacher.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (teacher) {
      await ctx.db.teacherSubject.upsert({
        where: {
          teacherId_subjectId: {
            teacherId: teacher.id,
            subjectId: subject.id,
          },
        },
        create: {
          teacherId: teacher.id,
          subjectId: subject.id,
        },
        update: {},
      });
    }
  }

  return NextResponse.json(subject, { status: 201 });
}

export async function PATCH(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!id) {
    return badRequest("Subject ID is required");
  }

  if (!name) {
    return badRequest("Subject name is required");
  }

  // Verify subject exists in this tenant
  const current = await ctx.db.subject.findUnique({
    where: { id },
  });
  if (!current) {
    return badRequest("Subject not found");
  }

  // Case-insensitive duplicate check within this school, excluding self
  const existing = await ctx.db.subject.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
      id: { not: id },
    },
  });

  if (existing) {
    return badRequest(`A subject named "${existing.name}" already exists.`);
  }

  const updated = await ctx.db.subject.update({
    where: { id },
    data: { name },
  });

  return NextResponse.json(updated);
}


