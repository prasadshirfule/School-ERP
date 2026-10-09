import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { calculateInvoiceStatus } from "@/lib/invoiceStatus";
import { PaymentRecordSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("invoiceId");
  const studentId = searchParams.get("studentId");

  const where: any = {};
  if (invoiceId) where.invoiceId = invoiceId;
  if (studentId) where.invoice = { studentId };

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

  if (
    ctx.session.user.role !== "ACCOUNTANT" &&
    ctx.session.user.role !== "ADMIN" &&
    ctx.session.user.role !== "PRINCIPAL"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = PaymentRecordSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid payment data");
  }

  const { invoiceId, amount, method, gatewayRef } = parsed.data;

  // Fetch the invoice (tenant-scoped)
  const invoice = await ctx.db.feeInvoice.findFirst({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) {
    return badRequest("Invoice not found");
  }

  if (invoice.status === "PAID" || invoice.status === "WAIVED") {
    return badRequest("Invoice is already paid or waived");
  }

  const paymentAmount = new Prisma.Decimal(amount);

  // Calculate total paid so far
  let totalPaid = new Prisma.Decimal(0);
  for (const p of invoice.payments) {
    totalPaid = totalPaid.add(p.amount);
  }
  totalPaid = totalPaid.add(paymentAmount);

  // Determine new status using shared Decimal calculator
  const newStatus = calculateInvoiceStatus(invoice.amountDue, totalPaid);

  const currentYear = new Date().getFullYear();
  const recPrefix = `REC-${currentYear}-`;

  const existingPayments = await ctx.db.payment.findMany({
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

  const receiptNumber = json.receiptNumber || `${recPrefix}${String(maxRecSeq + 1).padStart(4, "0")}`;

  const db = ctx.db;
  const result = await (db as any).$transaction(async (tx: any) => {
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

    return payment;
  });

  return NextResponse.json(
    {
      ...result,
      amount: result.amount.toFixed(2),
      newInvoiceStatus: newStatus,
    },
    { status: 201 }
  );
}
