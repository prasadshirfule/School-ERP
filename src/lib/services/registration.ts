import { RegistrationApplicationStatus, Role, SchoolStatus, VerificationPurpose } from "@prisma/client";
import { prisma } from "../database/prisma";
import { hashPassword } from "../security/hashing";
import { createVerificationToken, verifyVerificationToken } from "../security/tokens";
import { checkRateLimit } from "../security/rateLimit";
import { logSecurityEvent } from "../security/events";
import { emailService } from "../notifications/email";
import { smsService } from "../notifications/sms";
import {
  SchoolRegistrationApplicationInput,
  SchoolRegistrationApplicationSchema,
} from "../validation/auth";

export class RegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationError";
  }
}

/**
 * 1. Submit a public school registration application.
 * Prevents duplicates, creates pending application, issues email and mobile verification OTPs.
 */
export async function submitSchoolRegistration(
  input: SchoolRegistrationApplicationInput,
  clientIp?: string,
  userAgent?: string
): Promise<{ applicationId: string; status: RegistrationApplicationStatus }> {
  // Validate input
  const validated = SchoolRegistrationApplicationSchema.parse(input);

  // Rate limiting (max 5 registration submissions per hour per IP)
  const rateLimitKey = `reg:ip:${clientIp || "unknown"}`;
  const rateLimit = await checkRateLimit(rateLimitKey, { limit: 5, windowSeconds: 3600 });
  if (!rateLimit.allowed) {
    throw new RegistrationError("Too many registration attempts. Please try again later.");
  }

  // Duplicate checks across applications, schools, and users
  const [existingApp, existingSchool, existingUser] = await Promise.all([
    prisma.schoolRegistrationApplication.findFirst({
      where: {
        OR: [
          { schoolEmail: validated.schoolEmail },
          { adminEmail: validated.adminEmail },
        ],
      },
    }),
    prisma.school.findFirst({
      where: { email: validated.schoolEmail },
    }),
    prisma.user.findUnique({
      where: { email: validated.adminEmail },
    }),
  ]);

  if (existingApp || existingSchool || existingUser) {
    throw new RegistrationError(
      "A school or administrator with this email address is already registered or undergoing review."
    );
  }

  // Hash initial administrator password with bcrypt cost 12
  const adminPasswordHash = await hashPassword(validated.adminPassword);

  // Create registration application in PENDING state
  const application = await prisma.schoolRegistrationApplication.create({
    data: {
      schoolName: validated.schoolName,
      schoolEmail: validated.schoolEmail,
      contactMobile: validated.contactMobile,
      address: validated.address,
      city: validated.city,
      state: validated.state,
      pincode: validated.pincode,
      boardType: validated.boardType,
      affiliationNumber: validated.affiliationNumber,
      adminFullName: validated.adminFullName,
      adminEmail: validated.adminEmail,
      adminMobile: validated.adminMobile,
      adminPasswordHash,
      status: RegistrationApplicationStatus.PENDING,
    },
  });

  // Issue 6-digit email verification OTP
  const emailOtp = await createVerificationToken({
    identifier: `${application.id}:EMAIL`,
    purpose: VerificationPurpose.EMAIL_VERIFICATION,
    isNumericOtp: true,
    otpDigits: 6,
    ttlMinutes: 15,
    resendCooldownSeconds: 60,
    metadata: { applicationId: application.id, email: application.schoolEmail },
  });

  // Issue 6-digit mobile verification OTP
  const mobileOtp = await createVerificationToken({
    identifier: `${application.id}:MOBILE`,
    purpose: VerificationPurpose.MOBILE_OTP,
    isNumericOtp: true,
    otpDigits: 6,
    ttlMinutes: 15,
    resendCooldownSeconds: 60,
    metadata: { applicationId: application.id, mobile: application.contactMobile },
  });

  // Dispatch email notification
  await emailService.sendEmail({
    to: application.schoolEmail,
    subject: "Verify Your Vidyora School Registration",
    html: `
      <h2>Welcome to Vidyora</h2>
      <p>Thank you for registering <strong>${application.schoolName}</strong>.</p>
      <p>Your email verification code is: <strong>${emailOtp.token}</strong></p>
      <p>This code expires in 15 minutes.</p>
    `,
  });

  // Dispatch SMS notification (simulated/dev or Indian DLT)
  await smsService.sendSms({
    to: application.contactMobile,
    message: `Your Vidyora verification code is ${mobileOtp.token}. Valid for 15 mins. Do not share.`,
    templateId: "VIDYORA_OTP_VERIFY",
  });

  // Record audit security event
  await logSecurityEvent({
    eventType: "REGISTRATION_SUBMITTED",
    ipAddress: clientIp,
    userAgent,
    metadata: {
      applicationId: application.id,
      schoolName: application.schoolName,
      schoolEmail: application.schoolEmail,
      boardType: application.boardType,
    },
  });

  return {
    applicationId: application.id,
    status: application.status,
  };
}

