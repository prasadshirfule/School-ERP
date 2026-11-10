import { GuardianRelationship, GuardianVerificationStatus, Role } from "@prisma/client";
import { prisma } from "../database/prisma";
import { withTenantContext } from "../tenant";
import { hashPassword } from "../security/hashing";
import { logSecurityEvent } from "../security/events";
import { ParentRegistrationInput, ParentRegistrationSchema } from "../validation/auth";

export class ParentSecurityError extends Error {
  constructor(message: string) {
    super(`[PARENT_SECURITY_ERROR] ${message}`);
    this.name = "ParentSecurityError";
  }
}

/**
 * 1. Self-register a parent account.
 * Creates User with role PARENT and creates a ParentProfile.
 */
export async function registerParentAccount(
  input: ParentRegistrationInput,
  clientIp?: string,
  userAgent?: string
): Promise<{ userId: string; parentProfileId: string }> {
  const validated = ParentRegistrationSchema.parse(input);

  const existingUser = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (existingUser) {
    throw new ParentSecurityError("An account with this email address already exists.");
  }

  const passwordHash = await hashPassword(validated.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: validated.fullName,
        email: validated.email,
        phone: validated.phone,
        passwordHash,
        role: Role.PARENT,
        isActive: true,
      },
    });

    const parentProfile = await tx.parentProfile.create({
      data: {
        userId: user.id,
        fullName: validated.fullName,
        email: validated.email,
        phone: validated.phone,
      },
    });

    return { user, parentProfile };
  });

  await logSecurityEvent({
    userId: result.user.id,
    eventType: "PARENT_REGISTERED",
    ipAddress: clientIp,
    userAgent,
    metadata: { email: validated.email, phone: validated.phone },
  });

  return {
    userId: result.user.id,
    parentProfileId: result.parentProfile.id,
  };
}

/**
 * 2. Request linking a child to a parent account.
 * Crucial security boundary:
 * Merely knowing an admission number DOES NOT grant access!
 * Status is set to PENDING until authorized school staff verifies the relationship.
 */
export async function requestChildLink(
  parentUserId: string,
  schoolId: string,
  admissionNo: string,
  relationship: GuardianRelationship = GuardianRelationship.FATHER
): Promise<{
  guardianId: string;
  verificationStatus: GuardianVerificationStatus;
  message: string;
}> {
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: parentUserId },
  });

  if (!parentProfile) {
    throw new ParentSecurityError("Parent profile not found.");
  }

  // Execute tenant-scoped student lookup and linking inside withTenantContext
  const linkResult = await withTenantContext(schoolId, async (tenantTx) => {
    // Find student in specific school
    const student = await tenantTx.student.findUnique({
      where: {
        schoolId_admissionNo: {
          schoolId,
          admissionNo: admissionNo.trim(),
        },
      },
    });

    if (!student) {
      throw new ParentSecurityError("Student record not found in this institution.");
    }

    // Check if link already exists
    const existingLink = await tenantTx.studentGuardian.findUnique({
      where: {
        studentId_parentProfileId: {
          studentId: student.id,
          parentProfileId: parentProfile.id,
        },
      },
    });

    if (existingLink) {
      if (existingLink.verificationStatus === GuardianVerificationStatus.VERIFIED) {
        throw new ParentSecurityError("Student is already verified and linked to your account.");
      }
      if (existingLink.verificationStatus === GuardianVerificationStatus.PENDING) {
        return {
          guardianId: existingLink.id,
          verificationStatus: existingLink.verificationStatus,
          message: "A relationship verification request is already pending school administrator approval.",
          studentId: student.id,
          admissionNo: student.admissionNo,
          isExisting: true,
        };
      }
    }

    // Create or update link in PENDING state
    const guardian = await tenantTx.studentGuardian.upsert({
      where: {
        studentId_parentProfileId: {
          studentId: student.id,
          parentProfileId: parentProfile.id,
        },
      },
      create: {
        schoolId,
        studentId: student.id,
        parentProfileId: parentProfile.id,
        relationship,
        verificationStatus: GuardianVerificationStatus.PENDING,
        isAuthorizedPickup: true,
      },
      update: {
        verificationStatus: GuardianVerificationStatus.PENDING,
        relationship,
      },
    });

    // Ensure parent has a membership record for this school
    await tenantTx.schoolMembership.upsert({
      where: {
        schoolId_userId: {
          schoolId,
          userId: parentUserId,
        },
      },
      create: {
        schoolId,
        userId: parentUserId,
        role: Role.PARENT,
        isPrimary: false,
        isActive: true,
      },
      update: {
        isActive: true,
      },
    });

    return {
      guardianId: guardian.id,
      verificationStatus: GuardianVerificationStatus.PENDING,
      message: "Child linking request submitted. Access will be granted once institution administrators verify your relationship.",
      studentId: student.id,
      admissionNo: student.admissionNo,
      isExisting: false,
    };
  });

  if (!linkResult.isExisting) {
    await logSecurityEvent({
      schoolId,
      userId: parentUserId,
      eventType: "CHILD_LINK_REQUESTED",
      metadata: {
        studentId: linkResult.studentId,
        admissionNo: linkResult.admissionNo,
        relationship,
      },
    });
  }

  return {
    guardianId: linkResult.guardianId,
    verificationStatus: linkResult.verificationStatus,
    message: linkResult.message,
  };
}

