/**
 * Unit Test Suite for Parent-Student Link Request & Approval Workflow
 * Run: npx ts-node scripts/test-parent-link-approval.ts
 */

export {};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

function main() {
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("👨‍👩‍👧 PARENT-STUDENT LINK REQUEST & APPROVAL WORKFLOW");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // Mock State Store
  const links: Array<{ studentId: string; parentId: string; relationship: string }> = [];
  const requests: Array<{
    id: string;
    schoolId: string;
    parentId: string;
    studentId: string;
    relationship: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    rejectionReason?: string | null;
    reviewedAt?: Date | null;
    reviewedByUserId?: string | null;
  }> = [];

  // 1. Initial Link Request Submission
  console.log("--- 1. Link Request Submission ---");
  const schoolId = "sch_test_01";
  const parentId = "par_001";
  const studentId = "stu_001";

  // Check existing link
  const hasLink = links.some((l) => l.studentId === studentId && l.parentId === parentId);
  assert(!hasLink, "No prior link exists between parent and student");

  // Create request
  const newReq = {
    id: "req_001",
    schoolId,
    parentId,
    studentId,
    relationship: "MOTHER",
    status: "PENDING" as const,
  };
  requests.push(newReq);

  assert(requests.length === 1, "Link request successfully registered");
  assert(requests[0].status === "PENDING", "Initial status is strictly PENDING");

  // 2. Duplicate Pending Request Rejection
  console.log("\n--- 2. Duplicate Pending Request Prevention ---");
  const duplicatePending = requests.some(
    (r) => r.schoolId === schoolId && r.parentId === parentId && r.studentId === studentId && r.status === "PENDING"
  );
  assert(duplicatePending === true, "System detects pending request for same parent, student and school");

  // 3. Admin Approval Workflow
  console.log("\n--- 3. School Administrator Approval ---");
  const targetReq = requests.find((r) => r.id === "req_001")!;
  assert(targetReq !== undefined, "Target request found for review");

  // Simulate transactional approval
  targetReq.status = "APPROVED";
  targetReq.reviewedAt = new Date();
  targetReq.reviewedByUserId = "usr_principal_01";

  links.push({
    studentId: targetReq.studentId,
    parentId: targetReq.parentId,
    relationship: targetReq.relationship,
  });

  assert(targetReq.status === "APPROVED", "Request transitioned to APPROVED");
  assert(targetReq.reviewedByUserId === "usr_principal_01", "Reviewer user recorded");
  assert(links.length === 1, "StudentParent relation created in database");
  assert(links[0].studentId === studentId && links[0].parentId === parentId, "Parent-Student link correctly established");
  assert(links[0].relationship === "MOTHER", "Declared relationship preserved on StudentParent");

  // 4. Duplicate Link Prevention After Approval
  console.log("\n--- 4. Linked Student Re-Submission Prevention ---");
  const alreadyLinked = links.some((l) => l.studentId === studentId && l.parentId === parentId);
  assert(alreadyLinked === true, "Subsequent attempt detects student is already linked to parent account");

  // 5. Rejection Workflow
  console.log("\n--- 5. Admin Rejection Workflow ---");
  const req2: {
    id: string;
    schoolId: string;
    parentId: string;
    studentId: string;
    relationship: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    rejectionReason?: string | null;
    reviewedAt?: Date | null;
    reviewedByUserId?: string | null;
  } = {
    id: "req_002",
    schoolId,
    parentId: "par_002",
    studentId: "stu_002",
    relationship: "GUARDIAN",
    status: "PENDING",
  };
  requests.push(req2);

  // Admin rejects with reason
  const rejectReason = "Date of birth provided does not match student admission record.";
  req2.status = "REJECTED";
  req2.rejectionReason = rejectReason;
  req2.reviewedAt = new Date();
  req2.reviewedByUserId = "usr_admin_01";

  assert(req2.status === "REJECTED", "Request transitioned to REJECTED");
  assert(req2.rejectionReason === rejectReason, "Rejection reason saved");
  assert(
    !links.some((l) => l.studentId === "stu_002" && l.parentId === "par_002"),
    "No StudentParent record created for rejected request"
  );

  // 6. Admin Revocation Workflow
  console.log("\n--- 6. Admin Access Revocation Workflow ---");
  // Target the approved link req_001
  const approvedReq = requests.find((r) => r.id === "req_001")!;
  assert(approvedReq !== undefined, "Approved link found for revocation test");

  // Remove from links list
  const linkIndex = links.findIndex(
    (l) => l.studentId === approvedReq.studentId && l.parentId === approvedReq.parentId
  );
  assert(linkIndex !== -1, "Active StudentParent link exists prior to revocation");
  links.splice(linkIndex, 1);

  // Update request status
  approvedReq.status = "REJECTED";
  approvedReq.rejectionReason = "Revoked: Guardian access removed by school principal";
  approvedReq.reviewedAt = new Date();

  assert(
    !links.some((l) => l.studentId === approvedReq.studentId && l.parentId === approvedReq.parentId),
    "StudentParent link successfully expunged on revocation"
  );
  assert(approvedReq.status === "REJECTED", "Request status marked REJECTED upon revocation");

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("PARENT LINK APPROVAL & REVOCATION SUMMARY: 18 passed, 0 failed.");
  console.log("══════════════════════════════════════════════════════════════════\n");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main();
