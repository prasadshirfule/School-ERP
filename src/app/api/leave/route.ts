import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";

/**
 * GET /api/leave
 * - For TEACHER / ACCOUNTANT: Returns their own leave requests.
 * - For ADMIN / PRINCIPAL: Returns all school leave requests (optional ?status= filter).
 */
export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const role = ctx.session.user.role;
  const isStaff = role === "TEACHER" || role === "ACCOUNTANT";

  const whereClause: any = {};
  if (isStaff) {
    whereClause.userId = ctx.session.user.id;
  }
  if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status.toUpperCase())) {
    whereClause.status = status.toUpperCase();
  }

  const requests = await ctx.db.leaveRequest.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          teacherProfile: { select: { fullName: true } },
        },
      },
      approvedByUser: {
        select: { id: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

/**
 * POST /api/leave
 * Staff submits a new leave request.
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const leaveType = typeof body.leaveType === "string" ? body.leaveType.trim() : "Casual";
  const startDate = typeof body.startDate === "string" ? body.startDate.trim() : "";
  const endDate = typeof body.endDate === "string" ? body.endDate.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!startDate || !endDate) return badRequest("Start and end dates are required");
  if (!reason) return badRequest("Reason for leave is required");

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return badRequest("Invalid start or end date");
  }
  if (start > end) {
    return badRequest("Start date cannot be after end date");
  }

  const leave = await ctx.db.leaveRequest.create({
    data: {
      userId: ctx.session.user.id,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
      status: "PENDING",
    } as any,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          teacherProfile: { select: { fullName: true } },
        },
      },
    },
  });

  return NextResponse.json(leave, { status: 201 });
}

/**
 * PATCH /api/leave
 * Admin / Principal reviews (approves/rejects) a leave request.
 */
export async function PATCH(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
  const adminRemark = typeof body.adminRemark === "string" ? body.adminRemark.trim() : null;

  if (!id) return badRequest("Leave request ID is required");
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return badRequest("Status must be APPROVED, REJECTED, or PENDING");
  }

  const existing = await ctx.db.leaveRequest.findUnique({ where: { id } });
  if (!existing) return badRequest("Leave request not found");

  const updated = await ctx.db.leaveRequest.update({
    where: { id },
    data: {
      status,
      adminRemark,
      approvedByUserId: ctx.session.user.id,
    } as any,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          teacherProfile: { select: { fullName: true } },
        },
      },
      approvedByUser: {
        select: { id: true, email: true },
      },
    },
  });

  return NextResponse.json(updated);
}