/**
 * 3. Verify a guardian relationship (Authorized school staff only).
 */
export async function verifyChildLink(
  guardianId: string,
  schoolId: string,
  reviewerUserId: string
): Promise<{ success: boolean; message: string }> {
  return withTenantContext(schoolId, async (tenantTx) => {
    const link = await tenantTx.studentGuardian.findFirst({
      where: { id: guardianId, schoolId },
      include: { student: true, parentProfile: true },
    });

    if (!link) {
      throw new ParentSecurityError("Guardian linking request not found in this institution.");
    }

    await tenantTx.studentGuardian.update({
      where: { id: guardianId },
      data: {
        verificationStatus: GuardianVerificationStatus.VERIFIED,
      },
    });

    await logSecurityEvent({
      schoolId,
      userId: reviewerUserId,
      eventType: "CHILD_LINK_VERIFIED",
      metadata: {
        guardianId,
        studentId: link.studentId,
        parentProfileId: link.parentProfileId,
      },
    });

    return {
      success: true,
      message: `Relationship verified. Guardian has been granted authorized access to ${link.student.fullName}.`,
    };
  });
}

/**
 * 4. Revoke a guardian's access to a student.
 */
export async function revokeChildLink(
  guardianId: string,
  schoolId: string,
  reason: string,
  reviewerUserId: string
): Promise<{ success: boolean; message: string }> {
  return withTenantContext(schoolId, async (tenantTx) => {
    const link = await tenantTx.studentGuardian.findFirst({
      where: { id: guardianId, schoolId },
    });

    if (!link) {
      throw new ParentSecurityError("Guardian record not found.");
    }

    await tenantTx.studentGuardian.update({
      where: { id: guardianId },
      data: {
        verificationStatus: GuardianVerificationStatus.REVOKED,
      },
    });

    await logSecurityEvent({
      schoolId,
      userId: reviewerUserId,
      eventType: "CHILD_LINK_REVOKED",
      metadata: { guardianId, reason },
    });

    return {
      success: true,
      message: "Guardian access to student has been successfully revoked.",
    };
  });
}

/**
 * 5. Retrieve authorized linked children for a parent user.
 * Filters strictly by verificationStatus === VERIFIED.
 */
export async function getAuthorizedChildren(
  parentUserId: string,
  schoolId: string
) {
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: parentUserId },
  });

  if (!parentProfile) {
    return [];
  }

  return withTenantContext(schoolId, async (tenantTx) => {
    const verifiedGuardians = await tenantTx.studentGuardian.findMany({
      where: {
        schoolId,
        parentProfileId: parentProfile.id,
        verificationStatus: GuardianVerificationStatus.VERIFIED, // Strictly verified links only
      },
      include: {
        student: {
          include: {
            section: {
              include: {
                class: true,
              },
            },
          },
        },
      },
    });

    return verifiedGuardians.map((g) => ({
      studentId: g.student.id,
      admissionNo: g.student.admissionNo,
      fullName: g.student.fullName,
      className: g.student.section?.class.name,
      sectionName: g.student.section?.name,
      relationship: g.relationship,
      isPrimary: g.isPrimary,
    }));
  });
}
