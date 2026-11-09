import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { razorpayService } from "@/lib/razorpay";
import { logAuditEvent } from "@/lib/audit";
import { unauthorized } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.schoolId) {
      return unauthorized();
    }

    const { schoolId } = session.user;
    const body = await request.json();
    const { orderId, paymentId, signature, planId, billingCycle = "ANNUAL" } = body;

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: "Missing required payment verification parameters" },
        { status: 400 }
      );
    }

    // Verify cryptographic HMAC signature
    const isValid = razorpayService.verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Payment signature verification failed" },
        { status: 400 }
      );
    }

    const now = new Date();
    const periodMonths = billingCycle === "MONTHLY" ? 1 : 12;
    const currentPeriodEnd = new Date(now);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + periodMonths);

    // Update subscription in database
    const updated = await prisma.subscription.upsert({
      where: { schoolId },
      update: {
        status: "ACTIVE",
        planId: planId || undefined,
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd,
        trialEndsAt: now, // Converted to paid
        updatedAt: now,
      },
      create: {
        schoolId,
        status: "ACTIVE",
        planId: planId || null,
        billingCycle,
        studentCount: 100,
        amount: 0,
        currency: "INR",
        trialStartsAt: now,
        trialEndsAt: now,
        currentPeriodStart: now,
        currentPeriodEnd,
      },
      include: { plan: true },
    });

    // Create confirmation in-app notification
    await prisma.notification.create({
      data: {
        schoolId,
        userId: session.user.id,
        title: "Subscription Activated",
        message: `Your school's ${updated.plan?.name || "Professional"} plan has been successfully activated until ${currentPeriodEnd.toLocaleDateString()}.`,
        type: "SUBSCRIPTION",
        linkUrl: "/admin/subscription",
      },
    });

    // Audit log
    await logAuditEvent({
      schoolId,
      userId: session.user.id,
      userEmail: session.user.email,
      action: "SUBSCRIPTION_RENEWED",
      targetType: "Subscription",
      targetId: updated.id,
      details: {
        orderId,
        paymentId,
        planName: updated.plan?.name,
        billingCycle,
        validUntil: currentPeriodEnd.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription successfully activated",
      subscription: updated,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to verify subscription payment";
    console.error("[SUBSCRIPTION_VERIFY] Error verifying subscription payment:", error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
