import { NextResponse } from "next/server";
import {
  getRestrictedSuperAdminSession,
  getSuperAdminSession,
  unauthorized,
  forbidden,
} from "@/lib/utils";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import {
  generateTotpSecret,
  generateOtpAuthUrl,
  generateRecoveryCodes,
  verifyTotpCode,
  verifyRecoveryCode,
  encryptSecret,
  decryptSecret,
} from "@/lib/totp";
import { logAuditEvent } from "@/lib/audit";
import bcrypt from "bcryptjs";

/**
 * GET /api/super-admin/mfa
 * Returns current MFA status and remaining recovery code count for Super Admin.
 * Permitted in restricted enrollment-only session.
 */
export async function GET() {
  const session = await getRestrictedSuperAdminSession();
  if (!session) return unauthorized();
  if (session.user.role !== Role.SUPER_ADMIN) return forbidden();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      mfaEnabled: true,
      mfaRecoveryCodes: true,
    },
  });

  if (!user) return unauthorized();

  return NextResponse.json({
    email: user.email,
    mfaEnabled: user.mfaEnabled,
    remainingRecoveryCodes: user.mfaRecoveryCodes ? user.mfaRecoveryCodes.length : 0,
  });
}

/**
 * POST /api/super-admin/mfa
 * Initiates MFA setup: generates Base32 secret and 8 recovery codes.
 * Stores pending setup securely in EmailVerificationToken for 15 minutes.
 * Permitted in restricted enrollment-only session.
 */
export async function POST() {
  const session = await getRestrictedSuperAdminSession();
  if (!session) return unauthorized();
  if (session.user.role !== Role.SUPER_ADMIN) return forbidden();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) return unauthorized();

  const secret = generateTotpSecret();
  const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
  const otpAuthUrl = generateOtpAuthUrl({
    issuer: "School ERP",
    accountName: user.email,
    secret,
  });

  // Clean up any stale pending setup tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: {
      email: user.email,
      type: "MFA_SETUP_PENDING",
    },
  });

  // Store pending secret + hashed codes in ephemeral token (15m expiry)
  await prisma.emailVerificationToken.create({
    data: {
      email: user.email,
      token: secret,
      type: "MFA_SETUP_PENDING",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      metadata: JSON.stringify({
        hashedCodes,
      }),
    },
  });

  return NextResponse.json({
    success: true,
    secret,
    otpAuthUrl,
    recoveryCodes: plainCodes,
    message: "Save your recovery codes in a secure password manager. Verify a 6-digit authenticator code to activate.",
  });
}

/**
 * DELETE /api/super-admin/mfa
 * Disables MFA: strictly requires full privileged session, current password, and current TOTP or recovery code.
 */
export async function DELETE(request: Request) {
  const session = await getSuperAdminSession();
  if (!session) return unauthorized();
  if (session.user.role !== Role.SUPER_ADMIN) return forbidden();

  try {
    const body = await request.json();
    const { password, code } = body;

    if (!password || !code) {
      return NextResponse.json(
        { error: "Current password and authenticator code are required to disable MFA." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.passwordHash || !user.mfaSecret) {
      return NextResponse.json({ error: "User not found or MFA not active" }, { status: 400 });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
    }

    // Decrypt stored secret and verify TOTP code or emergency recovery code
    const plainSecret = decryptSecret(user.mfaSecret);
    const cleanCode = code.trim();
    let codeValid = verifyTotpCode({ secret: plainSecret, token: cleanCode });

    if (!codeValid && user.mfaRecoveryCodes && user.mfaRecoveryCodes.length > 0) {
      const matchedHash = verifyRecoveryCode(cleanCode, user.mfaRecoveryCodes);
      if (matchedHash) {
        codeValid = true;
      }
    }

    if (!codeValid) {
      return NextResponse.json({ error: "Invalid authenticator code or recovery code." }, { status: 403 });
    }

    // Atomically disable MFA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: [],
      },
    });

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "MFA_DISABLED",
      targetType: "User",
      targetId: user.id,
      details: { timestamp: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: "Multi-Factor Authentication has been disabled.",
    });
  } catch (error: unknown) {
    console.error("[MFA] Error disabling MFA:", error);
    return NextResponse.json({ error: "Failed to disable MFA" }, { status: 500 });
  }
}
