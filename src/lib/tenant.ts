/**
 * Tenant Isolation — Prisma Client Extension
 *
 * This is the most security-critical file in the application.
 * It creates a tenant-scoped Prisma client that automatically injects
 * `schoolId` into every query, preventing cross-tenant data access.
 *
 * Usage in API routes:
 *   const session = await auth();
 *   const db = tenantClient(session.user.schoolId);
 *   const students = await db.student.findMany(); // automatically scoped
 */

import { Prisma } from "@prisma/client";
import prisma from "./prisma";

/**
 * Models in the schema that have a direct `schoolId` column.
 * If you add a new model with `schoolId`, you MUST add it here.
 * The `scripts/check-tenant-scoping.ts` drift guard will catch
 * any omissions at dev/CI time.
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

/** Operations where we inject schoolId into the `where` clause */
const READ_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

/** Operations where we inject schoolId into `where` for bulk mutations */
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
  if (!schoolId) {
    throw new Error("tenantClient requires a non-empty schoolId");
  }

  return prisma.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Skip models without a schoolId column (School, Teacher,
          // TeacherSubject, StudentParent, Marks)
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          // ────────────────────────────────────────────────
          // READS: inject schoolId into `where`
          // ────────────────────────────────────────────────
          if (READ_OPERATIONS.has(operation)) {
            (args as any).where = { ...(args as any).where, schoolId };
            return query(args);
          }

          // ────────────────────────────────────────────────
          // CREATES: force schoolId into `data`
          // ────────────────────────────────────────────────
          if (CREATE_OPERATIONS.has(operation)) {
            if (
              operation === "createMany" ||
              operation === "createManyAndReturn"
            ) {
              if (Array.isArray((args as any).data)) {
                (args as any).data = (args as any).data.map((d: any) => ({
                  ...d,
                  schoolId,
                }));
              } else {
                (args as any).data = { ...(args as any).data, schoolId };
              }
            } else {
              (args as any).data = { ...(args as any).data, schoolId };
            }
            return query(args);
          }

          // ────────────────────────────────────────────────
          // findUnique / findUniqueOrThrow: post-validate
          // (can't inject schoolId into unique where clause)
          // ────────────────────────────────────────────────
          if (
            operation === "findUnique" ||
            operation === "findUniqueOrThrow"
          ) {
            const result = await query(args);
            if (result && (result as any).schoolId !== schoolId) {
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

          // ────────────────────────────────────────────────
          // UPDATE (single record by unique key)
          // ────────────────────────────────────────────────
          if (operation === "update") {
            // Block attempts to change schoolId
            if ((args as any).data?.schoolId !== undefined) {
              throw new Error("Cannot modify schoolId through tenant client");
            }
            // PRE-CHECK: verify the target record belongs to this tenant
            const modelAccessor =
              model.charAt(0).toLowerCase() + model.slice(1);
            const whereClause = (args as any).where;
            const existing = await (prisma as any)[modelAccessor].findFirst({
              where: { ...flattenWhere(whereClause), schoolId },
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

          // ────────────────────────────────────────────────
          // UPSERT: separate handler — Prisma upsert uses
          // { where, create, update }, NOT { where, data }
          // ────────────────────────────────────────────────
          if (operation === "upsert") {
            const { where, create, update } = args as any;

            // Reject caller-supplied schoolId in either branch
            if (
              create?.schoolId !== undefined ||
              update?.schoolId !== undefined
            ) {
              throw new Error(
                "Cannot set schoolId through tenant client — it is injected automatically"
              );
            }

            // Force schoolId into the create branch so new rows
            // always belong to the current tenant
            (args as any).create = { ...create, schoolId };

            // Check if a row matching `where` exists at all (unscoped).
            // If it exists but belongs to a different tenant, block the
            // upsert to prevent cross-tenant overwrites.
            const modelAccessor =
              model.charAt(0).toLowerCase() + model.slice(1);
            const unscopedRow = await (prisma as any)[
              modelAccessor
            ].findFirst({
              where: flattenWhere(where),
              select: { id: true, schoolId: true },
            });
            if (unscopedRow && unscopedRow.schoolId !== schoolId) {
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

          // ────────────────────────────────────────────────
          // DELETE (single record by unique key)
          // ────────────────────────────────────────────────
          if (operation === "delete") {
            const modelAccessor =
              model.charAt(0).toLowerCase() + model.slice(1);
            const whereClause = (args as any).where;
            const existing = await (prisma as any)[modelAccessor].findFirst({
              where: { ...flattenWhere(whereClause), schoolId },
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

          // ────────────────────────────────────────────────
          // updateMany / deleteMany: inject schoolId into where
          // ────────────────────────────────────────────────
          if (WRITE_WHERE_OPERATIONS.has(operation)) {
            (args as any).where = { ...(args as any).where, schoolId };
            return query(args);
          }

          // ⚠️  SECURITY: $queryRaw / $executeRaw bypass this extension
          // entirely because they don't go through model operations.
          // Any raw SQL MUST manually include "WHERE schoolId = $1" or
          // equivalent. This is a *deliberate* gap — raw queries are an
          // escape hatch, not a default path — but it MUST be documented
          // at every raw-query call site. Never pass user input into a
          // raw query without parameterisation.
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
function flattenWhere(where: Record<string, any>): Record<string, any> {
  const flat: Record<string, any> = {};
  for (const [key, value] of Object.entries(where)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      // Might be a compound unique key — flatten it
      Object.assign(flat, value);
    } else {
      flat[key] = value;
    }
  }
  return flat;
}
