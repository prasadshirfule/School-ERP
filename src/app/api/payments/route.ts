import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest, forbidden, hasRole } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { calculateInvoiceStatus } from "@/lib/invoiceStatus";
import { PaymentRecordSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const role = ctx.session.user.role;
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("invoiceId");
  const studentId = searchParams.get("studentId");

  const where: any = {};
  if (invoiceId) where.invoiceId = invoiceId;

  if (role === "PARENT") {
    const parent = await ctx.db.parent.findUnique({
      where: { userId: ctx.session.user.id },
      include: { students: { select: { studentId: true } } },
    });
    const childIds = parent?.students.map((c: any) => c.studentId) || [];

    if (studentId) {
      if (!childIds.includes(studentId)) {
        return forbidden("You can only view payments for your linked children");
      }
      where.invoice = { studentId };
    } else {
      where.invoice = { studentId: { in: childIds } };
    }
  } else if (role === "TEACHER") {
    return forbidden("Teachers cannot access payment records");
  } else if (studentId) {
    where.invoice = { studentId };
  }

  const payments = await ctx.db.payment.findMany({
    where,
    include: {
      invoice: {
        include: {
          student: true,
          feeStructure: true,
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (!hasRole(ctx.session, ["ADMIN", "PRINCIPAL", "ACCOUNTANT"])) {
    return forbidden();
  }

  const json = await request.json();
  const parsed = PaymentRecordSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid payment data");
  }

  const { invoiceId, amount, method, gatewayRef } = parsed.data;

  try {
    const paymentAmount = new Prisma.Decimal(amount);
    if (paymentAmount.lessThanOrEqualTo(0)) {
      return badRequest("Payment amount must be greater than zero");
    }

    const db = ctx.db;
    const result = await (db as any).$transaction(async (tx: any) => {
      // 1. Fetch invoice inside transaction to avoid race conditions
      const invoice = await tx.feeInvoice.findFirst({
        where: { id: invoiceId },
        include: { payments: true },
      });

      if (!invoice) {
        throw new Error("INVOICE_NOT_FOUND");
      }

      if (invoice.status === "PAID" || invoice.status === "WAIVED") {
        throw new Error("INVOICE_ALREADY_SETTLED");
      }

      // 2. Authoritative balance and overpayment validation
      let totalPaidSoFar = new Prisma.Decimal(0);
      for (const p of invoice.payments) {
        totalPaidSoFar = totalPaidSoFar.add(p.amount);
      }

      const balanceRemaining = invoice.amountDue.sub(totalPaidSoFar);
      if (paymentAmount.greaterThan(balanceRemaining)) {
        throw new Error("OVERPAYMENT_EXCEEDS_BALANCE");
      }

      const newTotalPaid = totalPaidSoFar.add(paymentAmount);
      const newStatus = calculateInvoiceStatus(invoice.amountDue, newTotalPaid);

      // 3. Concurrency-safe sequential receipt allocation
      // NEVER trust client-provided receiptNumber
      const currentYear = new Date().getFullYear();
      const recPrefix = `REC-${currentYear}-`;

      const existingPayments = await tx.payment.findMany({
        where: {
          receiptNumber: { startsWith: recPrefix },
        },
        select: { receiptNumber: true },
      });

      let maxRecSeq = 0;
      for (const p of existingPayments) {
        const parts = p.receiptNumber.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxRecSeq) {
          maxRecSeq = num;
        }
      }

      const receiptNumber = `${recPrefix}${String(maxRecSeq + 1).padStart(4, "0")}`;

      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: paymentAmount,
          method,
          receiptNumber,
          gatewayRef: gatewayRef || null,
          paidAt: new Date(),
        },
      });

      await tx.feeInvoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });

      return { payment, newStatus };
    });

    return NextResponse.json(
      {
        ...result.payment,
        amount: result.payment.amount.toFixed(2),
        newInvoiceStatus: result.newStatus,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.message === "INVOICE_NOT_FOUND") {
      return badRequest("Invoice not found");
    }
    if (err.message === "INVOICE_ALREADY_SETTLED") {
      return badRequest("Invoice is already paid or waived");
    }
    if (err.message === "OVERPAYMENT_EXCEEDS_BALANCE") {
      return badRequest("Payment amount exceeds the outstanding balance on this invoice");
    }
    console.error("Payment processing error:", err);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
