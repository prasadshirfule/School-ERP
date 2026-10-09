import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { z } from "zod";

const PeriodInputSchema = z.object({
  label: z.string().min(1, "Period label is required").max(50),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  isBreak: z.boolean().optional(),
});

/**
 * GET /api/periods
 * Returns all periods for the school, ordered by periodNumber.
 */
export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const periods = await ctx.db.period.findMany({
    orderBy: { periodNumber: "asc" },
  });

  return NextResponse.json(periods);
}

/**
 * POST /api/periods
 * Create a new period.
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const parsed = PeriodInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid period data");
  }

  const { label, startTime, endTime, isBreak } = parsed.data;

  // Auto-assign next periodNumber
  const last = await ctx.db.period.findFirst({
    orderBy: { periodNumber: "desc" },
  });
  const periodNumber = (last?.periodNumber ?? 0) + 1;

  const period = await ctx.db.period.create({
    data: {
      periodNumber,
      label,
      startTime,
      endTime,
      isBreak,
    } as any,
  });

  return NextResponse.json(period, { status: 201 });
}

/**
 * PATCH /api/periods
 * Update an existing period.
 */
export async function PATCH(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return badRequest("Period ID is required");

  const existing = await ctx.db.period.findUnique({ where: { id } });
  if (!existing) return badRequest("Period not found");

  const updateData: any = {};
  if (typeof body.label === "string") updateData.label = body.label.trim();
  if (typeof body.startTime === "string") updateData.startTime = body.startTime.trim();
  if (typeof body.endTime === "string") updateData.endTime = body.endTime.trim();
  if (typeof body.isBreak === "boolean") updateData.isBreak = body.isBreak;

  const updated = await ctx.db.period.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/periods
 * Delete a period (also cascades timetable slot references — careful).
 */
export async function DELETE(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  if (!id) return badRequest("Period ID is required");

  const existing = await ctx.db.period.findUnique({ where: { id } });
  if (!existing) return badRequest("Period not found");

  // Delete related timetable slots first
  await ctx.db.timetableSlot.deleteMany({ where: { periodId: id } });
  await ctx.db.period.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
