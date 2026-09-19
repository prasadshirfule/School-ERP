import prisma from "./prisma";

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
  const existing = await prisma.examSlot.findMany({
    where: { schoolId, academicYear },
    orderBy: { order: "asc" },
  });

  if (existing.length > 0) {
    return existing;
  }

  // Auto-seed the 6 standard slots
  await prisma.$transaction(
    DEFAULT_EXAM_SLOTS.map((slot) =>
      prisma.examSlot.upsert({
        where: {
          schoolId_academicYear_code: {
            schoolId,
            academicYear,
            code: slot.code,
          },
        },
        create: {
          schoolId,
          academicYear,
          code: slot.code,
          name: slot.name,
          term: slot.term,
          maxScore: slot.maxScore,
          order: slot.order,
        },
        update: {},
      })
    )
  );

  return prisma.examSlot.findMany({
    where: { schoolId, academicYear },
    orderBy: { order: "asc" },
  });
}
