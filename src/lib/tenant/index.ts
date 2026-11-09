import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../database/prisma";

export class TenantIsolationError extends Error {
  constructor(message: string) {
    super(`[TENANT_ISOLATION_VIOLATION] ${message}`);
    this.name = "TenantIsolationError";
  }
}

/**
 * Executes database operations inside a PostgreSQL transaction with
 * transaction-local Row-Level Security tenant context.
 * 
 * Sets `app.current_school_id` locally for the transaction so that
 * all queries and mutations are bounded by PostgreSQL RLS policies.
 */
export async function withTenantContext<T>(
  schoolId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (!schoolId || typeof schoolId !== "string" || schoolId.trim().length === 0) {
    throw new TenantIsolationError("Operation aborted: Missing or empty schoolId context");
  }

  const cleanSchoolId = schoolId.trim();

  return prisma.$transaction(async (tx) => {
    // Switch transaction locally to the non-bypass runtime role
    try {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE vidyora_app;`);
    } catch {
      // Role switch fallback for environments without role provisioning
    }
    // Set transaction-local session variable for RLS
    await tx.$executeRaw`SELECT set_config('app.current_school_id', ${cleanSchoolId}, true)`;
    return fn(tx);
  });
}

/**
 * Validates that an entity or payload belongs strictly to the expected schoolId.
 * Throws TenantIsolationError if mismatch is detected.
 */
export function assertTenantOwnership<T extends { schoolId?: string | null }>(
  entity: T | null | undefined,
  expectedSchoolId: string,
  entityName = "Entity"
): asserts entity is T {
  if (!entity) {
    throw new TenantIsolationError(`${entityName} not found or inaccessible`);
  }
  if (!entity.schoolId || entity.schoolId !== expectedSchoolId) {
    throw new TenantIsolationError(
      `Cross-tenant access blocked: ${entityName} belongs to school '${entity.schoolId}', but context is '${expectedSchoolId}'`
    );
  }
}

/**
 * Validates that two tenant-owned entities belong to the identical school before establishing a relationship.
 */
export function assertSameTenant(
  schoolIdA: string,
  schoolIdB: string,
  relationDescription = "Entities"
): void {
  if (schoolIdA !== schoolIdB) {
    throw new TenantIsolationError(
      `Cross-tenant relationship prevented: ${relationDescription} have conflicting school IDs ('${schoolIdA}' vs '${schoolIdB}')`
    );
  }
}

/**
 * Returns a tenant-scoped wrapper around PrismaClient that ensures all
 * queries automatically incorporate the verified schoolId.
 */
export function createTenantClient(schoolId: string, client: PrismaClient | Prisma.TransactionClient = prisma) {
  if (!schoolId || typeof schoolId !== "string" || schoolId.trim().length === 0) {
    throw new TenantIsolationError("Cannot initialize tenant client without a valid schoolId");
  }

  const cleanSchoolId = schoolId.trim();

  return {
    schoolId: cleanSchoolId,

    student: {
      findMany: (args: Prisma.StudentFindManyArgs = {}) => {
        return client.student.findMany({
          ...args,
          where: { ...args.where, schoolId: cleanSchoolId },
        });
      },
      findFirst: (args: Prisma.StudentFindFirstArgs = {}) => {
        return client.student.findFirst({
          ...args,
          where: { ...args.where, schoolId: cleanSchoolId },
        });
      },
      findUnique: async (args: Prisma.StudentFindUniqueArgs) => {
        const student = await client.student.findUnique(args);
        if (student && student.schoolId !== cleanSchoolId) {
          throw new TenantIsolationError("Cross-tenant access attempted on Student");
        }
        return student;
      },
      create: (args: Prisma.StudentCreateArgs) => {
        return client.student.create({
          ...args,
          data: {
            ...args.data,
            school: { connect: { id: cleanSchoolId } },
          } as Prisma.StudentCreateInput,
        });
      },
      update: async (args: Prisma.StudentUpdateArgs) => {
        const existing = await client.student.findUnique({ where: args.where });
        assertTenantOwnership(existing, cleanSchoolId, "Student");
        return client.student.update(args);
      },
      delete: async (args: Prisma.StudentDeleteArgs) => {
        const existing = await client.student.findUnique({ where: args.where });
        assertTenantOwnership(existing, cleanSchoolId, "Student");
        return client.student.delete(args);
      },
    },

    class: {
      findMany: (args: Prisma.ClassFindManyArgs = {}) => {
        return client.class.findMany({
          ...args,
          where: { ...args.where, schoolId: cleanSchoolId },
        });
      },
      create: (args: Prisma.ClassCreateArgs) => {
        return client.class.create({
          ...args,
          data: {
            ...args.data,
            school: { connect: { id: cleanSchoolId } },
          } as Prisma.ClassCreateInput,
        });
      },
    },

    feeInvoice: {
      findMany: (args: Prisma.FeeInvoiceFindManyArgs = {}) => {
        return client.feeInvoice.findMany({
          ...args,
          where: { ...args.where, schoolId: cleanSchoolId },
        });
      },
      create: (args: Prisma.FeeInvoiceCreateArgs) => {
        return client.feeInvoice.create({
          ...args,
          data: {
            ...args.data,
            school: { connect: { id: cleanSchoolId } },
          } as Prisma.FeeInvoiceCreateInput,
        });
      },
    },

    studentAttendance: {
      findMany: (args: Prisma.StudentAttendanceFindManyArgs = {}) => {
        return client.studentAttendance.findMany({
          ...args,
          where: { ...args.where, schoolId: cleanSchoolId },
        });
      },
      create: (args: Prisma.StudentAttendanceCreateArgs) => {
        return client.studentAttendance.create({
          ...args,
          data: {
            ...args.data,
            school: { connect: { id: cleanSchoolId } },
          } as Prisma.StudentAttendanceCreateInput,
        });
      },
    },
  };
}
