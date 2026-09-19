import { NextResponse } from "next/server";
import { getTenantDb, unauthorized } from "@/lib/utils";

/**
 * GET /api/syllabus/stats?academicYear=Z
 * Returns syllabus completion stats per class/subject for the dashboard.
 */
export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const academicYear = searchParams.get("academicYear") || "2026-27";

  const topics = await ctx.db.syllabusTopic.findMany({
    where: { academicYear },
    select: {
      id: true,
      isCompleted: true,
      classId: true,
      subjectId: true,
      class: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });

  // Aggregate by class+subject
  const map = new Map<string, { className: string; subjectName: string; total: number; completed: number }>();
  for (const t of topics) {
    const key = `${t.classId}::${t.subjectId}`;
    if (!map.has(key)) {
      map.set(key, {
        className: t.class.name,
        subjectName: t.subject.name,
        total: 0,
        completed: 0,
      });
    }
    const entry = map.get(key)!;
    entry.total++;
    if (t.isCompleted) entry.completed++;
  }

  const stats = Array.from(map.values()).map((s) => ({
    ...s,
    percentage: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
  }));

  // Overall
  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.isCompleted).length;
  const overallPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return NextResponse.json({
    overall: { total: totalTopics, completed: completedTopics, percentage: overallPercentage },
    byClassSubject: stats,
  });
}