/**
 * 2. Verify Email OTP for registration application.
 */
export async function verifyRegistrationEmailOtp(
  applicationId: string,
  otp: string
): Promise<{ success: boolean; status: RegistrationApplicationStatus; message: string }> {
  const application = await prisma.schoolRegistrationApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new RegistrationError("Application not found.");
  }

  const result = await verifyVerificationToken(
    `${application.id}:EMAIL`,
    VerificationPurpose.EMAIL_VERIFICATION,
    otp
  );

  if (!result.success) {
    return {
      success: false,
      status: application.status,
      message: result.error === "MAX_ATTEMPTS_EXCEEDED"
        ? "Maximum verification attempts exceeded. Please request a new code."
        : "Invalid or expired verification code.",
    };
  }

  // Update application email verification status
  const now = new Date();
  const willAdvance = application.mobileVerifiedAt !== null;
  const newStatus = willAdvance
    ? RegistrationApplicationStatus.UNDER_REVIEW
    : application.status;

  const updated = await prisma.schoolRegistrationApplication.update({
    where: { id: applicationId },
    data: {
      emailVerifiedAt: now,
      status: newStatus,
    },
  });

  await logSecurityEvent({
    eventType: "OTP_VERIFIED",
    metadata: { applicationId, type: "EMAIL", advancedToUnderReview: willAdvance },
  });

  return {
    success: true,
    status: updated.status,
    message: willAdvance
      ? "Email verified successfully! Both contacts verified — application is now under review."
      : "Email verified successfully! Please verify your contact mobile.",
  };
}

/**
 * 3. Verify Mobile OTP for registration application.
 */
export async function verifyRegistrationMobileOtp(
  applicationId: string,
  otp: string
): Promise<{ success: boolean; status: RegistrationApplicationStatus; message: string }> {
  const application = await prisma.schoolRegistrationApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new RegistrationError("Application not found.");
  }

  const result = await verifyVerificationToken(
    `${application.id}:MOBILE`,
    VerificationPurpose.MOBILE_OTP,
    otp
  );

  if (!result.success) {
    return {
      success: false,
      status: application.status,
      message: result.error === "MAX_ATTEMPTS_EXCEEDED"
        ? "Maximum verification attempts exceeded. Please request a new code."
        : "Invalid or expired verification code.",
    };
  }

  const now = new Date();
  const willAdvance = application.emailVerifiedAt !== null;
  const newStatus = willAdvance
    ? RegistrationApplicationStatus.UNDER_REVIEW
    : application.status;

  const updated = await prisma.schoolRegistrationApplication.update({
    where: { id: applicationId },
    data: {
      mobileVerifiedAt: now,
      status: newStatus,
    },
  });

  await logSecurityEvent({
    eventType: "OTP_VERIFIED",
    metadata: { applicationId, type: "MOBILE", advancedToUnderReview: willAdvance },
  });

  return {
    success: true,
    status: updated.status,
    message: willAdvance
      ? "Mobile verified successfully! Both contacts verified — application is now under review."
      : "Mobile verified successfully! Please verify your school email.",
  };
}

/**
 * 4. Review a registration application.
 * Enforces:
 * - Reviewer cannot be applicant (no self-approval)
 * - Both email and mobile must be verified before approval
 * - On approval: activates school, user, membership, academic year, and issues activation OTP.
 */
