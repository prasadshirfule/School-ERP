import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getTenantDb, unauthorized, badRequest, forbidden, hasRole } from "@/lib/utils";

export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const userRole = ctx.session.user.role;
  const { searchParams } = new URL(request.url);
  const forRole = searchParams.get("role");

  const where: Prisma.NoticeWhereInput = {};
  if (userRole !== "ADMIN" && userRole !== "PRINCIPAL") {
    // Non-admins can only see notices directed to their role
    where.audience = { has: userRole };
  } else if (forRole) {
    where.audience = { has: forRole };
  }

  const notices = await ctx.db.notice.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notices);
}

export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (!hasRole(ctx.session, ["ADMIN", "PRINCIPAL"])) {
    return forbidden();
  }

  const body = await request.json();
  const { title, body: noticeBody, audience } = body;

  if (!title || !noticeBody || !audience?.length) {
    return badRequest("title, body, and audience are required");
  }

  const notice = await ctx.db.notice.create({
    data: {
      schoolId: ctx.session.user.schoolId,
      title,
      body: noticeBody,
      audience,
    },
  });

  return NextResponse.json(notice, { status: 201 });
}
