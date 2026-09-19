import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { getOrCreateExamSlots } from "@/lib/exam-slots";

/**
 * GET /api/exam-slots?academicYear=2026-27
 * Returns the structured exam slots (UT1, UT2, TERM1, UT3, UT4, TERM2) for the school & academic year.
 * Auto-seeds them if they don't exist yet so teachers never hit a dead end.
 */
export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const academicYear = searchParams.get("academicYear") || "2026-27";

  const slots = await getOrCreateExamSlots(ctx.session.user.schoolId, academicYear);

  return NextResponse.json(slots);
}

/**
 * POST /api/exam-slots
 * Creates a new custom exam slot for the school & academic year (e.g. UT5, Practical 1).
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const rawCode = typeof body.code === "string" ? body.code.trim() : "";
  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  const term = body.term === "TERM2" ? "TERM2" : "TERM1";
  const academicYear = typeof body.academicYear === "string" && body.academicYear.trim() ? body.academicYear.trim() : "2026-27";

  if (!rawCode) {
    return badRequest("Exam slot code is required (e.g. UT5, Practical 1)");
  }

  const cleanCode = rawCode.toUpperCase().replace(/\s+/g, "");
  const displayName = rawName || rawCode;

  // Duplicate check: case-insensitive match for code within the same school & academicYear
  const existing = await ctx.db.examSlot.findFirst({
    where: {
      academicYear,
      code: {
        equals: cleanCode,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return badRequest(`An exam slot with code "${existing.code}" already exists for academic year ${academicYear}.`);
  }

  // Determine next order
  const lastSlot = await ctx.db.examSlot.findFirst({
    where: { academicYear },
    orderBy: { order: "desc" },
  });
  const order = (lastSlot?.order ?? 0) + 1;

  // Create slot tenant-scoped
  const newSlot = await ctx.db.examSlot.create({
    data: {
      academicYear,
      term,
      code: cleanCode,
      name: displayName,
      maxScore: 30, // sensible default
      order,
    } as any,
  });

  return NextResponse.json(newSlot, { status: 201 });
}

export async function PATCH(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  const term = body.term === "TERM2" ? "TERM2" : body.term === "TERM1" ? "TERM1" : undefined;

  if (!id) {
    return badRequest("Exam slot ID is required");
  }

  // Verify slot exists in this tenant
  const current = await ctx.db.examSlot.findUnique({
    where: { id },
  });
  if (!current) {
    return badRequest("Exam slot not found");
  }

  const displayName = rawName || current.name;

  const updateData: any = {
    name: displayName,
  };
  if (term) {
    updateData.term = term;
  }

  const updated = await ctx.db.examSlot.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}



