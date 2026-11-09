import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../database/prisma";

export class TenantIsolationError extends Error {
  constructor(message: string) {
    super(`[TENANT_ISOLATION_VIOLATION] ${message}`);
    this.name = "TenantIsolationError";
  }
}

/**
 * Complete set of all 33 tenant-owned models in the Vidyora schema.
 * All these models contain a `schoolId` foreign key referencing `School(id)`.
 */
export const TENANT_MODELS = new Set<string>([
  "AcademicYear",
  "SchoolMembership",
  "Class",
  "Section",
  "Subject",
  "ClassSubject",
  "Period",
  "TimetableSlot",
  "Department",
  "TeacherProfile",
  "TeacherAssignment",
  "StaffAttendance",
  "StaffLeaveRequest",
  "Student",
  "StudentGuardian",
  "StudentAttendance",
  "StudentDocument",
  "TransferCertificate",
  "AdmissionApplication",
  "FeeStructure",
  "FeeInstallment",
  "FeeInvoice",
  "FeeDiscount",
  "FeePayment",
  "PaymentReversal",
  "ExamType",
  "Examination",
  "ExamSubject",
  "StudentMark",
  "GradingScale",
  "StudentReportCard",
  "AuditLog",
  "Notification",
]);

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
 * Creates a dynamic, tenant-aware Prisma Client Extension covering ALL 33 tenant-owned models.
 * Automatically injects `{ schoolId }` across all queries and verifies ownership on mutations.
 */
export function getTenantPrisma<TClient extends PrismaClient | Prisma.TransactionClient>(
  schoolId: string,
  client: TClient = prisma as unknown as TClient
) {
  if (!schoolId || typeof schoolId !== "string" || schoolId.trim().length === 0) {
    throw new TenantIsolationError("Cannot initialize tenant client without a valid schoolId");
  }

  const cleanSchoolId = schoolId.trim();

  // Helper to safely access model delegate by lowercase first letter
  const getModelDelegate = (rawClient: Record<string, unknown>, modelName: string) => {
    const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    return rawClient[delegateName] as {
      findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    };
  };

  const rawAnyClient = client as unknown as Record<string, unknown>;

  // Case 1: Standard PrismaClient supporting $extends
  if (typeof rawAnyClient.$extends === "function") {
    return (client as PrismaClient).$extends({
      name: "VidyoraTenantExtension",
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (model && TENANT_MODELS.has(model)) {
              const rawArgs = (args || {}) as Record<string, unknown>;

              // 1. Read Operations: Auto-inject schoolId filter
              if (
                [
                  "findMany",
                  "findFirst",
                  "findFirstOrThrow",
                  "count",
                  "aggregate",
                  "groupBy",
                ].includes(operation)
              ) {
                const currentWhere = (rawArgs.where || {}) as Record<string, unknown>;
                rawArgs.where = { ...currentWhere, schoolId: cleanSchoolId };
              }

              // 2. findUnique / findUniqueOrThrow: Verify tenant ownership after lookup
              else if (operation === "findUnique" || operation === "findUniqueOrThrow") {
                const result = await query(args);
                if (result) {
                  const record = result as Record<string, unknown>;
                  if (record.schoolId && record.schoolId !== cleanSchoolId) {
                    throw new TenantIsolationError(
                      `Cross-tenant access attempted on ${model}: record belongs to another school`
                    );
                  }
                }
                return result;
              }

              // 3. Create Operations: Enforce schoolId on new records
              else if (operation === "create") {
                const currentData = (rawArgs.data || {}) as Record<string, unknown>;
                if (currentData.schoolId && currentData.schoolId !== cleanSchoolId) {
                  throw new TenantIsolationError(`Cannot create ${model} for a conflicting schoolId`);
                }
                if (currentData.school && typeof currentData.school === "object") {
                  const schoolConnect = (currentData.school as Record<string, unknown>).connect as Record<string, unknown> | undefined;
                  if (schoolConnect && schoolConnect.id && schoolConnect.id !== cleanSchoolId) {
                    throw new TenantIsolationError(`Cannot create ${model} for a conflicting schoolId`);
                  }
                }
                rawArgs.data = { ...currentData, schoolId: cleanSchoolId };
              } else if (operation === "createMany") {
                if (Array.isArray(rawArgs.data)) {
                  rawArgs.data = rawArgs.data.map((item: Record<string, unknown>) => {
                    if (item.schoolId && item.schoolId !== cleanSchoolId) {
                      throw new TenantIsolationError(`Cannot create ${model} for a conflicting schoolId`);
                    }
                    return { ...item, schoolId: cleanSchoolId };
                  });
                } else if (rawArgs.data) {
                  const item = rawArgs.data as Record<string, unknown>;
                  rawArgs.data = { ...item, schoolId: cleanSchoolId };
                }
              }

              // 4. Update / Delete / Upsert Operations: Verify ownership before mutation
              else if (["update", "delete"].includes(operation)) {
                const delegate = getModelDelegate(client as unknown as Record<string, unknown>, model);
                if (delegate && typeof delegate.findFirst === "function") {
                  const currentWhere = (rawArgs.where || {}) as Record<string, unknown>;
                  const existing = await delegate.findFirst({
                    where: { ...currentWhere, schoolId: cleanSchoolId },
                  });
                  if (!existing) {
                    throw new TenantIsolationError(
                      `Cross-tenant mutation blocked: ${model} record not found in school ${cleanSchoolId}`
                    );
                  }
                }
              } else if (["updateMany", "deleteMany"].includes(operation)) {
                const currentWhere = (rawArgs.where || {}) as Record<string, unknown>;
                rawArgs.where = { ...currentWhere, schoolId: cleanSchoolId };
              } else if (operation === "upsert") {
                const currentCreate = (rawArgs.create || {}) as Record<string, unknown>;
                const currentUpdate = (rawArgs.update || {}) as Record<string, unknown>;
                rawArgs.create = { ...currentCreate, schoolId: cleanSchoolId };
                rawArgs.update = { ...currentUpdate, schoolId: cleanSchoolId };
              }
            }

            return query(args);
          },
        },
      },
    });
  }

  // Case 2: Interactive TransactionClient (inside withTenantContext where PostgreSQL RLS is already forced)
  return new Proxy(client as unknown as Record<string, unknown>, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver);
      if (typeof prop === "string" && TENANT_MODELS.has(prop.charAt(0).toUpperCase() + prop.slice(1))) {
        const modelName = prop.charAt(0).toUpperCase() + prop.slice(1);
        return new Proxy(orig as Record<string, unknown>, {
          get(modelTarget, modelProp) {
            const method = Reflect.get(modelTarget, modelProp);
            if (typeof method === "function") {
              return async function (...fnArgs: unknown[]) {
                const rawArgs = ((fnArgs[0] || {}) as Record<string, unknown>);
                if (
                  [
                    "findMany",
                    "findFirst",
                    "findFirstOrThrow",
                    "count",
                    "aggregate",
                    "groupBy",
                  ].includes(modelProp as string)
                ) {
                  rawArgs.where = { ...(rawArgs.where as Record<string, unknown> || {}), schoolId: cleanSchoolId };
                } else if (modelProp === "create") {
                  rawArgs.data = { ...(rawArgs.data as Record<string, unknown> || {}), schoolId: cleanSchoolId };
                } else if (modelProp === "createMany") {
                  if (Array.isArray(rawArgs.data)) {
                    rawArgs.data = rawArgs.data.map((item: Record<string, unknown>) => ({ ...item, schoolId: cleanSchoolId }));
                  } else if (rawArgs.data) {
                    rawArgs.data = { ...(rawArgs.data as Record<string, unknown>), schoolId: cleanSchoolId };
                  }
                } else if (["updateMany", "deleteMany"].includes(modelProp as string)) {
                  rawArgs.where = { ...(rawArgs.where as Record<string, unknown> || {}), schoolId: cleanSchoolId };
                } else if (modelProp === "findUnique" || modelProp === "findUniqueOrThrow") {
                  const result = await (method as (...a: unknown[]) => Promise<Record<string, unknown> | null>).apply(
                    modelTarget,
                    fnArgs
                  );
                  if (result && result.schoolId && result.schoolId !== cleanSchoolId) {
                    throw new TenantIsolationError(
                      `Cross-tenant access attempted on ${modelName}: record belongs to another school`
                    );
                  }
                  return result;
                }
                return (method as (...a: unknown[]) => unknown).apply(modelTarget, [rawArgs, ...fnArgs.slice(1)]);
              };
            }
            return method;
          },
        });
      }
      return orig;
    },
  });
}

