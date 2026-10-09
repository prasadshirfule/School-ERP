import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";

/**
 * GET /api/search?q=...
 * Global search across Students, Teachers, Classes, and Invoices
 */
export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ students: [], teachers: [], classes: [], invoices: [] });
  }

  const [students, teachers, classes, invoices] = await Promise.all([
    ctx.db.student.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { admissionNo: { contains: q, mode: "insensitive" } },
          { rollNumber: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        section: { include: { class: true } },
      },
      take: 6,
    }),
    ctx.db.teacher.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        user: { select: { email: true, phone: true } },
        department: { select: { name: true } },
      },
      take: 6,
    }),
    ctx.db.class.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
      },
      include: {
        sections: true,
      },
      take: 4,
    }),
    ctx.db.feeInvoice.findMany({
      where: {
        OR: [
          { student: { fullName: { contains: q, mode: "insensitive" } } },
          { student: { admissionNo: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        student: { select: { fullName: true, admissionNo: true } },
        feeStructure: { select: { name: true } },
      },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    students: students.map((s: any) => ({
      id: s.id,
      title: s.fullName,
      subtitle: `${s.section ? `${s.section.class.name}-${s.section.name}` : "Unassigned"} • Adm: ${s.admissionNo}`,
      href: `/admin/students/${s.id}`,
      type: "Student",
    })),
    teachers: teachers.map((t: any) => ({
      id: t.id,
      title: t.fullName,
      subtitle: `${t.department ? t.department.name : "Staff"} • ${t.user.email}`,
      href: `/admin/teachers`,
      type: "Teacher",
    })),
    classes: classes.map((c: any) => ({
      id: c.id,
      title: c.name,
      subtitle: `${c.sections.length} Section(s)`,
      href: `/admin/classes`,
      type: "Class",
    })),
    invoices: invoices.map((inv: any) => ({
      id: inv.id,
      title: `${inv.student.fullName} — ${inv.feeStructure.name}`,
      subtitle: `Due: ₹${Number(inv.amountDue).toFixed(2)} • Status: ${inv.status}`,
      href: `/accountant/invoices`,
      type: "Invoice",
    })),
  });
}
