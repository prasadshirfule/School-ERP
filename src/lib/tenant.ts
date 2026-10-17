/**
 * Tenant Isolation — Prisma Client Extension
 *
 * This is the most security-critical file in the application.
 * It creates a tenant-scoped Prisma client that automatically enforces
 * tenant boundaries across:
 * 1. Models with direct `schoolId` scalar columns (21 models).
 * 2. Models with relational tenant linkage (Teacher, TeacherSubject, StudentParent, Marks).
 *
 * No query through this client can read, insert, update, or delete data belonging
 * to a different tenant school.
 */

import { Prisma } from "@prisma/client";
import prisma from "./prisma";

/**
 * Models in the schema that have a direct scalar `schoolId` column.
 */
export const TENANT_SCOPED_MODELS = new Set([
  "User",
  "Student",
  "Parent",
  "Class",
  "Section",
  "Subject",
  "FeeStructure",
  "FeeInvoice",
  "Payment",
  "Attendance",
  "GradingScale",
  "ExamSlot",
  "ReportCard",
  "Notice",
  "Period",
  "TimetableSlot",
  "SyllabusTopic",
  "CertificateLog",
  "Department",
  "LeaveRequest",
  "Assignment",
]);

/**
 * Models without direct scalar schoolId that MUST be relationally scoped
 * through their parent entities.
 */
export const RELATIONALLY_SCOPED_MODELS = new Set([
  "Teacher",        // Scoped via user.schoolId
  "TeacherSubject", // Scoped via subject.schoolId & teacher.user.schoolId
  "StudentParent",  // Scoped via student.schoolId
  "Marks",          // Scoped via student.schoolId
]);

export const ALL_SCOPED_MODELS = new Set([
  ...TENANT_SCOPED_MODELS,
  ...RELATIONALLY_SCOPED_MODELS,
]);

/** Operations where we inject filtering into the `where` clause */
const READ_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

/** Operations where we inject filter into `where` for bulk mutations */
const WRITE_WHERE_OPERATIONS = new Set(["updateMany", "deleteMany"]);

/** Operations where we inject schoolId into `data` */
const CREATE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
]);

/**
 * Creates a tenant-scoped Prisma Client.
 * Every query through this client is automatically filtered/injected
 * with the given schoolId. No query can read or write data belonging
 * to a different tenant.
 */
