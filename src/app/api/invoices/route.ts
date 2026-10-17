import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest, forbidden, hasRole } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const role = ctx.session.user.role;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const studentId = searchParams.get("studentId");

  const where: any = {};
  if (status) where.status = status;

  if (role === "PARENT") {
    const parent = await ctx.db.parent.findUnique({
      where: { userId: ctx.session.user.id },
      include: { students: { select: { studentId: true } } },
    });
    const childIds = parent?.students.map((c: any) => c.studentId) || [];

    if (studentId) {
      if (!childIds.includes(studentId)) {
        return forbidden("You can only view invoices for your linked children");
      }
      where.studentId = studentId;
    } else {
      where.studentId = { in: childIds };
    }
  } else if (role === "TEACHER") {
    return forbidden("Teachers cannot access fee invoices");
  } else if (studentId) {
    where.studentId = studentId;
  }

  const invoices = await ctx.db.feeInvoice.findMany({
    where,
    include: {
      student: true,
      feeStructure: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { dueDate: "desc" },
  });

  // Serialize Decimals to strings
  const serialized = invoices.map((inv) => ({
    ...inv,
    amountDue: inv.amountDue.toFixed(2),
    discountAmount: inv.discountAmount.toFixed(2),
    feeStructure: {
      ...inv.feeStructure,
      amount: inv.feeStructure.amount.toFixed(2),
    },
    payments: inv.payments.map((p) => ({
      ...p,
      amount: p.amount.toFixed(2),
    })),
  }));

  return NextResponse.json(serialized);
}

export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (!hasRole(ctx.session, ["ADMIN", "PRINCIPAL", "ACCOUNTANT"])) {
    return forbidden();
  }

  const body = await request.json();
  const { studentId, feeStructureId, discountAmount, dueDate } = body;

  if (!studentId || !feeStructureId || !dueDate) {
    return badRequest("studentId, feeStructureId, and dueDate are required");
  }

  // Verify student belongs to this school
  const student = await ctx.db.student.findUnique({
    where: { id: studentId },
  });
  if (!student) {
    return badRequest("Student not found in this school");
  }

  // Fetch fee structure to get amount — using Decimal arithmetic
  const feeStructure = await ctx.db.feeStructure.findFirst({
    where: { id: feeStructureId },
  });

  if (!feeStructure) {
    return badRequest("Fee structure not found");
  }

  const discount = new Prisma.Decimal(discountAmount || 0);
  const amountDue = feeStructure.amount.sub(discount);

  if (amountDue.lessThan(0)) {
    return badRequest("Discount cannot exceed fee amount");
  }

  const invoice = await ctx.db.feeInvoice.create({
    data: {
      studentId,
      feeStructureId,
      amountDue,
      discountAmount: discount,
      dueDate: new Date(dueDate),
    } as any,
    include: { student: true, feeStructure: true },
  });

  return NextResponse.json(
    {
      ...invoice,
      amountDue: invoice.amountDue.toFixed(2),
      discountAmount: invoice.discountAmount.toFixed(2),
    },
    { status: 201 }
  );
}
