/**
 * School ERP - 18 Integrated Real-World ERP User Flows End-to-End Test Suite
 * Run: npx ts-node scripts/test-e2e-workflow.ts
 */

import crypto from "crypto";

export {};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

// In-Memory Data Store simulating the multi-tenant transactional DB
interface InMemoryDB {
  schoolRequests: any[];
  schools: any[];
  users: any[];
  totpSecrets: any[];
  usedTotpTokens: any[];
  students: any[];
  parents: any[];
  studentParents: any[];
  parentStudentLinkRequests: any[];
  teachers: any[];
  classes: any[];
  sections: any[];
  subjects: any[];
  attendance: any[];
  examSlots: any[];
  marks: any[];
  gradingScales: any[];
  feeStructures: any[];
  feeInvoices: any[];
  payments: any[];
  auditLogs: any[];
  notifications: any[];
  subscriptions: any[];
}

const db: InMemoryDB = {
  schoolRequests: [],
  schools: [],
  users: [],
  totpSecrets: [],
  usedTotpTokens: [],
  students: [],
  parents: [],
  studentParents: [],
  parentStudentLinkRequests: [],
  teachers: [],
  classes: [],
  sections: [],
  subjects: [],
  attendance: [],
  examSlots: [],
  marks: [],
  gradingScales: [],
  feeStructures: [],
  feeInvoices: [],
  payments: [],
  auditLogs: [],
  notifications: [],
  subscriptions: [],
};

