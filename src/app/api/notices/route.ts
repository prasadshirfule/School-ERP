import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";

export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const forRole = searchParams.get("role");

  const where: any = {};
  if (forRole) {
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

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, body: noticeBody, audience } = body;

  if (!title || !noticeBody || !audience?.length) {
    return badRequest("title, body, and audience are required");
  }

  const notice = await ctx.db.notice.create({
    data: {
      title,
      body: noticeBody,
      audience,
    } as any,
  });

  return NextResponse.json(notice, { status: 201 });
}
