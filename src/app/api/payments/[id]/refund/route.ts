import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
import { unauthorized, forbidden } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.schoolId) {
      return unauthorized();
    }

    if (!["ADMIN", "ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
      return forbidden();
    }

    const { schoolId } = session.user;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Fee payment refund initiated by accounts office.";
    const refundAmount = body.amount ? Number(body.amount) : null;

    const payment = await prisma.payment.findFirst({
      where: { id, schoolId },
      include: {
        invoice: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found in this school" }, { status: 404 });
    }

    const maxRefundable = Number(payment.amount);
    const amountToRefund = refundAmount ? Math.min(refundAmount, maxRefundable) : maxRefundable;

    if (amountToRefund <= 0) {
      return NextResponse.json({ error: "Refund amount must be greater than 0" }, { status: 400 });
    }

    // Process Razorpay API refund if gateway reference exists
    let gatewayRefundId: string | null = null;
    if (payment.gatewayRef && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const authHeader = Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
        ).toString("base64");

        const rzpRes = await fetch(
          `https://api.razorpay.com/v1/payments/${payment.gatewayRef}/refund`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${authHeader}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: Math.round(amountToRefund * 100), // paise
              notes: {
                reason,
                schoolId,
                paymentId: payment.id,
                invoiceId: payment.invoiceId,
              },
            }),
          }
        );

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          gatewayRefundId = rzpData.id;
        }
      } catch (err) {
        console.warn("[PAYMENT_REFUND] Razorpay online refund API call failed, recording ledger refund:", err);
      }
    }

    // Update payment record or generate negative refund transaction
    const refundReceipt = `REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await prisma.$transaction(async (tx) => {
      // Create negative adjustment payment to keep historical receipt intact
      await tx.payment.create({
        data: {
          schoolId,
          invoiceId: payment.invoiceId,
          amount: -amountToRefund,
          method: "REFUND",
          gatewayRef: gatewayRefundId || `REF-${payment.id}`,
          receiptNumber: refundReceipt,
        },
      });

      // Recalculate invoice status
      const allPayments = await tx.payment.findMany({
        where: { invoiceId: payment.invoiceId },
      });
      const netPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const invoiceAmount = Number(payment.invoice.amountDue);

      let newStatus: InvoiceStatus = "UNPAID";
      if (netPaid >= invoiceAmount) newStatus = "PAID";
      else if (netPaid > 0) newStatus = "PARTIALLY_PAID";

      await tx.feeInvoice.update({
        where: { id: payment.invoiceId },
        data: { status: newStatus },
      });

      // Notify parents of the student
      const studentParents = await tx.studentParent.findMany({
        where: { studentId: payment.invoice.studentId },
        include: { parent: true },
      });

      for (const sp of studentParents) {
        if (sp.parent?.userId) {
          await tx.notification.create({
            data: {
              schoolId,
              userId: sp.parent.userId,
              title: "Fee Payment Refund Processed",
              message: `A refund of INR ${amountToRefund.toFixed(2)} for receipt ${payment.receiptNumber} has been processed: ${reason}`,
              type: "PAYMENT",
              linkUrl: `/parent/fees`,
            },
          });
        }
      }
    });

    // Audit Log
    await logAuditEvent({
      schoolId,
      userId: session.user.id,
      userEmail: session.user.email,
      action: "PAYMENT_REFUNDED",
      targetType: "Payment",
      targetId: payment.id,
      details: {
        refundAmount: amountToRefund,
        originalAmount: Number(payment.amount),
        receiptNumber: payment.receiptNumber,
        refundReceipt,
        reason,
        gatewayRefundId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed refund of INR ${amountToRefund.toFixed(2)}.`,
      refundReceipt,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to process payment refund";
    console.error("[PAYMENT_REFUND_ERROR] Error:", error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
