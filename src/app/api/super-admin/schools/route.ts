import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSuperAdminSession, forbidden, unauthorized } from "@/lib/utils";

export async function GET() {
  const session = await getSuperAdminSession();
  if (!session) {
    return unauthorized();
  }

  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        boardType: true,
        email: true,
        phone: true,
        principalName: true,
        affiliationNumber: true,
        status: true,
        isActive: true,
        suspendedReason: true,
        createdAt: true,
        subscription: {
          include: {
            plan: true,
          },
        },
        _count: {
          select: {
            students: true,
            users: true,
            classes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = schools.map((s) => ({
      id: s.id,
      name: s.name,
      boardType: s.boardType,
      email: s.email,
      phone: s.phone,
      principalName: s.principalName,
      affiliationNumber: s.affiliationNumber,
      status: s.status,
      isActive: s.isActive,
      suspendedReason: s.suspendedReason,
      createdAt: s.createdAt,
      subscription: s.subscription ? {
        id: s.subscription.id,
        status: s.subscription.status,
        planName: s.subscription.plan?.name || "Professional",
        trialEndsAt: s.subscription.trialEndsAt,
        currentPeriodEnd: s.subscription.currentPeriodEnd,
      } : null,
      studentCount: s._count.students,
      staffCount: s._count.users,
      classCount: s._count.classes,
    }));

    return NextResponse.json({ schools: formatted });
  } catch (error: unknown) {
    console.error("[SUPER_ADMIN] Error listing schools:", error);
    return NextResponse.json({ error: "Failed to load schools" }, { status: 500 });
  }
}
