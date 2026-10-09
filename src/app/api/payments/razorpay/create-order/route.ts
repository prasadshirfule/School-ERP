import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { razorpayService } from "@/lib/razorpay";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const createOrderSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().positive("Amount must be positive"),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantDb();
    if (!ctx) return unauthorized();

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { invoiceId, amount } = parsed.data;

    // Verify invoice belongs to tenant
    const invoice = await ctx.db.feeInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: true,
        feeStructure: true,
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    let totalPaid = new Prisma.Decimal(0);
    for (const p of invoice.payments) {
      totalPaid = totalPaid.add(p.amount);
    }

    const remainingDue = invoice.amountDue.sub(totalPaid).toNumber();
    if (amount > remainingDue) {
      return NextResponse.json(
        { error: `Amount ₹${amount} exceeds remaining balance of ₹${remainingDue}` },
        { status: 400 }
      );
    }

    // Convert INR to Paise
    const amountInPaise = Math.round(amount * 100);
    const receipt = `RCP_${invoice.id.slice(-6)}_${Date.now().toString().slice(-4)}`;

    const order = await razorpayService.createOrder({
      amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        schoolId: ctx.session.user.schoolId,
        invoiceId: invoice.id,
        studentName: invoice.student.fullName,
        admissionNo: invoice.student.admissionNo,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      receipt: order.receipt,
      isMock: order.isMock,
      invoice: {
        id: invoice.id,
        studentName: invoice.student.fullName,
        feeType: invoice.feeStructure.name,
      },
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}
