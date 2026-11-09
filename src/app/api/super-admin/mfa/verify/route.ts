import { NextResponse } from "next/server";
import { getRestrictedSuperAdminSession, unauthorized, forbidden } from "@/lib/utils";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { verifyTotpCode, encryptSecret } from "@/lib/totp";
import { logAuditEvent } from "@/lib/audit";

/**
 * POST /api/super-admin/mfa/verify
 * Confirms code against the pending setup token and permanently enables MFA for Super Admin.
 * Encrypts TOTP secret at the application level using AES-256-GCM before DB persistence.
 */
export async function POST(request: Request) {
  const session = await getRestrictedSuperAdminSession();
  if (!session) return unauthorized();
  if (session.user.role !== Role.SUPER_ADMIN) return forbidden();

  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string" || code.trim().length !== 6) {
      return NextResponse.json(
        { error: "A valid 6-digit verification code is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) return unauthorized();

    // Retrieve pending setup token
    const pending = await prisma.emailVerificationToken.findFirst({
      where: {
        email: user.email,
        type: "MFA_SETUP_PENDING",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!pending || !pending.metadata) {
      return NextResponse.json(
        { error: "No pending MFA setup session found or session expired. Please restart MFA setup." },
        { status: 400 }
      );
    }

    const secret = pending.token;
    const { hashedCodes } = JSON.parse(pending.metadata);

    const isValid = verifyTotpCode({ secret, token: code.trim() });
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code. Please check your authenticator app and try again." },
        { status: 400 }
      );
    }

    // Persist MFA activation to User record with AES-256-GCM encrypted secret
    const encryptedSecret = encryptSecret(secret);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
        mfaRecoveryCodes: hashedCodes,
      },
    });

    // Cleanup pending setup token
    await prisma.emailVerificationToken.deleteMany({
      where: {
        email: user.email,
        type: "MFA_SETUP_PENDING",
      },
    });

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "MFA_ACTIVATED",
      targetType: "User",
      targetId: user.id,
      details: {
        mfaType: "TOTP_RFC6238",
        recoveryCodesCount: hashedCodes.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Multi-Factor Authentication has been successfully enabled for your Super Admin account.",
    });
  } catch (error: unknown) {
    console.error("[MFA] Error activating MFA:", error);
    return NextResponse.json({ error: "Failed to activate MFA" }, { status: 500 });
  }
}
