import assert from "assert";
import { GuardianRelationship, GuardianVerificationStatus } from "@prisma/client";
import { prisma } from "../../src/lib/database/prisma";
import {
  registerParentAccount,
  requestChildLink,
  verifyChildLink,
  revokeChildLink,
  getAuthorizedChildren,
} from "../../src/lib/services/parent";

export async function runParentTests() {
  console.log("  Running Parent Account & Guardian Security Tests...");

  const timestamp = Date.now();
  const parentEmail = `parent-${timestamp}@test.edu.in`;

  // Retrieve School 1 and its seeded students
  const school1 = await prisma.school.findFirst({
    where: { name: { contains: "Aryabhata" } },
    include: {
      students: true,
    },
  });
  assert.ok(school1 && school1.students.length >= 1, "School 1 must have at least 1 seeded student");
  const studentA = school1.students[0];

  // Provision second student in School 1 for multi-child linking verification
  const studentB = await prisma.student.create({
    data: {
      schoolId: school1.id,
      admissionNo: `ADM-TEST-${timestamp}`,
      admissionDate: new Date(),
      fullName: "Ananya Sharma",
      gender: "FEMALE",
      status: "ACTIVE",
    },
  });

  // 1. Parent registration
  const registration = await registerParentAccount({
    fullName: "Shri Narayan Murthy",
    email: parentEmail,
    phone: "9876500001",
    password: "SecureParentPassword123!",
  });

  assert.ok(registration.userId, "Parent user ID created");
  assert.ok(registration.parentProfileId, "ParentProfile ID created");

  const parentUser = await prisma.user.findUnique({
    where: { id: registration.userId },
    include: { parentProfile: true },
  });
  assert.strictEqual(parentUser?.role, "PARENT");
  assert.ok(parentUser?.parentProfile, "Parent profile must be linked");
  console.log("    ✓ Parent self-registration verified (Role: PARENT, ParentProfile created)");

  // 2. Child linking request (Crucial security boundary: enters PENDING status)
  const linkRequest = await requestChildLink(
    registration.userId,
    school1.id,
    studentA.admissionNo,
    GuardianRelationship.FATHER
  );

  assert.strictEqual(linkRequest.verificationStatus, GuardianVerificationStatus.PENDING);
  console.log("    ✓ Child link request created in strictly PENDING status");

  // 3. Unverified link security: child must NOT appear in authorized children
  const unverifiedChildren = await getAuthorizedChildren(registration.userId, school1.id);
  assert.strictEqual(
    unverifiedChildren.length,
    0,
    "Unverified student must NOT be accessible to parent"
  );
  console.log("    ✓ Unverified child access blocked (Zero leaks before school verification)");

  // 4. Authorized school staff verifies link
  const verifyRes = await verifyChildLink(
    linkRequest.guardianId,
    school1.id,
    "staff-admin-id"
  );
  assert.strictEqual(verifyRes.success, true);

  // Now student must be accessible!
  const verifiedChildren = await getAuthorizedChildren(registration.userId, school1.id);
  assert.strictEqual(verifiedChildren.length, 1);
  assert.strictEqual(verifiedChildren[0].studentId, studentA.id);
  assert.strictEqual(verifiedChildren[0].admissionNo, studentA.admissionNo);
  console.log("    ✓ School-side relationship verification verified (Access granted)");

  // 5. Multi-child linking (linking a second child)
  const linkRequestB = await requestChildLink(
    registration.userId,
    school1.id,
    studentB.admissionNo,
    GuardianRelationship.FATHER
  );
  await verifyChildLink(linkRequestB.guardianId, school1.id, "staff-admin-id");

  const multiChildren = await getAuthorizedChildren(registration.userId, school1.id);
  assert.strictEqual(multiChildren.length, 2, "Parent must now have 2 authorized children");
  console.log("    ✓ Multi-child authorized linking verified (Multiple children linked)");

  // 6. Access revocation
  const revokeRes = await revokeChildLink(
    linkRequest.guardianId,
    school1.id,
    "Guardian access revoked upon formal custodial request",
    "staff-admin-id"
  );
  assert.strictEqual(revokeRes.success, true);

  const postRevokeChildren = await getAuthorizedChildren(registration.userId, school1.id);
  assert.strictEqual(postRevokeChildren.length, 1, "Revoked child must be immediately removed");
  assert.strictEqual(postRevokeChildren[0].studentId, studentB.id);
  console.log("    ✓ Guardian access revocation verified (Instant access cutoff)");

  // Cleanup test artifacts
  await prisma.studentGuardian.deleteMany({
    where: { parentProfileId: registration.parentProfileId },
  });
  await prisma.student.delete({ where: { id: studentB.id } });
  await prisma.parentProfile.delete({ where: { id: registration.parentProfileId } });
  await prisma.schoolMembership.deleteMany({ where: { userId: registration.userId } });
  await prisma.user.delete({ where: { id: registration.userId } });
}
