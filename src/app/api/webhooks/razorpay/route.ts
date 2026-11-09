import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature") || "";
    const rawBody = await request.text();
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    // Verify HMAC-SHA256 signature
    if (webhookSecret) {
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSig !== signature) {
        console.error("[RAZORPAY_WEBHOOK] Invalid signature");
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.event_id || payload.id || `evt_${Date.now()}`;
    const eventType = payload.event || "unknown";

    // Idempotency: check if event already processed
    const existing = await prisma.webhookEvent.findFirst({
      where: { eventId },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Event already processed",
        alreadyProcessed: true,
      });
    }

    // Store the event record
    await prisma.webhookEvent.create({
      data: {
        eventId,
        eventType,
        payload: rawBody,
      },
    });

    // Handle specific events
    if (eventType === "payment.captured") {
      const paymentEntity = payload.payload?.payment?.entity;
      if (paymentEntity) {
        const invoiceId = paymentEntity.notes?.invoiceId;
        const amount = paymentEntity.amount ? paymentEntity.amount / 100 : 0;
        const paymentId = paymentEntity.id;

        if (invoiceId) {
          const invoice = await prisma.feeInvoice.findUnique({
            where: { id: invoiceId },
            include: { payments: true },
          });

          if (invoice) {
            // Check if payment already exists
            const existingPayment = await prisma.payment.findFirst({
              where: { gatewayRef: paymentId },
            });

            if (!existingPayment) {
              const receiptNumber = `WH-REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

              await prisma.payment.create({
                data: {
                  schoolId: invoice.schoolId,
                  invoiceId: invoice.id,
                  amount,
                  method: "CARD",
                  gatewayRef: paymentId,
                  receiptNumber,
                },
              });

              // Recalculate invoice status
              const allPayments = await prisma.payment.findMany({
                where: { invoiceId: invoice.id },
              });
              const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
              const invoiceAmount = Number(invoice.amountDue);

              let newStatus = "UNPAID";
              if (totalPaid >= invoiceAmount) newStatus = "PAID";
              else if (totalPaid > 0) newStatus = "PARTIALLY_PAID";

              await prisma.feeInvoice.update({
                where: { id: invoice.id },
                data: { status: newStatus as any },
              });
            }
          }
        }
      }
    } else if (eventType === "refund.processed" || eventType === "refund.created") {
      const refundEntity = payload.payload?.refund?.entity;
      if (refundEntity) {
        const paymentId = refundEntity.payment_id;
        const refundAmount = refundEntity.amount ? refundEntity.amount / 100 : 0;
        const refundId = refundEntity.id;

        const originalPayment = await prisma.payment.findFirst({
          where: { gatewayRef: paymentId },
          include: { invoice: true },
        });

        if (originalPayment && refundAmount > 0) {
          const existingRefund = await prisma.payment.findFirst({
            where: { gatewayRef: refundId },
          });

          if (!existingRefund) {
            const refundReceipt = `WH-REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

            await prisma.$transaction(async (tx) => {
              await tx.payment.create({
                data: {
                  schoolId: originalPayment.schoolId,
                  invoiceId: originalPayment.invoiceId,
                  amount: -refundAmount,
                  method: "REFUND",
                  gatewayRef: refundId,
                  receiptNumber: refundReceipt,
                },
              });

              const allPayments = await tx.payment.findMany({
                where: { invoiceId: originalPayment.invoiceId },
              });
              const netPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
              const invoiceAmount = Number(originalPayment.invoice.amountDue);

              let newStatus: any = "UNPAID";
              if (netPaid >= invoiceAmount) newStatus = "PAID";
              else if (netPaid > 0) newStatus = "PARTIALLY_PAID";

              await tx.feeInvoice.update({
                where: { id: originalPayment.invoiceId },
                data: { status: newStatus },
              });
            });
          }
        }
      }
    } else if (eventType === "payment.failed") {
      console.warn("[RAZORPAY_WEBHOOK] Payment failed:", payload.payload?.payment?.entity?.id);
    }

    return NextResponse.json({ success: true, eventId });
  } catch (error: unknown) {
    console.error("[RAZORPAY_WEBHOOK] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
