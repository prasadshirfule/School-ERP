import { NextResponse } from "next/server";
import { getTenantDb, unauthorized } from "@/lib/utils";

export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const role = ctx.session.user.role;
  if (role !== "ADMIN" && role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  // End of today in local/UTC time to catch all invoices due today or earlier
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Fetch all pending / overdue fee invoices due on or before today
  const invoices = await ctx.db.feeInvoice.findMany({
    where: {
      dueDate: { lte: endOfToday },
      status: { in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] },
      student: { isActive: true },
    },
    include: {
      student: {
        include: {
          section: {
            include: { class: true },
          },
          parents: {
            include: {
              parent: true,
            },
            orderBy: [{ isPrimary: "desc" }],
          },
        },
      },
      feeStructure: true,
      payments: {
        orderBy: { paidAt: "desc" },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const alerts = [];

  for (const inv of invoices) {
    const amountDueNum = parseFloat(inv.amountDue.toString());
    const discountNum = parseFloat(inv.discountAmount.toString());
    const totalPaidNum = inv.payments.reduce(
      (sum: number, p: any) => sum + parseFloat(p.amount.toString()),
      0
    );
    const remainingNum = Math.max(0, amountDueNum - totalPaidNum);

    // Only alert if there is an actual remaining balance
    if (remainingNum <= 0) continue;

    // Pick primary parent contact (isPrimary=true prioritized by orderBy, otherwise first linked parent)
    const primaryParentLink = inv.student.parents.find((sp: any) => sp.isPrimary) || inv.student.parents[0];
    const primaryContact = primaryParentLink
      ? {
          name: primaryParentLink.parent.fullName,
          phone: primaryParentLink.parent.phone,
          relationship: primaryParentLink.relationship,
          isPrimary: primaryParentLink.isPrimary,
        }
      : null;

    const dueDateObj = new Date(inv.dueDate);
    const diffTime = now.getTime() - dueDateObj.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    alerts.push({
      invoiceId: inv.id,
      studentId: inv.student.id,
      studentName: inv.student.fullName,
      admissionNo: inv.student.admissionNo,
      photoUrl: inv.student.photoUrl,
      className: inv.student.section?.class?.name || null,
      sectionName: inv.student.section?.name || null,
      feeDescription: inv.feeStructure.name,
      amountDue: amountDueNum.toFixed(2),
      amountPaid: totalPaidNum.toFixed(2),
      amountRemaining: remainingNum.toFixed(2),
      dueDate: inv.dueDate.toISOString(),
      status: inv.status,
      daysOverdue,
      primaryContact,
    });
  }

  // Ensure sorted by most overdue first
  alerts.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return NextResponse.json({
    totalAlerts: alerts.length,
    totalOverdueAmount: alerts.reduce((sum, a) => sum + parseFloat(a.amountRemaining), 0).toFixed(2),
    alerts,
  });
}
