import crypto from "crypto";
import prisma from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export interface BackupMetadata {
  version: string;
  schoolId: string;
  schoolName: string;
  createdAt: string;
  recordCounts: Record<string, number>;
  checksum: string;
}

export interface EncryptedBackupBundle {
  iv: string; // Hex IV
  authTag: string; // Hex auth tag
  data: string; // Hex encrypted ciphertext
  metadata: BackupMetadata;
}

function getBackupKey(): Buffer {
  const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "erp-default-aes256-backup-encryption-key";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Creates a fully isolated, tenant-scoped, AES-256-GCM encrypted backup of all 25 tenant models.
 */
export async function createTenantBackup(schoolId: string): Promise<EncryptedBackupBundle> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      boardType: true,
      affiliationNumber: true,
      email: true,
      phone: true,
      address: true,
      status: true,
    },
  });

  if (!school) {
    throw new Error(`School with ID "${schoolId}" not found for backup.`);
  }

  // Fetch all 25 tenant-scoped and relational models
  const [
    users,
    students,
    parents,
    classes,
    sections,
    subjects,
    feeStructures,
    feeInvoices,
    payments,
    attendance,
    gradingScales,
    examSlots,
    reportCards,
    notices,
    periods,
    timetableSlots,
    syllabusTopics,
    certificateLogs,
    departments,
    leaveRequests,
    assignments,
    parentStudentLinkRequests,
    notifications,
    documents,
    studentParents,
    marks,
  ] = await Promise.all([
    // Users: exclude password hashes and TOTP secret keys for security
    prisma.user.findMany({
      where: { schoolId },
      select: {
        id: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.student.findMany({ where: { schoolId } }),
    prisma.parent.findMany({ where: { schoolId } }),
    prisma.class.findMany({ where: { schoolId } }),
    prisma.section.findMany({ where: { schoolId } }),
    prisma.subject.findMany({ where: { schoolId } }),
    prisma.feeStructure.findMany({ where: { schoolId } }),
    prisma.feeInvoice.findMany({ where: { schoolId } }),
    prisma.payment.findMany({ where: { schoolId } }),
    prisma.attendance.findMany({ where: { schoolId } }),
    prisma.gradingScale.findMany({ where: { schoolId } }),
    prisma.examSlot.findMany({ where: { schoolId } }),
    prisma.reportCard.findMany({ where: { schoolId } }),
    prisma.notice.findMany({ where: { schoolId } }),
    prisma.period.findMany({ where: { schoolId } }),
    prisma.timetableSlot.findMany({ where: { schoolId } }),
    prisma.syllabusTopic.findMany({ where: { schoolId } }),
    prisma.certificateLog.findMany({ where: { schoolId } }),
    prisma.department.findMany({ where: { schoolId } }),
    prisma.leaveRequest.findMany({ where: { schoolId } }),
    prisma.assignment.findMany({ where: { schoolId } }),
    prisma.parentStudentLinkRequest.findMany({ where: { schoolId } }),
    prisma.notification.findMany({ where: { schoolId } }),
    prisma.document.findMany({ where: { schoolId } }),
    // Relational join models
    prisma.studentParent.findMany({
      where: { student: { schoolId } },
    }),
    prisma.marks.findMany({
      where: { student: { schoolId } },
    }),
  ]);

  const rawData = {
    school,
    users,
    students,
    parents,
    classes,
    sections,
    subjects,
    feeStructures,
    feeInvoices,
    payments,
    attendance,
    gradingScales,
    examSlots,
    reportCards,
    notices,
    periods,
    timetableSlots,
    syllabusTopics,
    certificateLogs,
    departments,
    leaveRequests,
    assignments,
    parentStudentLinkRequests,
    notifications,
    documents,
    studentParents,
    marks,
  };

  const rawJson = JSON.stringify(rawData);
  const checksum = crypto.createHash("sha256").update(rawJson).digest("hex");

  const metadata: BackupMetadata = {
    version: "2.0",
    schoolId: school.id,
    schoolName: school.name,
    createdAt: new Date().toISOString(),
    recordCounts: {
      users: users.length,
      students: students.length,
      parents: parents.length,
      classes: classes.length,
      sections: sections.length,
      subjects: subjects.length,
      feeStructures: feeStructures.length,
      feeInvoices: feeInvoices.length,
      payments: payments.length,
      attendance: attendance.length,
      gradingScales: gradingScales.length,
      examSlots: examSlots.length,
      reportCards: reportCards.length,
      notices: notices.length,
      periods: periods.length,
      timetableSlots: timetableSlots.length,
      syllabusTopics: syllabusTopics.length,
      certificateLogs: certificateLogs.length,
      departments: departments.length,
      leaveRequests: leaveRequests.length,
      assignments: assignments.length,
      parentStudentLinkRequests: parentStudentLinkRequests.length,
      notifications: notifications.length,
      documents: documents.length,
      studentParents: studentParents.length,
      marks: marks.length,
    },
    checksum,
  };

  // Encrypt with AES-256-GCM
  const key = getBackupKey();
  const iv = crypto.randomBytes(12); // Standard 12-byte IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encryptedData = Buffer.concat([
    cipher.update(rawJson, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    data: encryptedData.toString("hex"),
    metadata,
  };
}

export interface DecryptedTenantData {
  classes?: Array<{ id: string; name: string; order?: number | null }>;
  sections?: Array<{ id: string; name: string; classId: string; academicYear?: string | null }>;
  departments?: Array<{ id: string; name: string }>;
  gradingScales?: Array<{ id: string; grade: string; minScore: number; maxScore: number }>;
  notices?: Array<{ id: string; title: string; body?: string | null; content?: string | null; audience?: Role[] }>;
  [key: string]: unknown;
}

/**
 * Decrypts an AES-256-GCM encrypted tenant backup bundle.
 */
export function decryptTenantBackup(bundle: EncryptedBackupBundle): DecryptedTenantData {
  const key = getBackupKey();
  const iv = Buffer.from(bundle.iv, "hex");
  const authTag = Buffer.from(bundle.authTag, "hex");
  const encryptedText = Buffer.from(bundle.data, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  const rawJson = decrypted.toString("utf8");
  const computedChecksum = crypto.createHash("sha256").update(rawJson).digest("hex");

  if (computedChecksum !== bundle.metadata.checksum) {
    throw new Error("Backup integrity verification failed: Checksum mismatch.");
  }

  return JSON.parse(rawJson) as DecryptedTenantData;
}

/**
 * Restores a tenant backup into the target schoolId.
 * Validates that the backup bundle belongs to the target school.
 */
export async function restoreTenantBackup(
  schoolId: string,
  bundle: EncryptedBackupBundle,
  actor: { userId: string; userEmail?: string }
): Promise<{ success: boolean; recordsRestored: number }> {
  // 1. Decrypt and verify integrity
  const data = decryptTenantBackup(bundle);

  // 2. Strict tenant boundary check: cannot restore another school's backup
  if (bundle.metadata.schoolId !== schoolId) {
    throw new Error(
      `Cross-tenant backup restore violation: Backup bundle belongs to school "${bundle.metadata.schoolId}", cannot restore into "${schoolId}".`
    );
  }

  // 3. Execute atomic restoration
  let totalRestored = 0;
  await prisma.$transaction(async (tx) => {
    // Restore or update core reference models
    if (data.classes && data.classes.length > 0) {
      for (const cls of data.classes) {
        await tx.class.upsert({
          where: { id: cls.id },
          update: { name: cls.name, order: cls.order ?? 0 },
          create: { id: cls.id, schoolId, name: cls.name, order: cls.order ?? 0 },
        });
        totalRestored++;
      }
    }

    if (data.sections && data.sections.length > 0) {
      for (const sec of data.sections) {
        await tx.section.upsert({
          where: { id: sec.id },
          update: { name: sec.name, classId: sec.classId, academicYear: sec.academicYear ?? "2026-27" },
          create: { id: sec.id, schoolId, name: sec.name, classId: sec.classId, academicYear: sec.academicYear ?? "2026-27" },
        });
        totalRestored++;
      }
    }

    if (data.departments && data.departments.length > 0) {
      for (const dep of data.departments) {
        await tx.department.upsert({
          where: { id: dep.id },
          update: { name: dep.name },
          create: { id: dep.id, schoolId, name: dep.name },
        });
        totalRestored++;
      }
    }

    if (data.gradingScales && data.gradingScales.length > 0) {
      for (const gs of data.gradingScales) {
        await tx.gradingScale.upsert({
          where: { id: gs.id },
          update: { grade: gs.grade, minScore: gs.minScore, maxScore: gs.maxScore },
          create: { id: gs.id, schoolId, grade: gs.grade, minScore: gs.minScore, maxScore: gs.maxScore },
        });
        totalRestored++;
      }
    }

    if (data.notices && data.notices.length > 0) {
      for (const n of data.notices) {
        await tx.notice.upsert({
          where: { id: n.id },
          update: { title: n.title, body: n.body || n.content || "", audience: n.audience || [] },
          create: { id: n.id, schoolId, title: n.title, body: n.body || n.content || "", audience: n.audience || [] },
        });
        totalRestored++;
      }
    }
  });

  // 4. Audit Log
  await logAuditEvent({
    schoolId,
    userId: actor.userId,
    userEmail: actor.userEmail,
    action: "TENANT_BACKUP_RESTORED",
    targetType: "School",
    targetId: schoolId,
    details: {
      backupTimestamp: bundle.metadata.createdAt,
      checksum: bundle.metadata.checksum,
      recordsRestored: totalRestored,
    },
  });

  return { success: true, recordsRestored: totalRestored };
}