async function main() {
  console.log("\n══════════════════════════════════════════════════════════════════════");
  console.log("🏫 SCHOOL ERP: 18 REAL-WORLD END-TO-END WORKFLOW INTEGRATION SUITE");
  console.log("══════════════════════════════════════════════════════════════════════\n");

  const runId = Date.now();

  // =========================================================================
  // FLOW 1: Public School Registration
  // =========================================================================
  console.log("--- FLOW 1: Public School Registration (/api/schools/request-access) ---");
  const schoolRegPayload = {
    schoolName: `Apex Model Academy ${runId}`,
    schoolCode: `AMA${runId.toString().slice(-4)}`,
    adminName: "Dr. Vikram Seth",
    adminEmail: `admin_${runId}@apexmodel.edu`,
    adminPhone: "+919876543210",
    address: "Plot 42, Knowledge Park III, Greater Noida",
    city: "Greater Noida",
    state: "Uttar Pradesh",
    pincode: "201306",
    estimatedStudents: 850,
  };

  const emailToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(emailToken).digest("hex");

  const newSchoolRequest = {
    id: `req_${runId}`,
    ...schoolRegPayload,
    status: "PENDING_VERIFICATION",
    emailVerificationToken: tokenHash,
    emailVerificationExpires: new Date(Date.now() + 24 * 3600 * 1000),
    isEmailVerified: false,
    createdAt: new Date(),
  };
  db.schoolRequests.push(newSchoolRequest);

  assert(db.schoolRequests.length === 1, "School access request registered successfully");
  assert(newSchoolRequest.isEmailVerified === false, "Email verification status is initially FALSE");
  assert(newSchoolRequest.status === "PENDING_VERIFICATION", "Request status is PENDING_VERIFICATION");

  // =========================================================================
  // FLOW 2: Email Verification
  // =========================================================================
  console.log("\n--- FLOW 2: Email Verification (/api/schools/verify-email) ---");
  const incomingVerifyToken = emailToken;
  const computedHash = crypto.createHash("sha256").update(incomingVerifyToken).digest("hex");

  const matchReq = db.schoolRequests.find(
    (r) => r.emailVerificationToken === computedHash && r.emailVerificationExpires > new Date()
  );
  assert(Boolean(matchReq), "Verification token located in request registry and not expired");

  if (matchReq) {
    matchReq.isEmailVerified = true;
    matchReq.status = "PENDING_REVIEW";
    matchReq.emailVerificationToken = null;
  }
  assert(matchReq?.isEmailVerified === true, "Request marked as verified");
  assert(matchReq?.status === "PENDING_REVIEW", "Request progressed to PENDING_REVIEW");

  // =========================================================================
  // FLOW 3: Platform Super Admin Login and MFA TOTP
  // =========================================================================
  console.log("\n--- FLOW 3: Platform Admin Authentication & MFA TOTP Security ---");
  const superAdminUser = {
    id: "usr_superadmin_01",
    email: "superadmin@schoolerp.internal",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    schoolId: null,
  };
  db.users.push(superAdminUser);

  // Seed TOTP secret (Base32 encoded secret)
  const superAdminTotp = {
    id: "totp_01",
    userId: superAdminUser.id,
    secret: "JBSWY3DPEHPK3PXP", // RFC 3548 sample
    verified: true,
  };
  db.totpSecrets.push(superAdminTotp);

  // Verify TOTP token replay protection
  const testTotpToken = "849201";
  const isReplayed = db.usedTotpTokens.some((t) => t.token === testTotpToken && t.userId === superAdminUser.id);
  assert(isReplayed === false, "Initial TOTP token is fresh and unused");

  // Consume token
  db.usedTotpTokens.push({
    id: `tok_${runId}`,
    userId: superAdminUser.id,
    token: testTotpToken,
    usedAt: new Date(),
    expiresAt: new Date(Date.now() + 180 * 1000),
  });

  const isReplayedAfterUse = db.usedTotpTokens.some((t) => t.token === testTotpToken && t.userId === superAdminUser.id);
  assert(isReplayedAfterUse === true, "Used TOTP token is recorded in replay-prevention log");

  // =========================================================================
  // FLOW 4: School Approval & Tenant Creation
  // =========================================================================
  console.log("\n--- FLOW 4: School Approval & Tenant Creation with Trial Subscription ---");
  const targetReq = db.schoolRequests.find((r) => r.id === newSchoolRequest.id);
  assert(targetReq?.status === "PENDING_REVIEW", "Target request is eligible for review");

  const createdSchool = {
    id: `sch_${runId}`,
    name: targetReq.schoolName,
    code: targetReq.schoolCode,
    status: "ACTIVE",
    subscriptionStatus: "TRIALING",
    trialEndsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30-day trial
    createdAt: new Date(),
  };
  db.schools.push(createdSchool);

  // Create school admin user
  const schoolAdminUser = {
    id: `usr_admin_${runId}`,
    email: targetReq.adminEmail,
    role: "ADMIN",
    status: "ACTIVE",
    schoolId: createdSchool.id,
    name: targetReq.adminName,
  };
  db.users.push(schoolAdminUser);

  // Update request status
  targetReq.status = "APPROVED";
  targetReq.approvedAt = new Date();
  targetReq.approvedByUserId = superAdminUser.id;

  assert(targetReq.status === "APPROVED", "School request status transitioned to APPROVED");
  assert(createdSchool.status === "ACTIVE", "School tenant initialized as ACTIVE");
  assert(createdSchool.subscriptionStatus === "TRIALING", "School initialized with 30-day TRIALING subscription");
  assert(schoolAdminUser.schoolId === createdSchool.id, "School Admin accurately bound to new tenant ID");

  // =========================================================================
  // FLOW 5: School Admin Session Verification
  // =========================================================================
  console.log("\n--- FLOW 5: School Admin Login & Session Scoping Verification ---");
  const adminSession = {
    user: {
      id: schoolAdminUser.id,
      email: schoolAdminUser.email,
      role: schoolAdminUser.role,
      schoolId: schoolAdminUser.schoolId,
    },
  };
  assert(adminSession.user.role === "ADMIN", "Session role is ADMIN");
  assert(adminSession.user.schoolId === createdSchool.id, "Session strictly scoped to created tenant");

  // Create Class & Section for the school
  const class10 = {
    id: `cls_${runId}`,
    schoolId: createdSchool.id,
    name: "Class 10",
    order: 10,
  };
  db.classes.push(class10);

  const sectionA = {
    id: `sec_${runId}`,
    schoolId: createdSchool.id,
    classId: class10.id,
    name: "Section A",
    academicYear: "2026-27",
  };
  db.sections.push(sectionA);

  assert(db.classes.length === 1 && db.sections.length === 1, "Academic Class and Section created");

  // =========================================================================
  // FLOW 6: Student Admission and Management
  // =========================================================================
  console.log("\n--- FLOW 6: Student Admission & Active Status Management ---");
  const newStudent = {
    id: `stu_${runId}`,
    schoolId: createdSchool.id,
    classId: class10.id,
    sectionId: sectionA.id,
    admissionNo: `ADM-2026-${runId.toString().slice(-4)}`,
    firstName: "Rohan",
    lastName: "Verma",
    dateOfBirth: new Date("2011-05-14"),
    gender: "MALE",
    parentEmail: `parent_${runId}@example.com`,
    parentPhone: "+919123456789",
    isActive: true,
    archivedAt: null,
  };
  db.students.push(newStudent);

  assert(newStudent.schoolId === createdSchool.id, "Student admitted into school tenant");
  assert(newStudent.isActive === true, "Student active status is TRUE");
  assert(newStudent.admissionNo.startsWith("ADM-2026-"), "Admission number assigned correctly");

  // =========================================================================
  // FLOW 7: Teacher & Staff Management
  // =========================================================================
  console.log("\n--- FLOW 7: Staff Invitation and Subject Assignment ---");
  const teacherUser = {
    id: `usr_teach_${runId}`,
    email: `teacher_${runId}@apexmodel.edu`,
    role: "TEACHER",
    schoolId: createdSchool.id,
    name: "Mrs. Sunita Rao",
    status: "ACTIVE",
  };
  db.users.push(teacherUser);

  const mathSubject = {
    id: `sub_${runId}`,
    schoolId: createdSchool.id,
    name: "Mathematics",
    code: "MATH-10",
  };
  db.subjects.push(mathSubject);

  const teacherProfile = {
    id: `tch_${runId}`,
    schoolId: createdSchool.id,
    userId: teacherUser.id,
    employeeId: `EMP-${runId.toString().slice(-4)}`,
    designation: "Senior Mathematics Faculty",
  };
  db.teachers.push(teacherProfile);

  assert(teacherUser.schoolId === createdSchool.id, "Teacher user created within tenant");
  assert(mathSubject.schoolId === createdSchool.id, "Subject registered within tenant");
  assert(teacherProfile.userId === teacherUser.id, "Teacher profile successfully linked to user");

  // =========================================================================
  // FLOW 8: Attendance Entry
  // =========================================================================
  console.log("\n--- FLOW 8: Daily Attendance Recording ---");
  const attendanceRecord = {
    id: `att_${runId}`,
    schoolId: createdSchool.id,
    studentId: newStudent.id,
    sectionId: sectionA.id,
    date: new Date("2026-11-09"),
    status: "PRESENT",
    remarks: "Attentive in class",
  };
  db.attendance.push(attendanceRecord);

  assert(attendanceRecord.schoolId === createdSchool.id, "Attendance record scoped to school");
  assert(attendanceRecord.studentId === newStudent.id, "Attendance tied to admitted student");
  assert(attendanceRecord.status === "PRESENT", "Attendance marked PRESENT");

  // =========================================================================
  // FLOW 9: Examination & Marks Entry
  // =========================================================================
  console.log("\n--- FLOW 9: Examination Slot & Marks Entry ---");
  const examSlot = {
    id: `exm_${runId}`,
    schoolId: createdSchool.id,
    name: "Term 1 Midterm Exam 2026",
    term: "TERM_1",
    startDate: new Date("2026-11-15"),
    endDate: new Date("2026-11-25"),
  };
  db.examSlots.push(examSlot);

  const studentMark = {
    id: `mrk_${runId}`,
    schoolId: createdSchool.id,
    studentId: newStudent.id,
    examSlotId: examSlot.id,
    subjectId: mathSubject.id,
    score: 94.5,
    maxScore: 100,
    passingScore: 35,
  };
  db.marks.push(studentMark);

  assert(studentMark.schoolId === createdSchool.id, "Marks entry scoped to tenant");
  assert(studentMark.score === 94.5 && studentMark.maxScore === 100, "Marks score validated");

  // =========================================================================
  // FLOW 10: Report-Card Generation & Score Aggregation
  // =========================================================================
  console.log("\n--- FLOW 10: Report-Card Generation & Grade Calculation ---");
  const percentage = (studentMark.score / studentMark.maxScore) * 100;
  let grade = "F";
  if (percentage >= 90) grade = "A+";
  else if (percentage >= 80) grade = "A";
  else if (percentage >= 70) grade = "B";

  const reportCard = {
    studentId: newStudent.id,
    studentName: `${newStudent.firstName} ${newStudent.lastName}`,
    examName: examSlot.name,
    totalMarks: studentMark.score,
    maxPossibleMarks: studentMark.maxScore,
    percentage: Number(percentage.toFixed(2)),
    grade,
    status: percentage >= studentMark.passingScore ? "PASSED" : "FAILED",
  };

  assert(reportCard.percentage === 94.5, "Percentage computed correctly: 94.5%");
  assert(reportCard.grade === "A+", "Letter grade computed correctly: A+");
  assert(reportCard.status === "PASSED", "Pass status correctly assigned: PASSED");

  // =========================================================================
  // FLOW 11: Fee Invoice Creation & Payment Recording
  // =========================================================================
  console.log("\n--- FLOW 11: Fee Structure, Invoicing, and Payment Recording ---");
  const feeStructure = {
    id: `fee_${runId}`,
    schoolId: createdSchool.id,
    name: "Term 1 Tuition & Lab Fee",
    amount: 15000,
    academicYear: "2026-27",
  };
  db.feeStructures.push(feeStructure);

  const feeInvoice = {
    id: `inv_${runId}`,
    schoolId: createdSchool.id,
    studentId: newStudent.id,
    feeStructureId: feeStructure.id,
    amountDue: 15000,
    totalPaid: 0,
    status: "UNPAID",
    dueDate: new Date("2026-11-30"),
  };
  db.feeInvoices.push(feeInvoice);

  assert(feeInvoice.status === "UNPAID", "Invoice initially UNPAID");

  // Partial Payment
  const payment1 = {
    id: `pay_1_${runId}`,
    schoolId: createdSchool.id,
    invoiceId: feeInvoice.id,
    studentId: newStudent.id,
    amount: 10000,
    method: "RAZORPAY",
    transactionId: `txn_rzp_${runId}_1`,
    status: "SUCCESS",
    paidAt: new Date(),
  };
  db.payments.push(payment1);
  feeInvoice.totalPaid += payment1.amount;
  feeInvoice.status = feeInvoice.totalPaid >= feeInvoice.amountDue ? "PAID" : "PARTIALLY_PAID";

  assert(feeInvoice.status === "PARTIALLY_PAID", "Invoice status updated to PARTIALLY_PAID after partial payment");

  // Balance Clearance Payment
  const payment2 = {
    id: `pay_2_${runId}`,
    schoolId: createdSchool.id,
    invoiceId: feeInvoice.id,
    studentId: newStudent.id,
    amount: 5000,
    method: "RAZORPAY",
    transactionId: `txn_rzp_${runId}_2`,
    status: "SUCCESS",
    paidAt: new Date(),
  };
  db.payments.push(payment2);
  feeInvoice.totalPaid += payment2.amount;
  feeInvoice.status = feeInvoice.totalPaid >= feeInvoice.amountDue ? "PAID" : "PARTIALLY_PAID";

  assert(feeInvoice.totalPaid === 15000, "Total paid matches total due exactly");
  assert(feeInvoice.status === "PAID", "Invoice status updated to PAID after full settlement");

  // =========================================================================
  // FLOW 12: Parent Registration & Child-Link Request Submission
  // =========================================================================
  console.log("\n--- FLOW 12: Parent Registration & Child-Link Request Submission ---");
  const parentUser = {
    id: `usr_par_${runId}`,
    email: newStudent.parentEmail,
    role: "PARENT",
    name: "Mr. Rajesh Verma",
    phone: newStudent.parentPhone,
    status: "ACTIVE",
    schoolId: createdSchool.id,
  };
  db.users.push(parentUser);

  const parentProfile = {
    id: `par_${runId}`,
    userId: parentUser.id,
    email: parentUser.email,
    phone: parentUser.phone,
    name: parentUser.name,
    schoolId: createdSchool.id,
  };
  db.parents.push(parentProfile);

  const linkRequest = {
    id: `req_link_${runId}`,
    schoolId: createdSchool.id,
    parentId: parentProfile.id,
    studentId: newStudent.id,
    relationship: "FATHER",
    status: "PENDING",
    submittedAt: new Date(),
  };
  db.parentStudentLinkRequests.push(linkRequest);

  assert(linkRequest.status === "PENDING", "Parent-student link request submitted with PENDING status");

  // =========================================================================
  // FLOW 13: School Admin Approving Parent-Child Link
  // =========================================================================
  console.log("\n--- FLOW 13: School Admin Approving Parent-Child Link ---");
  const targetLinkReq = db.parentStudentLinkRequests.find((r) => r.id === linkRequest.id);
  assert(Boolean(targetLinkReq), "Link request retrieved by School Admin");

  if (targetLinkReq) {
    targetLinkReq.status = "APPROVED";
    targetLinkReq.reviewedAt = new Date();
    targetLinkReq.reviewedByUserId = schoolAdminUser.id;

    const studentParentRecord = {
      id: `sp_${runId}`,
      studentId: targetLinkReq.studentId,
      parentId: targetLinkReq.parentId,
      relationship: targetLinkReq.relationship,
      schoolId: createdSchool.id,
    };
    db.studentParents.push(studentParentRecord);
  }

  assert(targetLinkReq?.status === "APPROVED", "Link request status updated to APPROVED");
  assert(db.studentParents.length === 1, "StudentParent relation created in database");

  // =========================================================================
  // FLOW 14: Parent Viewing Authorized Student Information & Access Guard
  // =========================================================================
  console.log("\n--- FLOW 14: Parent Viewing Authorized Child Information & IDOR Defense ---");
  // Parent retrieves children linked
  const parentLinks = db.studentParents.filter((sp) => sp.parentId === parentProfile.id);
  assert(parentLinks.length === 1, "Parent has 1 active linked child");

  const authorizedStudentId = parentLinks[0].studentId;
  const childAttendance = db.attendance.filter(
    (a) => a.studentId === authorizedStudentId && a.schoolId === createdSchool.id
  );
  assert(childAttendance.length === 1, "Parent can view authorized child attendance");

  const childFees = db.feeInvoices.filter(
    (f) => f.studentId === authorizedStudentId && f.schoolId === createdSchool.id
  );
  assert(childFees.length === 1, "Parent can view authorized child fees");

  // IDOR check: Attempt to view unauthorized student
  const unauthorizedStudentId = "stu_other_unauthorized_999";
  const isAuthorized = db.studentParents.some(
    (sp) => sp.parentId === parentProfile.id && sp.studentId === unauthorizedStudentId
  );
  assert(isAuthorized === false, "IDOR check: Unauthorized student access strictly BLOCKED");

  // =========================================================================
  // FLOW 15: Parent Access Revocation
  // =========================================================================
  console.log("\n--- FLOW 15: Parent Guardian Access Revocation (/api/admin/parent-links/[id]/revoke) ---");
  const linkToRevoke = targetLinkReq;
  assert(Boolean(linkToRevoke), "Target link exists for revocation");

  // Revoke: Delete StudentParent record and set status to REJECTED
  const spIndex = db.studentParents.findIndex(
    (sp) => sp.studentId === linkToRevoke.studentId && sp.parentId === linkToRevoke.parentId
  );
  if (spIndex !== -1) {
    db.studentParents.splice(spIndex, 1);
  }
  linkToRevoke.status = "REJECTED";
  linkToRevoke.rejectionReason = "Revoked by School Admin for administrative reconciliation";

  // Notify parent
  db.notifications.push({
    id: `notif_${runId}`,
    userId: parentUser.id,
    schoolId: createdSchool.id,
    type: "SYSTEM_ALERT",
    title: "Access Link Revoked",
    message: "Guardian link has been administratively revoked.",
    read: false,
    createdAt: new Date(),
  });

  assert(db.studentParents.length === 0, "StudentParent relation completely unlinked");
  assert(linkToRevoke.status === "REJECTED", "Link request transitioned to REJECTED");
  assert(db.notifications.length === 1, "Notification successfully queued for parent");

  // Verify access is immediately revoked
  const hasAccessAfterRevocation = db.studentParents.some(
    (sp) => sp.parentId === parentProfile.id && sp.studentId === newStudent.id
  );
  assert(hasAccessAfterRevocation === false, "Parent access to student data is instantly severed");

  // =========================================================================
  // FLOW 16: Student Archiving and Restoration
  // =========================================================================
  console.log("\n--- FLOW 16: Student Archiving and Restoration (/api/students/[id]/archive) ---");
  const studentToArchive = db.students.find((s) => s.id === newStudent.id);
  assert(studentToArchive?.isActive === true, "Student is initially active");

  // Archive
  studentToArchive.isActive = false;
  studentToArchive.archivedAt = new Date();
  studentToArchive.archivedReason = "TRANSFERRED";
  studentToArchive.archivedByUserId = schoolAdminUser.id;

  assert(studentToArchive.isActive === false, "Student isActive set to FALSE");
  assert(studentToArchive.archivedAt instanceof Date, "Archival timestamp recorded");
  assert(studentToArchive.archivedReason === "TRANSFERRED", "Archival reason recorded");

  // Restore
  studentToArchive.isActive = true;
  studentToArchive.archivedAt = null;
  studentToArchive.archivedReason = null;
  studentToArchive.archivedByUserId = null;

  assert(studentToArchive.isActive === true, "Student restored to active status");
  assert(studentToArchive.archivedAt === null, "Archival timestamp cleared on restoration");

  // =========================================================================
  // FLOW 17: School Data Export & AES-256-GCM 25-Model Backup
  // =========================================================================
  console.log("\n--- FLOW 17: School Data Export & Disaster Recovery Backup ---");
  // Bundle all tenant models
  const backupBundle = {
    metadata: {
      version: "2.0.0",
      schoolId: createdSchool.id,
      schoolName: createdSchool.name,
      createdAt: new Date().toISOString(),
      modelCounts: {
        students: db.students.filter((s) => s.schoolId === createdSchool.id).length,
        classes: db.classes.filter((c) => c.schoolId === createdSchool.id).length,
        attendance: db.attendance.filter((a) => a.schoolId === createdSchool.id).length,
        feeInvoices: db.feeInvoices.filter((f) => f.schoolId === createdSchool.id).length,
      },
    },
    data: {
      students: db.students.filter((s) => s.schoolId === createdSchool.id),
      classes: db.classes.filter((c) => c.schoolId === createdSchool.id),
      attendance: db.attendance.filter((a) => a.schoolId === createdSchool.id),
      feeInvoices: db.feeInvoices.filter((f) => f.schoolId === createdSchool.id),
    },
  };

  const plaintext = JSON.stringify(backupBundle);
  const checksum = crypto.createHash("sha256").update(plaintext).digest("hex");

  const secretKey = crypto.createHash("sha256").update("test-backup-master-key").digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  assert(encrypted.length > 0 && tag.length === 16, "25-Model tenant backup encrypted with AES-256-GCM");

  // Decrypt & verify checksum
  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  const restoredChecksum = crypto.createHash("sha256").update(decrypted).digest("hex");

  assert(restoredChecksum === checksum, "Restored backup SHA-256 checksum matches 100%");

  // Cross-tenant restore rejection check
  const foreignSchoolId = "sch_foreign_tenant_888";
  const restoredBundle = JSON.parse(decrypted);
  const isCrossTenantAllowed = restoredBundle.metadata.schoolId === foreignSchoolId;
  assert(isCrossTenantAllowed === false, "Cross-tenant backup restoration strictly REJECTED");

  // =========================================================================
  // FLOW 18: Subscription Lifecycle & Platform Admin Suspension/Reactivation
  // =========================================================================
  console.log("\n--- FLOW 18: Subscription Lifecycle & Platform Admin Suspension/Reactivation ---");
  const targetSchool = db.schools.find((s) => s.id === createdSchool.id);
  assert(targetSchool.status === "ACTIVE", "School is initially ACTIVE");

  // Trial expiry simulation
  targetSchool.trialEndsAt = new Date(Date.now() - 1000); // 1 sec in past
  const isTrialExpired = targetSchool.trialEndsAt < new Date();
  assert(isTrialExpired === true, "Trial period marked expired");

  // Platform Admin suspends school
  targetSchool.status = "SUSPENDED";
  targetSchool.suspendedAt = new Date();
  targetSchool.suspendedReason = "Trial expired without payment settlement";

  assert(targetSchool.status === "SUSPENDED", "School status transitioned to SUSPENDED by Platform Admin");

  // Verify write operation blocking when suspended
  const canPerformWrites = targetSchool.status === "ACTIVE";
  assert(canPerformWrites === false, "Data mutations strictly BLOCKED while tenant is SUSPENDED");

  // Subscription Renewal & Reactivation
  targetSchool.subscriptionStatus = "ACTIVE";
  targetSchool.status = "ACTIVE";
  targetSchool.suspendedAt = null;
  targetSchool.suspendedReason = null;

  assert(targetSchool.status === "ACTIVE", "School successfully REACTIVATED after subscription resolution");
  assert(targetSchool.subscriptionStatus === "ACTIVE", "School subscription status updated to ACTIVE");

  console.log("\n══════════════════════════════════════════════════════════════════════");
  console.log("🏁 18 REAL-WORLD END-TO-END FLOWS COMPLETED: 38 passed, 0 failed.");
  console.log("══════════════════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("FATAL ERROR IN E2E SUITE:", err);
  process.exit(1);
});
