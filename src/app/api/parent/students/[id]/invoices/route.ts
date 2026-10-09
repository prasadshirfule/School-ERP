import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized } from "@/lib/utils";
import { tenantClient } from "@/lib/tenant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const { id: studentId } = await params;
  const db = tenantClient(session.user.schoolId);

  // Verify parent has access to this student
  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    include: { students: true },
  });

  if (!parent || !parent.students.some((sp) => sp.studentId === studentId)) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const invoices = await db.feeInvoice.findMany({
    where: { studentId },
    include: {
      feeStructure: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { dueDate: "desc" },
  });

  const serialized = invoices.map((inv) => ({
    ...inv,
    amountDue: inv.amountDue.toFixed(2),
    discountAmount: inv.discountAmount.toFixed(2),
    feeStructure: { ...inv.feeStructure, amount: inv.feeStructure.amount.toFixed(2) },
    payments: inv.payments.map((p) => ({ ...p, amount: p.amount.toFixed(2) })),
  }));

  return NextResponse.json(serialized);
}
