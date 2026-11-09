import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown-ip";
    const rateCheck = checkRateLimit(`parent-verify:${ip}`, 10, 5 * 60 * 1000);
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
        type: "PARENT_SIGNUP",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification || !verification.metadata) {
      return NextResponse.json(
        { error: "Invalid, expired, or already used verification token" },
        { status: 400 }
      );
    }

    const metadata = JSON.parse(verification.metadata);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark token as used
      await tx.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      // 2. Check for pre-existing parent records with this email (entered during student admission)
      const matchingParents = await tx.parent.findMany({
        where: { email: cleanEmail },
      });

      const primarySchoolId = matchingParents.length > 0 ? matchingParents[0].schoolId : null;

      // 3. Create or update user
      let user = await tx.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: cleanEmail,
            phone: metadata.phone,
            passwordHash: metadata.passwordHash,
            role: Role.PARENT,
            schoolId: primarySchoolId,
            isActive: true,
            status: "ACTIVE",
            emailVerified: new Date(),
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash: metadata.passwordHash,
            role: Role.PARENT,
            schoolId: primarySchoolId || user.schoolId,
            isActive: true,
            status: "ACTIVE",
            emailVerified: new Date(),
          },
        });
      }

      // 4. Automatically link Parent record(s) to this newly verified user
      if (matchingParents.length > 0) {
        await tx.parent.updateMany({
          where: { email: cleanEmail },
          data: { userId: user.id },
        });
      }

      return { user, linkedRecordsCount: matchingParents.length };
    });

    await logAuditEvent({
      userId: result.user.id,
      userEmail: cleanEmail,
      action: "PARENT_REGISTERED",
      targetType: "User",
      targetId: result.user.id,
      details: {
        linkedRecordsCount: result.linkedRecordsCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Parent account verified successfully. You can now log in.",
      linkedRecordsCount: result.linkedRecordsCount,
    });
  } catch (error: unknown) {
    console.error("[PARENT_VERIFICATION] Error verifying parent account:", error);
    return NextResponse.json(
      { error: "Failed to verify parent account" },
      { status: 500 }
    );
  }
}
