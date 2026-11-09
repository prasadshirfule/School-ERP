import { VerificationPurpose } from "@prisma/client";
import { prisma } from "../database/prisma";
import { hashPassword, verifyPassword } from "../security/hashing";
import { createVerificationToken, verifyVerificationToken } from "../security/tokens";
import { checkRateLimit } from "../security/rateLimit";
import { logSecurityEvent } from "../security/events";
import { emailService } from "../notifications/email";

export class PasswordSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordSecurityError";
  }
}

/**
 * 1. Request a password reset.
 * Returns a generic success response to prevent account enumeration attacks.
 */
export async function requestPasswordReset(
  email: string,
  clientIp?: string,
  userAgent?: string
): Promise<{ success: boolean; message: string }> {
  const genericMessage = "If an account matches that email, password reset instructions have been dispatched.";

  if (!email || !email.includes("@")) {
    return { success: true, message: genericMessage };
  }

  const cleanEmail = email.toLowerCase().trim();

  // Rate limiting (max 5 reset requests per 15 mins per IP)
  const rateLimitKey = `pwd_reset:ip:${clientIp || "unknown"}`;
  const rateLimit = await checkRateLimit(rateLimitKey, { limit: 5, windowSeconds: 900 });
  if (!rateLimit.allowed) {
    throw new PasswordSecurityError("Too many password reset requests. Please try again later.");
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (!user || !user.isActive) {
    // Return identical message without revealing non-existence
    return { success: true, message: genericMessage };
  }

  try {
    // Generate secure 64-char token (expires in 15 mins, 60s cooldown)
    const resetToken = await createVerificationToken({
      identifier: user.id,
      purpose: VerificationPurpose.PASSWORD_RESET,
      isNumericOtp: false,
      ttlMinutes: 15,
      resendCooldownSeconds: 60,
      metadata: { userId: user.id, email: user.email },
    });

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${resetToken.token}&uid=${user.id}`;

    await emailService.sendEmail({
      to: user.email,
      subject: "Vidyora — Password Reset Request",
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${user.fullName},</p>
        <p>A request was received to reset your password for your Vidyora account.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#1e40af;color:#ffffff;text-decoration:none;border-radius:4px;">Reset My Password</a></p>
        <p>Or use this token: <code>${resetToken.token}</code></p>
        <p>This single-use link expires in 15 minutes. If you did not request this, you may safely ignore this message.</p>
      `,
    });

    await logSecurityEvent({
      userId: user.id,
      eventType: "PASSWORD_RESET_REQUESTED",
      ipAddress: clientIp,
      userAgent,
      metadata: { email: cleanEmail },
    });
  } catch (error) {
    console.error("[requestPasswordReset] Error dispatching reset token:", error);
  }

  return { success: true, message: genericMessage };
}

/**
 * 2. Complete password reset using single-use token.
 * Updates password and increments sessionVersion to immediately invalidate all existing sessions.
 */
export async function resetPassword(
  userId: string,
  token: string,
  newPassword: string,
  clientIp?: string,
  userAgent?: string
): Promise<{ success: boolean; message: string }> {
  if (!newPassword || newPassword.length < 12) {
    throw new PasswordSecurityError("Password must be at least 12 characters long.");
  }

  // Rate limiting against brute force reset attempts
  const rateLimitKey = `pwd_reset_verify:${userId}`;
  const rateLimit = await checkRateLimit(rateLimitKey, { limit: 5, windowSeconds: 900 });
  if (!rateLimit.allowed) {
    throw new PasswordSecurityError("Too many invalid attempts. Please request a new reset link.");
  }

  // Verify single-use token
  const verification = await verifyVerificationToken(
    userId,
    VerificationPurpose.PASSWORD_RESET,
    token
  );

  if (!verification.success) {
    throw new PasswordSecurityError("Reset link is invalid, expired, or has already been used.");
  }

  // Hash new password with bcrypt cost 12
  const newHash = await hashPassword(newPassword);

  // Update password and increment sessionVersion for instant session revocation
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      sessionVersion: { increment: 1 },
    },
  });

  await logSecurityEvent({
    userId,
    eventType: "PASSWORD_RESET_COMPLETED",
    ipAddress: clientIp,
    userAgent,
  });

  return {
    success: true,
    message: "Password reset successful. All previous sessions have been logged out. Please sign in with your new password.",
  };
}

/**
 * 3. Change password while logged in.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  clientIp?: string,
  userAgent?: string
): Promise<{ success: boolean; message: string }> {
  if (!newPassword || newPassword.length < 12) {
    throw new PasswordSecurityError("New password must be at least 12 characters long.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new PasswordSecurityError("User not found.");
  }

  const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    throw new PasswordSecurityError("Current password is incorrect.");
  }

  const newHash = await hashPassword(newPassword);

  // Invalidate other sessions on password change
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      sessionVersion: { increment: 1 },
    },
  });

  await logSecurityEvent({
    userId,
    eventType: "PASSWORD_CHANGED",
    ipAddress: clientIp,
    userAgent,
  });

  return {
    success: true,
    message: "Password changed successfully.",
  };
}
