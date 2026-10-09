import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, unauthorized } from "@/lib/utils";
import { razorpayService } from "@/lib/razorpay";
import { calculateInvoiceStatus } from "@/lib/invoiceStatus";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantDb();
    if (!ctx) return unauthorized();

    const body = await req.json();
    const parsed = verifyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { orderId, paymentId, signature, invoiceId, amount } = parsed.data;

    // Verify cryptographic signature
    const isValid = razorpayService.verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature verification failed" },
        { status: 400 }
      );
    }

    // Verify invoice in tenant DB
    const invoice = await ctx.db.feeInvoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const paymentAmount = new Prisma.Decimal(amount);

    let totalPaid = new Prisma.Decimal(0);
    for (const p of invoice.payments) {
      totalPaid = totalPaid.add(p.amount);
    }
    totalPaid = totalPaid.add(paymentAmount);

    const newStatus = calculateInvoiceStatus(invoice.amountDue, totalPaid);
    const receiptNumber = `ONLINE-REC-${Date.now().toString().slice(-6)}`;

    // Execute payment record and invoice update in tenant transaction
    const result = await (ctx.db as any).$transaction(async (tx: any) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: paymentAmount,
          method: "ONLINE",
          receiptNumber,
          gatewayRef: `${orderId}|${paymentId}`,
          paidAt: new Date(),
        },
      });

      const updatedInvoice = await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          status: newStatus,
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified and recorded successfully",
      payment: result.payment,
      invoice: result.invoice,
    });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);
    return NextResponse.json({ error: "Failed to process payment verification" }, { status: 500 });
  }
}
