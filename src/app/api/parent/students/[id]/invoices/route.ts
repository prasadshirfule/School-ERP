import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { unauthorized } from "@/lib/utils";
import { tenantClient } from "@/lib/tenant";
import prisma from "@/lib/prisma";
import { Payment } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "PARENT") return unauthorized();

  const { id: studentId } = await params;
  if (!studentId) {
    return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
  }

  // Find verified parent profile linked to this user and student
  const verifiedLink = await prisma.studentParent.findFirst({
    where: {
      studentId,
      parent: {
        userId: session.user.id,
      },
    },
    include: {
      student: { select: { schoolId: true, isActive: true } },
      parent: {
        include: {
          school: { select: { id: true, isActive: true, status: true } },
        },
      },
    },
  });

  if (!verifiedLink || !verifiedLink.parent?.school) {
    return NextResponse.json({ error: "Student not found or access denied" }, { status: 404 });
  }

  // Immediate suspension check on the student's school
  if (!verifiedLink.parent.school.isActive || verifiedLink.parent.school.status === "SUSPENDED") {
    return NextResponse.json(
      { error: "Access suspended for this school institution" },
      { status: 403 }
    );
  }

  // Tenant-scoped database query using the verified student's schoolId
  const db = tenantClient(verifiedLink.parent.schoolId);
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
    payments: inv.payments.map((p: Payment) => ({ ...p, amount: p.amount.toFixed(2) })),
  }));

  return NextResponse.json(serialized);
}