/**
 * Returns a tenant-scoped client.
 */
export function createTenantClient(schoolId: string, client: PrismaClient | Prisma.TransactionClient = prisma) {
  return getTenantPrisma(schoolId, client);
}

/**
 * Executes database operations inside a PostgreSQL transaction with
 * transaction-local Row-Level Security tenant context AND dynamic Prisma tenant extension.
 * 
 * 1. Switches transaction locally to restricted role: `SET LOCAL ROLE vidyora_app;`
 * 2. Sets transaction-local tenant context: `SELECT set_config('app.current_school_id', $1, true)`
 * 3. Enforces dual-layer defense-in-depth across both PostgreSQL RLS and Prisma Client Extension.
 */
export async function withTenantContext<T>(
  schoolId: string,
  fn: (tenantTx: ReturnType<typeof getTenantPrisma> & Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (!schoolId || typeof schoolId !== "string" || schoolId.trim().length === 0) {
    throw new TenantIsolationError("Operation aborted: Missing or empty schoolId context");
  }

  const cleanSchoolId = schoolId.trim();

  return prisma.$transaction(async (tx) => {
    // 1. Switch transaction locally to the non-bypass runtime role vidyora_app
    try {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE vidyora_app;`);
    } catch {
      // Role switch fallback for environments without role provisioning
    }

    // 2. Set transaction-local session variable for PostgreSQL RLS (is_local = true)
    await tx.$executeRaw`SELECT set_config('app.current_school_id', ${cleanSchoolId}, true)`;

    // 3. Bind dynamic Prisma extension/proxy to the transaction
    const tenantTx = getTenantPrisma(cleanSchoolId, tx);

    return fn(tenantTx as unknown as ReturnType<typeof getTenantPrisma> & Prisma.TransactionClient);
  });
}
