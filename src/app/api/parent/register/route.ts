import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown-ip";
    const rateCheck = checkRateLimit(`parent-reg:${ip}`, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { fullName, email, phone, password } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Full name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.isActive) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please log in instead." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Invalidate any existing unused tokens for this email
    await prisma.emailVerificationToken.deleteMany({
      where: {
        email: cleanEmail,
        type: "PARENT_SIGNUP",
      },
    });

    // Store token with registration payload in metadata
    await prisma.emailVerificationToken.create({
      data: {
        email: cleanEmail,
        token: verificationToken,
        type: "PARENT_SIGNUP",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        metadata: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone ? phone.trim() : null,
          passwordHash,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Verification token generated. Please verify your email to activate your account.",
      verificationToken,
    });
  } catch (error: unknown) {
    console.error("[PARENT_REGISTRATION] Error submitting registration:", error);
    return NextResponse.json(
      { error: "Failed to process parent registration" },
      { status: 500 }
    );
  }
}
