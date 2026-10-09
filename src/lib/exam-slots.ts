import { tenantClient } from "./tenant";

export interface DefaultSlotDef {
  code: string;
  name: string;
  term: "TERM1" | "TERM2";
  maxScore: number;
  order: number;
}

export const DEFAULT_EXAM_SLOTS: DefaultSlotDef[] = [
  { code: "UT1", name: "UT1", term: "TERM1", maxScore: 30, order: 1 },
  { code: "UT2", name: "UT2", term: "TERM1", maxScore: 30, order: 2 },
  { code: "TERM1", name: "TERM1", term: "TERM1", maxScore: 50, order: 3 },
  { code: "UT3", name: "UT3", term: "TERM2", maxScore: 30, order: 4 },
  { code: "UT4", name: "UT4", term: "TERM2", maxScore: 30, order: 5 },
  { code: "TERM2", name: "TERM2", term: "TERM2", maxScore: 50, order: 6 },
];

/**
 * Ensures a school has the 6 structured exam slots created for an academic year.
 * If none exist, auto-seeds them so teachers and report cards never hit a dead end.
 */
export async function getOrCreateExamSlots(schoolId: string, academicYear: string) {
  const db = tenantClient(schoolId);
  const existing = await db.examSlot.findMany({
    where: { academicYear },
    orderBy: { order: "asc" },
  });

  if (existing.length > 0) {
    return existing;
  }

  // Auto-seed the 6 standard slots
  for (const slot of DEFAULT_EXAM_SLOTS) {
    await db.examSlot.upsert({
      where: {
        schoolId_academicYear_code: {
          schoolId,
          academicYear,
          code: slot.code,
        },
      },
      create: {
        academicYear,
        code: slot.code,
        name: slot.name,
        term: slot.term,
        maxScore: slot.maxScore,
        order: slot.order,
      } as any,
      update: {},
    });
  }

  return db.examSlot.findMany({
    where: { academicYear },
    orderBy: { order: "asc" },
  });
}

