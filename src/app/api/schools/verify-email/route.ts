import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown-ip";
    const rateCheck = checkRateLimit(`verify-email:${ip}`, 10, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and verification token are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    const verification = await prisma.emailVerificationToken.findFirst({
      where: {
        email: cleanEmail,
        token: cleanToken,
        type: "SCHOOL_REGISTRATION",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid, expired, or already used verification token" },
        { status: 400 }
      );
    }

    // Mark token used
    await prisma.emailVerificationToken.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    // Mark school registration request email verified
    const updatedRequest = await prisma.schoolRegistrationRequest.updateMany({
      where: {
        adminEmail: cleanEmail,
        status: "PENDING",
      },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    await logAuditEvent({
      userEmail: cleanEmail,
      action: "SCHOOL_EMAIL_VERIFIED",
      targetType: "SchoolRegistrationRequest",
      details: { email: cleanEmail },
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. Your school registration is now pending review by the platform administrator.",
    });
  } catch (error: unknown) {
    console.error("[SCHOOL_REGISTRATION] Error verifying email:", error);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}