export async function reviewRegistrationApplication(
  applicationId: string,
  reviewerId: string,
  action: "REQUEST_DOCUMENTS" | "REJECT" | "APPROVE",
  options?: {
    notes?: string;
    requestedDocuments?: string;
    rejectionReason?: string;
  }
): Promise<{ status: RegistrationApplicationStatus; schoolId?: string }> {
  const application = await prisma.schoolRegistrationApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new RegistrationError("Application not found.");
  }

  // Prevent applicant self-approval
  if (reviewerId === application.adminEmail || reviewerId === application.id) {
    throw new RegistrationError("Self-approval prohibited: Applicant cannot review or approve their own school.");
  }

  if (action === "REQUEST_DOCUMENTS") {
    const updated = await prisma.schoolRegistrationApplication.update({
      where: { id: applicationId },
      data: {
        status: RegistrationApplicationStatus.DOCUMENTS_REQUESTED,
        reviewedBy: reviewerId,
        reviewNotes: options?.notes,
        requestedDocuments: options?.requestedDocuments || "Affiliation certificates and institution registration proof required.",
      },
    });
    return { status: updated.status };
  }

  if (action === "REJECT") {
    const updated = await prisma.schoolRegistrationApplication.update({
      where: { id: applicationId },
      data: {
        status: RegistrationApplicationStatus.REJECTED,
        reviewedBy: reviewerId,
        reviewNotes: options?.notes,
        rejectionReason: options?.rejectionReason || "Application did not meet registration criteria.",
      },
    });

    await logSecurityEvent({
      eventType: "REGISTRATION_REJECTED",
      metadata: { applicationId, reviewerId, reason: options?.rejectionReason },
    });

    return { status: updated.status };
  }

  // Action: APPROVE
  if (!application.emailVerifiedAt || !application.mobileVerifiedAt) {
    throw new RegistrationError("Cannot approve school application: Email and mobile must both be verified first.");
  }

  // Execute approval transaction
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const academicYearName = `${currentYear}-${String(nextYear).slice(-2)}`;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create School
    const school = await tx.school.create({
      data: {
        name: application.schoolName,
        boardType: application.boardType,
        address: `${application.address}, ${application.city}, ${application.state} - ${application.pincode}`,
        email: application.schoolEmail,
        phone: application.contactMobile,
        affiliationNumber: application.affiliationNumber,
        status: SchoolStatus.ACTIVE,
      },
    });

    // 2. Create Initial Administrator User
    const user = await tx.user.create({
      data: {
        fullName: application.adminFullName,
        email: application.adminEmail,
        phone: application.adminMobile,
        passwordHash: application.adminPasswordHash,
        role: Role.ADMIN,
        isActive: true,
      },
    });

    // 3. Create Primary SchoolMembership
    await tx.schoolMembership.create({
      data: {
        schoolId: school.id,
        userId: user.id,
        role: Role.ADMIN,
        isPrimary: true,
        isActive: true,
      },
    });

    // 4. Create Initial Academic Year
    await tx.academicYear.create({
      data: {
        schoolId: school.id,
        name: academicYearName,
        startDate: new Date(`${currentYear}-04-01`),
        endDate: new Date(`${nextYear}-03-31`),
        isCurrent: true,
      },
    });

    // 5. Update Application
    await tx.schoolRegistrationApplication.update({
      where: { id: applicationId },
      data: {
        status: RegistrationApplicationStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewNotes: options?.notes,
        createdSchoolId: school.id,
      },
    });

    return { school, user };
  });

  // Issue Admin activation OTP (6 digits)
  const activationOtp = await createVerificationToken({
    identifier: `${application.id}:ACTIVATION`,
    purpose: VerificationPurpose.ADMIN_ACTIVATION,
    isNumericOtp: true,
    otpDigits: 6,
    ttlMinutes: 60 * 24, // 24 hours
    resendCooldownSeconds: 60,
    metadata: {
      applicationId: application.id,
      schoolId: result.school.id,
      adminEmail: application.adminEmail,
    },
  });

  // Send activation instructions
  await emailService.sendEmail({
    to: application.adminEmail,
    subject: "Vidyora School Approved — Initial Administrator Activation",
    html: `
      <h2>Congratulations!</h2>
      <p>Your school <strong>${application.schoolName}</strong> has been approved on Vidyora.</p>
      <p>Your initial Administrator activation code is: <strong>${activationOtp.token}</strong></p>
      <p>Login to your Vidyora portal to begin managing your school.</p>
    `,
  });

  await logSecurityEvent({
    schoolId: result.school.id,
    userId: result.user.id,
    eventType: "REGISTRATION_APPROVED",
    metadata: { applicationId, reviewerId },
  });

  return {
    status: RegistrationApplicationStatus.APPROVED,
    schoolId: result.school.id,
  };
}

/**
 * 5. Verify initial administrator activation code.
 */
export async function activateAdminAccount(
  applicationId: string,
  otp: string
): Promise<{ success: boolean; schoolId?: string; message: string }> {
  const application = await prisma.schoolRegistrationApplication.findUnique({
    where: { id: applicationId },
    include: { createdSchool: true },
  });

  if (!application || !application.createdSchoolId) {
    throw new RegistrationError("Application not found or not yet approved.");
  }

  const result = await verifyVerificationToken(
    `${application.id}:ACTIVATION`,
    VerificationPurpose.ADMIN_ACTIVATION,
    otp
  );

  if (!result.success) {
    return {
      success: false,
      message: "Invalid or expired activation code.",
    };
  }

  await logSecurityEvent({
    schoolId: application.createdSchoolId,
    eventType: "ADMIN_ACTIVATED",
    metadata: { applicationId, adminEmail: application.adminEmail },
  });

  return {
    success: true,
    schoolId: application.createdSchoolId,
    message: "Administrator account activated successfully! You may now sign in.",
  };
}
