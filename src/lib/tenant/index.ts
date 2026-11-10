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
  "SecurityEvent",
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

const TENANT_RELATION_FIELD_MAP: Record<string, string> = {
  academicYearId: "AcademicYear",
  academicYear: "AcademicYear",
  classId: "Class",
  class: "Class",
  sectionId: "Section",
  section: "Section",
  subjectId: "Subject",
  subject: "Subject",
  departmentId: "Department",
  department: "Department",
  teacherProfileId: "TeacherProfile",
  teacherProfile: "TeacherProfile",
  studentId: "Student",
  student: "Student",
  feeStructureId: "FeeStructure",
  feeStructure: "FeeStructure",
  feeInstallmentId: "FeeInstallment",
  feeInstallment: "FeeInstallment",
  feeInvoiceId: "FeeInvoice",
  feeInvoice: "FeeInvoice",
  examinationId: "Examination",
  examination: "Examination",
  examSubjectId: "ExamSubject",
  examSubject: "ExamSubject",
};

/**
 * Centralized recursive validator for nested relations, connects, and creates.
 * Enforces that no foreign keys or relation connects link records across different schools.
 */
async function validateNestedData(
  data: Record<string, unknown> | undefined,
  cleanSchoolId: string,
  delegateResolver: (modelName: string) => { findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null> } | undefined
): Promise<void> {
  if (!data || typeof data !== "object") return;

  // 1. Direct school relation connect check
  if (data.school && typeof data.school === "object") {
    const schoolObj = data.school as Record<string, unknown>;
    const connectObj = schoolObj.connect as Record<string, unknown> | undefined;
    if (connectObj?.id && connectObj.id !== cleanSchoolId) {
      throw new TenantIsolationError(`Cross-tenant relation rejected: Cannot link entity to school '${connectObj.id}'`);
    }
  }

  for (const [key, val] of Object.entries(data)) {
    if (!val) continue;

    // Direct scalar foreign key check (e.g. sectionId: "other_school_section")
    const targetModel = TENANT_RELATION_FIELD_MAP[key];
    if (targetModel && TENANT_MODELS.has(targetModel) && typeof val === "string" && val.trim().length > 0) {
      const delegate = delegateResolver(targetModel);
      if (delegate && typeof delegate.findFirst === "function") {
        const found = await delegate.findFirst({
          where: { id: val.trim() },
        });
        if (found && found.schoolId && found.schoolId !== cleanSchoolId) {
          throw new TenantIsolationError(
            `Cross-tenant relation rejected: Referenced ${targetModel} ('${val}') belongs to another school`
          );
        }
      }
    }

    // Nested relation objects (e.g. section: { connect: { id: "..." } })
    if (typeof val === "object" && !Array.isArray(val)) {
      const relationObj = val as Record<string, unknown>;

      // A. connect: verify the connected record belongs to cleanSchoolId
      if (relationObj.connect) {
        const connectVal = relationObj.connect as Record<string, unknown>;
        const foreignId = (connectVal.id as string) || (connectVal.schoolId_admissionNo as Record<string, unknown>)?.admissionNo;
        if (targetModel && TENANT_MODELS.has(targetModel) && typeof foreignId === "string") {
          const delegate = delegateResolver(targetModel);
          if (delegate && typeof delegate.findFirst === "function") {
            const found = await delegate.findFirst({
              where: { id: foreignId },
            });
            if (found && found.schoolId && found.schoolId !== cleanSchoolId) {
              throw new TenantIsolationError(
                `Cross-tenant relation rejected: Connected ${targetModel} ('${foreignId}') belongs to another school`
              );
            }
          }
        }
      }

      // B. connectOrCreate: ensure create payload has cleanSchoolId
      if (relationObj.connectOrCreate) {
        const coc = relationObj.connectOrCreate as Record<string, unknown>;
        if (coc.create && typeof coc.create === "object") {
          const createObj = coc.create as Record<string, unknown>;
          if (createObj.schoolId && createObj.schoolId !== cleanSchoolId) {
            throw new TenantIsolationError(`Cannot connectOrCreate relation with conflicting schoolId`);
          }
          createObj.schoolId = cleanSchoolId;
        }
      }

      // C. nested create: ensure child entity has cleanSchoolId
      if (relationObj.create && typeof relationObj.create === "object") {
        const createObj = relationObj.create as Record<string, unknown>;
        if (targetModel && TENANT_MODELS.has(targetModel)) {
          if (createObj.schoolId && createObj.schoolId !== cleanSchoolId) {
            throw new TenantIsolationError(`Cannot create nested relation with conflicting schoolId`);
          }
          createObj.schoolId = cleanSchoolId;
        }
      }
    }
  }
}

