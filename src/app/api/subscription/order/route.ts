import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { razorpayService } from "@/lib/razorpay";
import { unauthorized } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.schoolId) {
      return unauthorized();
    }

    const { schoolId } = session.user;
    const body = await request.json();
    const { planId, billingCycle = "ANNUAL" } = body;

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Subscription plan not found" }, { status: 404 });
    }

    // Determine current active student count
    const studentCount = await prisma.student.count({
      where: { schoolId, isActive: true },
    });

    const billableStudents = Math.max(studentCount, plan.minStudents);
    const unitPrice =
      billingCycle === "ANNUAL"
        ? Number(plan.pricePerStudentYear)
        : Number(plan.pricePerStudentMonth);

    const subtotal = billableStudents * unitPrice;
    // 18% GST standard SaaS Indian tax
    const tax = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + tax;

    const receipt = `SUB-${schoolId.substring(0, 6)}-${Date.now()}`;

    // Razorpay amount is in paise (1 INR = 100 paise)
    const amountInPaise = totalAmount * 100;

    const order = await razorpayService.createOrder({
      amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        schoolId,
        planId: plan.id,
        planCode: plan.code,
        billingCycle,
        billableStudents: String(billableStudents),
        type: "SUBSCRIPTION_RENEWAL",
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: totalAmount,
      amountInPaise,
      currency: order.currency,
      keyId: order.keyId,
      billableStudents,
      subtotal,
      tax,
      isMock: order.isMock,
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to initiate subscription order";
    console.error("[SUBSCRIPTION_ORDER] Error creating renewal order:", error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
