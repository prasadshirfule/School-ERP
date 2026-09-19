import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { Prisma, InvoiceStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { calculateInvoiceStatus } from "@/lib/invoiceStatus";

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

  const body = await request.json();
  const { invoiceId, amount, method, receiptNumber } = body;

  if (!invoiceId || !amount || !method || !receiptNumber) {
    return badRequest("invoiceId, amount, method, and receiptNumber are required");
  }

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

  // Calculate total paid so far using Decimal arithmetic
  let totalPaid = new Prisma.Decimal(0);
  for (const p of invoice.payments) {
    totalPaid = totalPaid.add(p.amount);
  }
  totalPaid = totalPaid.add(paymentAmount);

  const effectiveDue = invoice.amountDue;

  // Determine new status using shared Decimal calculator
  const newStatus = calculateInvoiceStatus(invoice.amountDue, totalPaid);

  // Create payment and update invoice status in a transaction
  // Note: using the base prisma client for the transaction because
  // the tenant extension wraps individual operations. The schoolId
  // is passed explicitly into the payment create.
  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        schoolId: ctx.session.user.schoolId,
        invoiceId,
        amount: paymentAmount,
        method,
        receiptNumber,
      },
    }),
    prisma.feeInvoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    }),
  ]);

  return NextResponse.json(
    {
      ...payment,
      amount: payment.amount.toFixed(2),
      newInvoiceStatus: newStatus,
    },
    { status: 201 }
  );
}
