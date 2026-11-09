import { Role } from "@prisma/client";
import { prisma } from "../database/prisma";
import { logSecurityEvent } from "../security/events";

export class LifecycleError extends Error {
  constructor(message: string) {
    super(`[LIFECYCLE_ERROR] ${message}`);
    this.name = "LifecycleError";
  }
}

/**
 * Protects against removing or suspending the sole active Administrator of a school.
 */
export async function assertNotSoleAdmin(schoolId: string, targetUserId: string): Promise<void> {
  const activeAdmins = await prisma.schoolMembership.findMany({
    where: {
      schoolId,
      role: Role.ADMIN,
      isActive: true,
      user: {
        isActive: true,
      },
    },
  });

  const isTargetAdmin = activeAdmins.some((m) => m.userId === targetUserId);
  if (isTargetAdmin && activeAdmins.length <= 1) {
    throw new LifecycleError(
      "Operation rejected: Cannot remove or suspend the sole active Administrator of the school. Appoint another Administrator first."
    );
  }
}

/**
 * Suspends a user account and immediately invalidates all active sessions.
 */
export async function suspendUserAccount(
  targetUserId: string,
  reason: string,
  actingUserId: string,
  schoolId?: string
): Promise<void> {
  if (schoolId) {
    await assertNotSoleAdmin(schoolId, targetUserId);
  }

  // Prevent self-suspension
  if (targetUserId === actingUserId) {
    throw new LifecycleError("Self-suspension prohibited: You cannot suspend your own account.");
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      isActive: false,
      suspendedAt: new Date(),
      suspendedReason: reason,
      sessionVersion: { increment: 1 }, // Instant JWT revocation
    },
  });

  await logSecurityEvent({
    schoolId,
    userId: targetUserId,
    eventType: "ACCOUNT_SUSPENDED",
    metadata: { suspendedBy: actingUserId, reason },
  });
}

/**
 * Reactivates a suspended user account.
 */
export async function reactivateUserAccount(
  targetUserId: string,
  actingUserId: string,
  schoolId?: string
): Promise<void> {
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      isActive: true,
      suspendedAt: null,
      suspendedReason: null,
    },
  });

  await logSecurityEvent({
    schoolId,
    userId: targetUserId,
    eventType: "ACCOUNT_REACTIVATED",
    metadata: { reactivatedBy: actingUserId },
  });
}

/**
 * Revokes a user's membership from a specific school.
 */
export async function revokeSchoolMembership(
  schoolId: string,
  targetUserId: string,
  actingUserId: string
): Promise<void> {
  await assertNotSoleAdmin(schoolId, targetUserId);

  if (targetUserId === actingUserId) {
    throw new LifecycleError("Cannot revoke your own school membership.");
  }

  await prisma.schoolMembership.update({
    where: {
      schoolId_userId: {
        schoolId,
        userId: targetUserId,
      },
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
    },
  });

  // Increment session version to force re-evaluation of school memberships
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      sessionVersion: { increment: 1 },
    },
  });

  await logSecurityEvent({
    schoolId,
    userId: targetUserId,
    eventType: "MEMBERSHIP_REVOKED",
    metadata: { revokedBy: actingUserId },
  });
}
