import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function verifyNexusApiKey(request: Request): boolean {
  const configuredKey = process.env.NEXUS_API_KEY || "nexus-dev-master-api-key";
  const authHeader = request.headers.get("authorization");
  const nexusHeader = request.headers.get("x-nexus-api-key");

  let providedKey: string | null = null;
  if (nexusHeader) {
    providedKey = nexusHeader;
  } else if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    providedKey = authHeader.substring(7).trim();
  }

  if (!providedKey) return false;
  return providedKey === configuredKey;
}

export async function GET(request: Request) {
  try {
    if (!verifyNexusApiKey(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing NEXUS API Key", code: "NEXUS_UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.SchoolWhereInput = {};
    if (status && status !== "ALL") {
      where.status = status as Prisma.EnumSchoolStatusFilter["equals"];
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { affiliationNumber: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, schools] = await Promise.all([
      prisma.school.count({ where }),
      prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subscription: {
            include: { plan: true },
          },
          _count: {
            select: { students: true, users: true },
          },
        },
      }),
    ]);

    const formatted = schools.map((s) => ({
      id: s.id,
      name: s.name,
      affiliationNumber: s.affiliationNumber,
      email: s.email,
      phone: s.phone,
      address: s.address,
      status: s.status,
      isActive: s.isActive,
      studentCount: s._count.students,
      userCount: s._count.users,
      createdAt: s.createdAt,
      subscription: s.subscription
        ? {
            id: s.subscription.id,
            status: s.subscription.status,
            planName: s.subscription.plan?.name || "Trial",
            trialEndsAt: s.subscription.trialEndsAt,
            currentPeriodEnd: s.subscription.currentPeriodEnd,
            isExpired:
              s.subscription.status === "EXPIRED" ||
              (s.subscription.trialEndsAt && new Date(s.subscription.trialEndsAt) < new Date()),
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: unknown) {
    console.error("[NEXUS_API_SCHOOLS] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error querying NEXUS schools", code: "NEXUS_INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