/**
 * Flattens Prisma compound unique keys (e.g. { studentId_parentProfileId: { studentId, parentProfileId } })
 * into direct property filters compatible with findFirst({ where }).
 */
function flattenWhere(where: Record<string, unknown>): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(where)) {
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      const subKeys = Object.keys(val);
      const isOperator = subKeys.some((k) =>
        ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "mode"].includes(k)
      );
      if (!isOperator && subKeys.length > 0) {
        Object.assign(flattened, val);
        continue;
      }
    }
    flattened[key] = val;
  }
  return flattened;
}

/**
 * Creates a dynamic, tenant-aware Prisma Client Extension covering ALL 34 tenant-owned models.
 * Automatically injects `{ schoolId }` across all queries and verifies ownership on mutations.
 */
export function getTenantPrisma(
  schoolId: string,
  client: PrismaClient | Prisma.TransactionClient = prisma
): PrismaClient {
  if (!schoolId || typeof schoolId !== "string" || schoolId.trim().length === 0) {
    throw new TenantIsolationError("Cannot initialize tenant client without a valid schoolId");
  }

  const cleanSchoolId = schoolId.trim();

  // Helper to safely access model delegate by lowercase first letter
  const getModelDelegate = (rawClient: Record<string, unknown>, modelName: string) => {
    const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    return rawClient[delegateName] as {
      findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    } | undefined;
  };

  const rawAnyClient = client as unknown as Record<string, unknown>;

  // Case 1: Standard PrismaClient supporting $extends
  if (typeof rawAnyClient.$extends === "function") {
    return ((client as PrismaClient).$extends({
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
                  if (record.schoolId !== cleanSchoolId) {
                    throw new TenantIsolationError(
                      `Cross-tenant access attempted on ${model}: record belongs to another school`
                    );
                  }
                }
                return result;
              }

              // 3. Create Operations: Enforce schoolId on new records and validate relations
              else if (operation === "create") {
                const currentData = (rawArgs.data || {}) as Record<string, unknown>;
                if (currentData.schoolId && currentData.schoolId !== cleanSchoolId) {
                  throw new TenantIsolationError(`Cannot create ${model} for a conflicting schoolId`);
                }
                await validateNestedData(currentData, cleanSchoolId, (m) => getModelDelegate(rawAnyClient, m));
                rawArgs.data = { ...currentData, schoolId: cleanSchoolId };
              } else if (operation === "createMany") {
                if (Array.isArray(rawArgs.data)) {
                  for (const item of rawArgs.data as Record<string, unknown>[]) {
                    if (item.schoolId && item.schoolId !== cleanSchoolId) {
                      throw new TenantIsolationError(`Cannot create ${model} for a conflicting schoolId`);
                    }
                    await validateNestedData(item, cleanSchoolId, (m) => getModelDelegate(rawAnyClient, m));
                  }
                  rawArgs.data = (rawArgs.data as Record<string, unknown>[]).map((item) => ({
                    ...item,
                    schoolId: cleanSchoolId,
                  }));
                } else if (rawArgs.data) {
                  const item = rawArgs.data as Record<string, unknown>;
                  await validateNestedData(item, cleanSchoolId, (m) => getModelDelegate(rawAnyClient, m));
                  rawArgs.data = { ...item, schoolId: cleanSchoolId };
                }
              }

              // 4. Update / Delete Operations: Verify ownership before mutation
              else if (["update", "delete"].includes(operation)) {
                const rootDelegate = getModelDelegate(prisma as unknown as Record<string, unknown>, model);
                const currentWhere = (rawArgs.where || {}) as Record<string, unknown>;
                if (rootDelegate && typeof rootDelegate.findFirst === "function") {
                  const existing = await rootDelegate.findFirst({
                    where: flattenWhere(currentWhere),
                  });
                  if (existing && existing.schoolId && existing.schoolId !== cleanSchoolId) {
                    throw new TenantIsolationError(
                      `Cross-tenant ${operation} blocked: ${model} record belongs to school '${existing.schoolId}', expected '${cleanSchoolId}'`
                    );
                  }
                  if (!existing) {
                    throw new TenantIsolationError(
                      `Cross-tenant mutation blocked: ${model} record not found in school ${cleanSchoolId}`
                    );
                  }
                }

                if (operation === "update") {
                  const currentData = (rawArgs.data || {}) as Record<string, unknown>;
                  if (currentData.schoolId && currentData.schoolId !== cleanSchoolId) {
                    throw new TenantIsolationError(`Cannot alter schoolId on ${model}`);
                  }
                  await validateNestedData(currentData, cleanSchoolId, (m) => getModelDelegate(rawAnyClient, m));
                  rawArgs.data = { ...currentData, schoolId: cleanSchoolId };
                }
              } else if (["updateMany", "deleteMany"].includes(operation)) {
                const currentWhere = (rawArgs.where || {}) as Record<string, unknown>;
                rawArgs.where = { ...currentWhere, schoolId: cleanSchoolId };
              } else if (operation === "upsert") {
                const rootDelegate = getModelDelegate(prisma as unknown as Record<string, unknown>, model);
                const currentWhere = (rawArgs.where || {}) as Record<string, unknown>;
                if (rootDelegate && typeof rootDelegate.findFirst === "function") {
                  const existing = await rootDelegate.findFirst({
                    where: flattenWhere(currentWhere),
                  });
                  if (existing && existing.schoolId && existing.schoolId !== cleanSchoolId) {
                    throw new TenantIsolationError(
                      `Cross-tenant upsert blocked: ${model} record belongs to school '${existing.schoolId}', expected '${cleanSchoolId}'`
                    );
                  }
                }
                const currentCreate = (rawArgs.create || {}) as Record<string, unknown>;
                const currentUpdate = (rawArgs.update || {}) as Record<string, unknown>;
                if (currentCreate.schoolId && currentCreate.schoolId !== cleanSchoolId) {
                  throw new TenantIsolationError(`Cannot upsert ${model} with conflicting schoolId in create`);
                }
                if (currentUpdate.schoolId && currentUpdate.schoolId !== cleanSchoolId) {
                  throw new TenantIsolationError(`Cannot upsert ${model} with conflicting schoolId in update`);
                }
                await validateNestedData(currentCreate, cleanSchoolId, (m) => getModelDelegate(rawAnyClient, m));
                await validateNestedData(currentUpdate, cleanSchoolId, (m) => getModelDelegate(rawAnyClient, m));
                rawArgs.create = { ...currentCreate, schoolId: cleanSchoolId };
                rawArgs.update = { ...currentUpdate, schoolId: cleanSchoolId };
              }
            }

            return query(args);
          },
        },
      },
    }) as unknown) as PrismaClient;
  }

  // Case 2: Interactive TransactionClient (inside withTenantContext where PostgreSQL RLS is already forced)
  return (new Proxy(client as unknown as Record<string, unknown>, {
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

                // 1. Reads
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
                }

                // 2. findUnique / findUniqueOrThrow
                else if (modelProp === "findUnique" || modelProp === "findUniqueOrThrow") {
                  const result = await (method as (...a: unknown[]) => Promise<Record<string, unknown> | null>).apply(
                    modelTarget,
                    fnArgs
                  );
                  if (result && result.schoolId !== cleanSchoolId) {
                    throw new TenantIsolationError(
                      `Cross-tenant access attempted on ${modelName}: record belongs to another school`
                    );
                  }
                  return result;
                }

                // 3. Create
                else if (modelProp === "create") {
                  const currentData = (rawArgs.data || {}) as Record<string, unknown>;
                  if (currentData.schoolId && currentData.schoolId !== cleanSchoolId) {
                    throw new TenantIsolationError(`Cannot create ${modelName} for a conflicting schoolId`);
                  }
                  await validateNestedData(currentData, cleanSchoolId, (m) => getModelDelegate(target, m));
                  rawArgs.data = { ...currentData, schoolId: cleanSchoolId };
                } else if (modelProp === "createMany") {
                  if (Array.isArray(rawArgs.data)) {
                    for (const item of rawArgs.data as Record<string, unknown>[]) {
                      if (item.schoolId && item.schoolId !== cleanSchoolId) {
                        throw new TenantIsolationError(`Cannot create ${modelName} for a conflicting schoolId`);
                      }
                      await validateNestedData(item, cleanSchoolId, (m) => getModelDelegate(target, m));
                    }
                    rawArgs.data = (rawArgs.data as Record<string, unknown>[]).map((item) => ({
                      ...item,
                      schoolId: cleanSchoolId,
                    }));
                  } else if (rawArgs.data) {
                    const item = rawArgs.data as Record<string, unknown>;
                    await validateNestedData(item, cleanSchoolId, (m) => getModelDelegate(target, m));
                    rawArgs.data = { ...item, schoolId: cleanSchoolId };
                  }
                }

                // 4. Update / Delete
                else if (modelProp === "update" || modelProp === "delete") {
                  const currentWhere = (rawArgs.where || {}) as Record<string, unknown>;
                  const rootDelegate = getModelDelegate(prisma as unknown as Record<string, unknown>, modelName);
                  if (rootDelegate && typeof rootDelegate.findFirst === "function") {
                    const existing = await rootDelegate.findFirst({ where: flattenWhere(currentWhere) });
                    if (existing && existing.schoolId && existing.schoolId !== cleanSchoolId) {
                      throw new TenantIsolationError(
                        `Cross-tenant ${String(modelProp)} blocked on ${modelName}: target record belongs to another school`
                      );
                    }
                    if (!existing) {
                      throw new TenantIsolationError(
                        `Cross-tenant mutation blocked: ${modelName} record not found in school ${cleanSchoolId}`
                      );
                    }
                  }

                  if (modelProp === "update") {
                    const currentData = (rawArgs.data || {}) as Record<string, unknown>;
                    if (currentData.schoolId && currentData.schoolId !== cleanSchoolId) {
                      throw new TenantIsolationError(`Cannot alter schoolId on ${modelName}`);
                    }
                    await validateNestedData(currentData, cleanSchoolId, (m) => getModelDelegate(target, m));
                    rawArgs.data = { ...currentData, schoolId: cleanSchoolId };
                  }
                }

                // 5. UpdateMany / DeleteMany
                else if (["updateMany", "deleteMany"].includes(modelProp as string)) {
                  rawArgs.where = { ...(rawArgs.where as Record<string, unknown> || {}), schoolId: cleanSchoolId };
                }

                // 6. Upsert
                else if (modelProp === "upsert") {
                  const currentWhere = (rawArgs.where || {}) as Record<string, unknown>;
                  const rootDelegate = getModelDelegate(prisma as unknown as Record<string, unknown>, modelName);
                  if (rootDelegate && typeof rootDelegate.findFirst === "function") {
                    const existing = await rootDelegate.findFirst({ where: flattenWhere(currentWhere) });
                    if (existing && existing.schoolId && existing.schoolId !== cleanSchoolId) {
                      throw new TenantIsolationError(
                        `Cross-tenant upsert blocked on ${modelName}: target record belongs to another school`
                      );
                    }
                  }
                  const currentCreate = (rawArgs.create || {}) as Record<string, unknown>;
                  const currentUpdate = (rawArgs.update || {}) as Record<string, unknown>;
                  if (currentCreate.schoolId && currentCreate.schoolId !== cleanSchoolId) {
                    throw new TenantIsolationError(`Cannot upsert ${modelName} with conflicting schoolId in create`);
                  }
                  if (currentUpdate.schoolId && currentUpdate.schoolId !== cleanSchoolId) {
                    throw new TenantIsolationError(`Cannot upsert ${modelName} with conflicting schoolId in update`);
                  }
                  await validateNestedData(currentCreate, cleanSchoolId, (m) => getModelDelegate(target, m));
                  await validateNestedData(currentUpdate, cleanSchoolId, (m) => getModelDelegate(target, m));
                  rawArgs.create = { ...currentCreate, schoolId: cleanSchoolId };
                  rawArgs.update = { ...currentUpdate, schoolId: cleanSchoolId };
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
  }) as unknown) as PrismaClient;
}

