import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const MarksBatchSaveSchema = z.object({
  sectionId: z.string().min(1, "Section ID is required"),
  subjectId: z.string().min(1, "Subject ID is required"),
  examName: z.string().min(1, "Exam name is required"),
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      score: z.union([z.number().min(0), z.string()]),
      maxScore: z.union([z.number().positive(), z.string()]),
    })
  ).min(1, "At least one marks record is required"),
});

/**
 * GET /api/marks
 * Query params:
 *  - sectionId: filter by section
 *  - subjectId: filter by subject
 *  - examName: filter by exam name
 *  - examsOnly=true: return list of unique exam names used in this section or school
 */
export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("sectionId");
  const subjectId = searchParams.get("subjectId");
  const examName = searchParams.get("examName");
  const examsOnly = searchParams.get("examsOnly") === "true";

  // Return distinct exam names for autocomplete
  if (examsOnly) {
    const studentWhere: any = {};
    if (sectionId) {
      studentWhere.sectionId = sectionId;
    }

    const marks = await ctx.db.marks.findMany({
      where: {
        student: studentWhere,
      },
      select: { examName: true },
      distinct: ["examName"],
      orderBy: { examName: "asc" },
    });

    return NextResponse.json(marks.map((m: any) => m.examName));
  }

  if (!sectionId || !subjectId || !examName) {
    return badRequest("sectionId, subjectId, and examName are required to load marks");
  }

  // 1. Verify section belongs to current tenant
  const section = await ctx.db.section.findUnique({
    where: { id: sectionId },
    include: { class: true },
  });
  if (!section) {
    return badRequest("Section not found");
  }

  // 2. Verify subject belongs to current tenant
  const subject = await ctx.db.subject.findUnique({
    where: { id: subjectId },
  });
  if (!subject) {
    return badRequest("Subject not found");
  }

  // 3. Get all active students in this section
  const students = await ctx.db.student.findMany({
    where: {
      sectionId,
      isActive: true,
    },
    orderBy: [
      { rollNumber: "asc" },
      { fullName: "asc" },
    ],
    select: {
      id: true,
      rollNumber: true,
      admissionNo: true,
      fullName: true,
    },
  });

  const studentIds = students.map((s: any) => s.id);

  // 4. Get existing marks for these students in this subject and exam
  const existingMarks = await ctx.db.marks.findMany({
    where: {
      studentId: { in: studentIds },
      subjectId,
      examName: examName.trim(),
    },
  });

  const marksMap = new Map<string, { id: string; score: string; maxScore: string }>();
  for (const m of existingMarks) {
    marksMap.set(m.studentId, {
      id: m.id,
      score: m.score.toString(),
      maxScore: m.maxScore.toString(),
    });
  }

  const result = students.map((student: any) => ({
    studentId: student.id,
    admissionNo: student.admissionNo,
    fullName: student.fullName,
    rollNumber: student.rollNumber,
    markId: marksMap.get(student.id)?.id || null,
    score: marksMap.get(student.id)?.score ?? "",
    maxScore: marksMap.get(student.id)?.maxScore ?? "100",
  }));

  return NextResponse.json({
    sectionName: `${section.class.name}-${section.name}`,
    subjectName: subject.name,
    examName: examName.trim(),
    students: result,
  });
}

/**
 * POST /api/marks
 * Bulk upsert marks for a class section + subject + exam.
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const role = ctx.session.user.role;
  if (role !== "TEACHER" && role !== "ADMIN" && role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = MarksBatchSaveSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid marks entry data");
  }

  const { sectionId, subjectId, examName, records } = parsed.data;
  const trimmedExamName = examName.trim();

  // 1. Verify section belongs to current tenant
  const section = await ctx.db.section.findUnique({
    where: { id: sectionId },
  });
  if (!section) {
    return badRequest("Section not found in this school");
  }

  // 2. Verify subject belongs to current tenant
  const subject = await ctx.db.subject.findUnique({
    where: { id: subjectId },
  });
  if (!subject) {
    return badRequest("Subject not found in this school");
  }

  // 3. If user is a TEACHER, verify they are assigned to this subject via TeacherSubject
  if (role === "TEACHER") {
    const teacher = await ctx.db.teacher.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        subjects: true,
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 403 });
    }

    const isAssigned = teacher.subjects.some((ts: any) => ts.subjectId === subjectId);
    if (!isAssigned) {
      return NextResponse.json(
        { error: "You are not authorized to enter marks for this subject" },
        { status: 403 }
      );
    }
  }

  // 4. Verify all students belong to this section in current tenant
  const studentIds = records.map((r) => r.studentId);
  const validStudents = await ctx.db.student.findMany({
    where: {
      id: { in: studentIds },
      sectionId,
      isActive: true,
    },
    select: { id: true },
  });

  const validStudentIdSet = new Set(validStudents.map((s: any) => s.id));
  const invalidStudents = studentIds.filter((id) => !validStudentIdSet.has(id));
  if (invalidStudents.length > 0) {
    return badRequest("One or more students do not belong to the selected section");
  }

  // 5. Upsert each mark inside tenant transaction
  const upsertOps = records.map((rec) => {
    const scoreDec = new Prisma.Decimal(rec.score);
    const maxScoreDec = new Prisma.Decimal(rec.maxScore);

    return ctx.db.marks.upsert({
      where: {
        studentId_subjectId_examName: {
          studentId: rec.studentId,
          subjectId,
          examName: trimmedExamName,
        },
      },
      create: {
        studentId: rec.studentId,
        subjectId,
        examName: trimmedExamName,
        score: scoreDec,
        maxScore: maxScoreDec,
      },
      update: {
        score: scoreDec,
        maxScore: maxScoreDec,
      },
    });
  });

  const results = await (ctx.db as any).$transaction(upsertOps);

  return NextResponse.json({
    success: true,
    count: results.length,
    message: `Successfully saved marks for ${results.length} students.`,
  });
}
