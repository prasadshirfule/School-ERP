import prisma from "./prisma";

interface LogAuditParams {
  schoolId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    const detailsString =
      params.details && typeof params.details === "object"
        ? JSON.stringify(params.details)
        : (params.details as string) || null;

    return await prisma.auditLog.create({
      data: {
        schoolId: params.schoolId || null,
        userId: params.userId || null,
        userEmail: params.userEmail || null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId || null,
        details: detailsString,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("[AUDIT] Failed to record audit log:", error);
    return null;
  }
}