/**
 * Returns a tenant-scoped client.
 */
export function createTenantClient(schoolId: string, client: PrismaClient | Prisma.TransactionClient = prisma): PrismaClient {
  return getTenantPrisma(schoolId, client);
}

/**
 * Executes database operations inside a PostgreSQL transaction with
 * transaction-local Row-Level Security tenant context AND dynamic Prisma tenant extension.
 * 
 * 1. Switches transaction locally to restricted role: `SET LOCAL ROLE vidyora_app;`
 *    Fails closed immediately if role switch fails.
 * 2. Sets transaction-local tenant context: `SELECT set_config('app.current_school_id', $1, true)`
 * 3. Enforces dual-layer defense-in-depth across both PostgreSQL RLS and Prisma Client Extension.
 */
export async function withTenantContext<T>(
  schoolId: string,
  fn: (tenantTx: PrismaClient) => Promise<T>
): Promise<T> {
  if (!schoolId || typeof schoolId !== "string" || schoolId.trim().length === 0) {
    throw new TenantIsolationError("Operation aborted: Missing or empty schoolId context");
  }

  const cleanSchoolId = schoolId.trim();

  return prisma.$transaction(async (tx) => {
    // 1. Switch transaction locally to the non-bypass runtime role vidyora_app
    // FAIL CLOSED: If the restricted role cannot be assumed, abort transaction immediately.
    try {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE vidyora_app;`);
    } catch (error) {
      throw new TenantIsolationError(
        `Failed to set restricted runtime role 'vidyora_app'. Aborting transaction to prevent running under unconstrained privileges: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // 2. Set transaction-local session variable for PostgreSQL RLS (is_local = true)
    await tx.$executeRaw`SELECT set_config('app.current_school_id', ${cleanSchoolId}, true)`;

    // 3. Bind dynamic Prisma extension/proxy to the transaction
    const tenantTx = getTenantPrisma(cleanSchoolId, tx);

    return fn(tenantTx as unknown as ReturnType<typeof getTenantPrisma> & Prisma.TransactionClient);
  });
}