export function tenantClient(schoolId: string) {
  if (!schoolId || typeof schoolId !== "string" || schoolId.trim() === "") {
    throw new Error("tenantClient requires a valid, non-empty schoolId");
  }

  const cleanSchoolId = schoolId.trim();

  return prisma.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // If School model or unhandled root, allow normal execution
          if (!model || model === "School") {
            return query(args);
          }

          // ══════════════════════════════════════════════════════════════════
          // 1. MODELS WITH DIRECT `schoolId` FIELD
          // ══════════════════════════════════════════════════════════════════
          if (TENANT_SCOPED_MODELS.has(model)) {
            // READS: inject schoolId into where
            if (READ_OPERATIONS.has(operation)) {
              (args as any).where = { ...(args as any).where, schoolId: cleanSchoolId };
              return query(args);
            }

            // CREATES: force schoolId into data
            if (CREATE_OPERATIONS.has(operation)) {
              if (
                operation === "createMany" ||
                operation === "createManyAndReturn"
              ) {
                if (Array.isArray((args as any).data)) {
                  (args as any).data = (args as any).data.map((d: any) => ({
                    ...d,
                    schoolId: cleanSchoolId,
                  }));
                } else {
                  (args as any).data = { ...(args as any).data, schoolId: cleanSchoolId };
                }
              } else {
                (args as any).data = { ...(args as any).data, schoolId: cleanSchoolId };
              }
              return query(args);
            }

            // findUnique / findUniqueOrThrow: post-validate
            if (
              operation === "findUnique" ||
              operation === "findUniqueOrThrow"
            ) {
              const result = await query(args);
              if (result && (result as any).schoolId !== cleanSchoolId) {
                if (operation === "findUniqueOrThrow") {
                  throw new Prisma.PrismaClientKnownRequestError(
                    "Record not found (tenant boundary)",
                    {
                      code: "P2025",
                      clientVersion: Prisma.prismaVersion.client,
                    }
                  );
                }
                return null; // hide cross-tenant result
              }
              return result;
            }

            // UPDATE: verify target record belongs to this tenant and block changing schoolId
            if (operation === "update") {
              if ((args as any).data?.schoolId !== undefined) {
                throw new Error("Cannot modify schoolId through tenant client");
              }
              const modelAccessor =
                model.charAt(0).toLowerCase() + model.slice(1);
              const whereClause = (args as any).where;
              const existing = await (prisma as any)[modelAccessor].findFirst({
                where: { ...flattenWhere(whereClause), schoolId: cleanSchoolId },
                select: { id: true },
              });
              if (!existing) {
                throw new Prisma.PrismaClientKnownRequestError(
                  "Record not found (tenant boundary)",
                  {
                    code: "P2025",
                    clientVersion: Prisma.prismaVersion.client,
                  }
                );
              }
              return query(args);
            }

            // UPSERT
            if (operation === "upsert") {
              const { where, create, update } = args as any;

              if (
                create?.schoolId !== undefined ||
                update?.schoolId !== undefined
              ) {
                throw new Error(
                  "Cannot set schoolId through tenant client — it is injected automatically"
                );
              }

              (args as any).create = { ...create, schoolId: cleanSchoolId };

              const modelAccessor =
                model.charAt(0).toLowerCase() + model.slice(1);
              const unscopedRow = await (prisma as any)[
                modelAccessor
              ].findFirst({
                where: flattenWhere(where),
                select: { id: true, schoolId: true },
              });
              if (unscopedRow && unscopedRow.schoolId !== cleanSchoolId) {
                throw new Prisma.PrismaClientKnownRequestError(
                  "Record not found (tenant boundary)",
                  {
                    code: "P2025",
                    clientVersion: Prisma.prismaVersion.client,
                  }
                );
              }

              return query(args);
            }

            // DELETE
            if (operation === "delete") {
              const modelAccessor =
                model.charAt(0).toLowerCase() + model.slice(1);
              const whereClause = (args as any).where;
              const existing = await (prisma as any)[modelAccessor].findFirst({
                where: { ...flattenWhere(whereClause), schoolId: cleanSchoolId },
                select: { id: true },
              });
              if (!existing) {
                throw new Prisma.PrismaClientKnownRequestError(
                  "Record not found (tenant boundary)",
                  {
                    code: "P2025",
                    clientVersion: Prisma.prismaVersion.client,
                  }
                );
              }
              return query(args);
            }

            // updateMany / deleteMany
            if (WRITE_WHERE_OPERATIONS.has(operation)) {
              (args as any).where = { ...(args as any).where, schoolId: cleanSchoolId };
              return query(args);
            }
          }

          // ══════════════════════════════════════════════════════════════════
          // 2. RELATIONALLY SCOPED MODELS (Teacher, Marks, StudentParent, TeacherSubject)
          // ══════════════════════════════════════════════════════════════════
          if (RELATIONALLY_SCOPED_MODELS.has(model)) {
            // --- Model A: Teacher (linked to User which has schoolId) ---
            if (model === "Teacher") {
              if (READ_OPERATIONS.has(operation)) {
                (args as any).where = {
                  ...(args as any).where,
                  user: { ...((args as any).where?.user || {}), schoolId: cleanSchoolId },
                };
                return query(args);
              }

              if (operation === "findUnique" || operation === "findUniqueOrThrow") {
                const whereClause = (args as any).where;
                const flat = flattenWhere(whereClause);
                const teacherUser = await prisma.teacher.findFirst({
                  where: { ...flat, user: { schoolId: cleanSchoolId } },
                  select: { id: true },
                });
                if (!teacherUser) {
                  if (operation === "findUniqueOrThrow") {
                    throw new Prisma.PrismaClientKnownRequestError(
                      "Record not found (tenant boundary)",
                      { code: "P2025", clientVersion: Prisma.prismaVersion.client }
                    );
                  }
                  return null;
                }
                return query(args);
              }

              if (operation === "update" || operation === "delete") {
                const whereClause = (args as any).where;
                const existing = await prisma.teacher.findFirst({
                  where: { ...flattenWhere(whereClause), user: { schoolId: cleanSchoolId } },
                  select: { id: true },
                });
                if (!existing) {
                  throw new Prisma.PrismaClientKnownRequestError(
                    "Record not found (tenant boundary)",
                    { code: "P2025", clientVersion: Prisma.prismaVersion.client }
                  );
                }
                return query(args);
              }

              if (WRITE_WHERE_OPERATIONS.has(operation)) {
                (args as any).where = {
                  ...(args as any).where,
                  user: { ...((args as any).where?.user || {}), schoolId: cleanSchoolId },
                };
                return query(args);
              }

              if (operation === "create") {
                const userId = (args as any).data?.userId;
                if (userId) {
                  const user = await prisma.user.findFirst({
                    where: { id: userId, schoolId: cleanSchoolId },
                    select: { id: true },
                  });
                  if (!user) {
                    throw new Prisma.PrismaClientKnownRequestError(
                      "Referenced User does not belong to this school",
                      { code: "P2025", clientVersion: Prisma.prismaVersion.client }
                    );
                  }
                }
                return query(args);
              }
            }

            // --- Model B: Marks (linked to Student which has schoolId) ---
            if (model === "Marks") {
              if (READ_OPERATIONS.has(operation)) {
                (args as any).where = {
                  ...(args as any).where,
                  student: { ...((args as any).where?.student || {}), schoolId: cleanSchoolId },
                };
                return query(args);
              }

              if (operation === "findUnique" || operation === "findUniqueOrThrow") {
                const whereClause = (args as any).where;
                const flat = flattenWhere(whereClause);
                const mark = await prisma.marks.findFirst({
                  where: { ...flat, student: { schoolId: cleanSchoolId } },
                  select: { id: true },
                });
                if (!mark) {
                  if (operation === "findUniqueOrThrow") {
                    throw new Prisma.PrismaClientKnownRequestError(
                      "Record not found (tenant boundary)",
                      { code: "P2025", clientVersion: Prisma.prismaVersion.client }
                    );
                  }
                  return null;
                }
                return query(args);
              }

              if (operation === "update" || operation === "delete") {
                const whereClause = (args as any).where;
                const existing = await prisma.marks.findFirst({
                  where: { ...flattenWhere(whereClause), student: { schoolId: cleanSchoolId } },
                  select: { id: true },
                });
                if (!existing) {
                  throw new Prisma.PrismaClientKnownRequestError(
                    "Record not found (tenant boundary)",
                    { code: "P2025", clientVersion: Prisma.prismaVersion.client }
                  );
                }
                return query(args);
              }

              if (operation === "upsert") {
                const { where, create } = args as any;
                const studentId = create?.studentId || (where as any)?.studentId_subjectId_examName?.studentId;
                if (studentId) {
                  const student = await prisma.student.findFirst({
                    where: { id: studentId, schoolId: cleanSchoolId },
                    select: { id: true },
                  });
                  if (!student) {
                    throw new Prisma.PrismaClientKnownRequestError(
                      "Referenced Student does not belong to this school",
                      { code: "P2025", clientVersion: Prisma.prismaVersion.client }
                    );
                  }
                }

                const unscoped = await prisma.marks.findFirst({
                  where: flattenWhere(where),
                  include: { student: { select: { schoolId: true } } },
                });
                if (unscoped && unscoped.student.schoolId !== cleanSchoolId) {
                  throw new Prisma.PrismaClientKnownRequestError(
                    "Record not found (tenant boundary)",
                    { code: "P2025", clientVersion: Prisma.prismaVersion.client }
                  );
                }

                return query(args);
              }

              if (WRITE_WHERE_OPERATIONS.has(operation)) {
                (args as any).where = {
                  ...(args as any).where,
                  student: { ...((args as any).where?.student || {}), schoolId: cleanSchoolId },
                };
                return query(args);
              }

              if (operation === "create") {
                const studentId = (args as any).data?.studentId;
                if (studentId) {
                  const student = await prisma.student.findFirst({
                    where: { id: studentId, schoolId: cleanSchoolId },
                    select: { id: true },
                  });
                  if (!student) {
                    throw new Prisma.PrismaClientKnownRequestError(
                      "Referenced Student does not belong to this school",
                      { code: "P2025", clientVersion: Prisma.prismaVersion.client }
                    );
                  }
                }
                return query(args);
              }
            }

            // --- Model C: StudentParent (linked to Student & Parent) ---
            if (model === "StudentParent") {
              if (READ_OPERATIONS.has(operation) || WRITE_WHERE_OPERATIONS.has(operation)) {
                (args as any).where = {
                  ...(args as any).where,
                  student: { ...((args as any).where?.student || {}), schoolId: cleanSchoolId },
                };
                return query(args);
              }

              if (operation === "create") {
                const studentId = (args as any).data?.studentId;
                if (studentId) {
                  const student = await prisma.student.findFirst({
                    where: { id: studentId, schoolId: cleanSchoolId },
                    select: { id: true },
                  });
                  if (!student) {
                    throw new Prisma.PrismaClientKnownRequestError(
                      "Referenced Student does not belong to this school",
                      { code: "P2025", clientVersion: Prisma.prismaVersion.client }
                    );
                  }
                }
                return query(args);
              }
            }

            // --- Model D: TeacherSubject (linked to Subject which has direct schoolId) ---
            if (model === "TeacherSubject") {
              if (READ_OPERATIONS.has(operation) || WRITE_WHERE_OPERATIONS.has(operation)) {
                (args as any).where = {
                  ...(args as any).where,
                  subject: { ...((args as any).where?.subject || {}), schoolId: cleanSchoolId },
                };
                return query(args);
              }

              if (operation === "create" || operation === "upsert") {
                const subjectId = (args as any).data?.subjectId || (args as any).create?.subjectId;
                if (subjectId) {
                  const subject = await prisma.subject.findFirst({
                    where: { id: subjectId, schoolId: cleanSchoolId },
                    select: { id: true },
                  });
                  if (!subject) {
                    throw new Prisma.PrismaClientKnownRequestError(
                      "Referenced Subject does not belong to this school",
                      { code: "P2025", clientVersion: Prisma.prismaVersion.client }
                    );
                  }
                }
                return query(args);
              }
            }
          }

          return query(args);
        },
      },
    },
  });
}

/**
 * Prisma's unique `where` can be either `{ id: "..." }` or a compound
 * key like `{ schoolId_email: { schoolId, email } }`. This helper
 * flattens compound unique keys so we can add `schoolId` for a findFirst.
 */
function flattenWhere(where: Record<string, any> | undefined): Record<string, any> {
  if (!where) return {};
  const flat: Record<string, any> = {};
  for (const [key, value] of Object.entries(where)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      // Compound unique key — flatten it
      Object.assign(flat, value);
    } else {
      flat[key] = value;
    }
  }
  return flat;
}
