import assert from "assert";
import { RegistrationApplicationStatus } from "@prisma/client";
import { prisma } from "../../src/lib/database/prisma";
import {
  submitSchoolRegistration,
  verifyRegistrationEmailOtp,
  verifyRegistrationMobileOtp,
  reviewRegistrationApplication,
  activateAdminAccount,
  RegistrationError,
} from "../../src/lib/services/registration";
import { sha256Hash } from "../../src/lib/security/hashing";

export async function runRegistrationTests() {
  console.log("  Running School Registration & Approval Workflow Tests...");

  await prisma.rateLimitBucket.deleteMany({
    where: { key: { contains: "reg:ip" } },
  });
  const testIp = `192.168.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

  const timestamp = Date.now();
  const schoolEmail = `reg-school-${timestamp}@test.edu.in`;
  const adminEmail = `reg-admin-${timestamp}@test.edu.in`;

  // 1. Submit Registration
  const submission = await submitSchoolRegistration({
    schoolName: "Test Gurukul Academy",
    schoolEmail,
    contactMobile: "9876543210",
    address: "100 Vidya Marg, Knowledge Park",
    city: "Nagpur",
    state: "Maharashtra",
    pincode: "440001",
    boardType: "CBSE",
    affiliationNumber: "CBSE-TEST-9999",
    adminFullName: "Acharya Someshwar",
    adminEmail,
    adminMobile: "9876543211",
    adminPassword: "SecureAdminPassword123!",
  }, testIp);

  assert.ok(submission.applicationId, "Application ID must be generated");
  assert.strictEqual(submission.status, RegistrationApplicationStatus.PENDING);
  console.log("    ✓ Public school registration submission verified (Status: PENDING)");

  // 2. Duplicate submission rejection
  let duplicateRejected = false;
  try {
    await submitSchoolRegistration({
      schoolName: "Duplicate Attempt Academy",
      schoolEmail, // duplicate email
      contactMobile: "9876543210",
      address: "100 Vidya Marg",
      city: "Nagpur",
      state: "Maharashtra",
      pincode: "440001",
      boardType: "CBSE",
      adminFullName: "Acharya Duplicate",
      adminEmail: `other-${timestamp}@test.edu.in`,
      adminMobile: "9876543212",
      adminPassword: "SecureAdminPassword123!",
    }, testIp);
  } catch (err: unknown) {
    duplicateRejected = true;
    assert.ok(err instanceof RegistrationError);
    assert.match((err as Error).message, /already registered or undergoing review/i);
  }
  assert.strictEqual(duplicateRejected, true, "Duplicate registration must be rejected");
  console.log("    ✓ Duplicate registration rejection verified");

  // 3. Approval before verification must fail closed
  let unverifiedApprovalBlocked = false;
  try {
    await reviewRegistrationApplication(submission.applicationId, "reviewer-super-1", "APPROVE");
  } catch (err: unknown) {
    unverifiedApprovalBlocked = true;
    assert.ok(err instanceof RegistrationError);
    assert.match((err as Error).message, /Email and mobile must both be verified/i);
  }
  assert.strictEqual(unverifiedApprovalBlocked, true, "Unverified application approval must fail closed");
  console.log("    ✓ Approval of unverified application blocked");

  // 4. Verify Email OTP & Mobile OTP
  // We locate the generated OTPs via their known test tokens
  // In test environment we set known tokens for deterministic execution
  const testEmailOtp = "123456";
  const testMobileOtp = "654321";

  await prisma.verificationToken.create({
    data: {
      identifier: `${submission.applicationId}:EMAIL`,
      purpose: "EMAIL_VERIFICATION",
      tokenHash: sha256Hash(testEmailOtp),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: `${submission.applicationId}:MOBILE`,
      purpose: "MOBILE_OTP",
      tokenHash: sha256Hash(testMobileOtp),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const emailVerifyRes = await verifyRegistrationEmailOtp(submission.applicationId, testEmailOtp);
  assert.strictEqual(emailVerifyRes.success, true);
  assert.strictEqual(emailVerifyRes.status, RegistrationApplicationStatus.PENDING); // Mobile not yet verified

  const mobileVerifyRes = await verifyRegistrationMobileOtp(submission.applicationId, testMobileOtp);
  assert.strictEqual(mobileVerifyRes.success, true);
  assert.strictEqual(mobileVerifyRes.status, RegistrationApplicationStatus.UNDER_REVIEW); // Both verified!
  console.log("    ✓ Email & Mobile OTP verification completed (Status -> UNDER_REVIEW)");

  // 5. Self-approval blocked
  let selfApprovalBlocked = false;
  try {
    await reviewRegistrationApplication(submission.applicationId, adminEmail, "APPROVE");
  } catch (err: unknown) {
    selfApprovalBlocked = true;
    assert.ok(err instanceof RegistrationError);
    assert.match((err as Error).message, /Self-approval prohibited/i);
  }
  assert.strictEqual(selfApprovalBlocked, true, "Applicant self-approval must be rejected");
  console.log("    ✓ Applicant self-approval prohibition verified");

  // 6. Reviewer requests documents
  const docReqRes = await reviewRegistrationApplication(
    submission.applicationId,
    "reviewer-platform-1",
    "REQUEST_DOCUMENTS",
    { requestedDocuments: "Trust Registration Certificate required." }
  );
  assert.strictEqual(docReqRes.status, RegistrationApplicationStatus.DOCUMENTS_REQUESTED);
  console.log("    ✓ Review lifecycle: DOCUMENTS_REQUESTED verified");

  // 7. Legitimate reviewer approves school
  const approvalRes = await reviewRegistrationApplication(
    submission.applicationId,
    "reviewer-platform-1",
    "APPROVE",
    { notes: "All compliance documents verified." }
  );
  assert.strictEqual(approvalRes.status, RegistrationApplicationStatus.APPROVED);
  assert.ok(approvalRes.schoolId, "Approved schoolId must be returned");

  // Verify created school, user, membership, academic year
  const createdSchool = await prisma.school.findUnique({
    where: { id: approvalRes.schoolId },
    include: {
      memberships: { include: { user: true } },
      academicYears: true,
    },
  });

  assert.ok(createdSchool, "School record must be created in DB");
  assert.strictEqual(createdSchool.status, "ACTIVE");
  assert.strictEqual(createdSchool.memberships.length, 1);
  assert.strictEqual(createdSchool.memberships[0].role, "ADMIN");
  assert.strictEqual(createdSchool.memberships[0].user.email, adminEmail);
  assert.ok(createdSchool.academicYears.length >= 1, "Academic year must be provisioned");
  console.log("    ✓ School approval execution verified (School, Admin User, Membership, AcademicYear created)");

  // 8. Initial Administrator activation with OTP
  const knownActivationOtp = "777888";
  await prisma.verificationToken.create({
    data: {
      identifier: `${submission.applicationId}:ACTIVATION`,
      purpose: "ADMIN_ACTIVATION",
      tokenHash: sha256Hash(knownActivationOtp),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });

  const activationRes = await activateAdminAccount(submission.applicationId, knownActivationOtp);
  assert.strictEqual(activationRes.success, true);
  assert.strictEqual(activationRes.schoolId, createdSchool.id);
  console.log("    ✓ Initial Administrator OTP activation verified");

  // Cleanup test artifacts
  await prisma.academicYear.deleteMany({ where: { schoolId: createdSchool.id } });
  await prisma.schoolMembership.deleteMany({ where: { schoolId: createdSchool.id } });
  await prisma.schoolRegistrationApplication.delete({ where: { id: submission.applicationId } });
  await prisma.school.delete({ where: { id: createdSchool.id } });
  await prisma.user.delete({ where: { email: adminEmail } });
  await prisma.verificationToken.deleteMany({ where: { identifier: { contains: submission.applicationId } } });
}
