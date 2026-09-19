import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
    const studentWhere: any = { schoolId: ctx.session.user.schoolId };
    if (sectionId) {
      studentWhere.sectionId = sectionId;
    }

    const marks = await prisma.marks.findMany({
      where: {
        student: studentWhere,
      },
      select: { examName: true },
      distinct: ["examName"],
      orderBy: { examName: "asc" },
    });

    return NextResponse.json(marks.map((m) => m.examName));
  }

  if (!sectionId || !subjectId || !examName) {
    return badRequest("sectionId, subjectId, and examName are required to load marks");
  }

  // 1. Verify section belongs to tenant
  const section = await ctx.db.section.findUnique({
    where: { id: sectionId },
    include: { class: true },
  });
  if (!section) {
    return badRequest("Section not found");
  }

  // 2. Verify subject belongs to tenant
  const subject = await ctx.db.subject.findUnique({
    where: { id: subjectId },
  });
  if (!subject) {
    return badRequest("Subject not found");
  }

  // 3. Get all active students in this section
  const students = await ctx.db.student.findMany({
    where: { sectionId, isActive: true },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
    },
  });

  const studentIds = students.map((s) => s.id);

  // 4. Get existing marks for these students in this subject and exam
  const existingMarks = await prisma.marks.findMany({
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

  const result = students.map((student) => ({
    studentId: student.id,
    admissionNo: student.admissionNo,
    fullName: student.fullName,
    markId: marksMap.get(student.id)?.id || null,
    score: marksMap.get(student.id)?.score ?? "",
    maxScore: marksMap.get(student.id)?.maxScore ?? "100",
  }));

  return NextResponse.json(result);
}

/**
 * POST /api/marks
 * Saves or updates student marks using upsert on @@unique([studentId, subjectId, examName]).
 * Body:
 * {
 *   sectionId: string;
 *   subjectId: string;
 *   examName: string;
 *   records: {
 *     studentId: string;
 *     score: number | string;
 *     maxScore: number | string;
 *   }[];
 * }
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const role = ctx.session.user.role;
  if (role !== "TEACHER" && role !== "ADMIN" && role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { sectionId, subjectId, examName, records } = body as {
    sectionId: string;
    subjectId: string;
    examName: string;
    records: { studentId: string; score: number | string; maxScore: number | string }[];
  };

  if (!sectionId || !subjectId || !examName?.trim() || !Array.isArray(records) || records.length === 0) {
    return badRequest("sectionId, subjectId, examName, and records array are required");
  }

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
    const teacher = await prisma.teacher.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        subjects: true,
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 403 });
    }

    const isAssigned = teacher.subjects.some((ts) => ts.subjectId === subjectId);
    if (!isAssigned) {
      return NextResponse.json(
        { error: "You are not authorized to enter marks for this subject" },
        { status: 403 }
      );
    }
  }

  // 4. Verify all students belong to this tenant & section
  const validStudents = await ctx.db.student.findMany({
    where: {
      sectionId,
      isActive: true,
    },
    select: { id: true },
  });
  const validStudentIdSet = new Set(validStudents.map((s) => s.id));

  // Validate values
  for (const rec of records) {
    if (!validStudentIdSet.has(rec.studentId)) {
      return badRequest(`Invalid student ID ${rec.studentId} for the selected section`);
    }

    const scoreNum = parseFloat(String(rec.score));
    const maxScoreNum = parseFloat(String(rec.maxScore));

    if (isNaN(scoreNum) || isNaN(maxScoreNum)) {
      return badRequest("Scores and max scores must be valid numbers");
    }

    if (scoreNum < 0) {
      return badRequest(`Score cannot be negative for student ${rec.studentId}`);
    }

    if (maxScoreNum <= 0) {
      return badRequest(`Max score must be greater than zero for student ${rec.studentId}`);
    }

    if (scoreNum > maxScoreNum) {
      return badRequest(
        `Score (${scoreNum}) cannot exceed maximum score (${maxScoreNum}) for student ${rec.studentId}`
      );
    }
  }

  // 5. Execute upserts within a transaction
  try {
    const upserted = await prisma.$transaction(
      records.map((rec) => {
        const scoreDecimal = new Prisma.Decimal(parseFloat(String(rec.score)).toFixed(2));
        const maxScoreDecimal = new Prisma.Decimal(parseFloat(String(rec.maxScore)).toFixed(2));

        return prisma.marks.upsert({
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
            score: scoreDecimal,
            maxScore: maxScoreDecimal,
          },
          update: {
            score: scoreDecimal,
            maxScore: maxScoreDecimal,
          },
        });
      })
    );

    return NextResponse.json({
      message: `Successfully saved marks for ${upserted.length} student(s) in "${trimmedExamName}"`,
      count: upserted.length,
    });
  } catch (error: any) {
    return badRequest(error.message || "Failed to save marks");
  }
}
