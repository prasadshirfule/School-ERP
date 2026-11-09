import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getSchoolSubscription,
  extendSchoolTrial,
  updateSubscriptionPlan,
} from "@/lib/subscription";
import { unauthorized } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    let targetSchoolId = session.user.schoolId;

    // Super Admin can view any school's subscription
    if (session.user.role === "SUPER_ADMIN") {
      const querySchoolId = searchParams.get("schoolId");
      if (querySchoolId) {
        targetSchoolId = querySchoolId;
      }
    }

    if (!targetSchoolId) {
      return NextResponse.json(
        { error: "No school association found for user session" },
        { status: 400 }
      );
    }

    const statusResult = await getSchoolSubscription(targetSchoolId);

    const activeStudents = await prisma.student.count({
      where: { schoolId: targetSchoolId, isActive: true },
    });

    const school = await prisma.school.findUnique({
      where: { id: targetSchoolId },
      select: { id: true, name: true, status: true, isActive: true },
    });

    return NextResponse.json({
      success: true,
      school,
      subscription: statusResult.subscription,
      plan: statusResult.plan,
      isReadOnly: statusResult.isReadOnly,
      daysRemaining: statusResult.daysRemaining,
      status: statusResult.status,
      activeStudents,
      maxStudents: statusResult.plan?.maxStudents ?? null,
    });
  } catch (error: unknown) {
    console.error("[API_SUBSCRIPTION] Error retrieving subscription:", error);
    return NextResponse.json(
      { error: "Failed to retrieve school subscription" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return unauthorized();
    }

    const body = await request.json();
    const { action, schoolId, planId, billingCycle, days, reason } = body;

    const targetSchoolId =
      session.user.role === "SUPER_ADMIN" ? schoolId || session.user.schoolId : session.user.schoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ error: "Target schoolId is required" }, { status: 400 });
    }

    // 1. Extend Trial (Super Admin privilege)
    if (action === "EXTEND_TRIAL") {
      if (session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Only Super Admin can grant trial extensions" }, { status: 403 });
      }

      const daysToAdd = Number(days) || 30;
      const updated = await extendSchoolTrial(
        targetSchoolId,
        daysToAdd,
        session.user.id,
        session.user.email || reason || "Platform owner extension"
      );

      return NextResponse.json({
        success: true,
        message: `Extended trial by ${daysToAdd} days`,
        subscription: updated,
      });
    }

    // 2. Change Plan (Admin or Super Admin)
    if (action === "CHANGE_PLAN") {
      if (!planId) {
        return NextResponse.json({ error: "planId is required" }, { status: 400 });
      }

      const updated = await updateSubscriptionPlan(
        targetSchoolId,
        planId,
        billingCycle || "ANNUAL"
      );

      return NextResponse.json({
        success: true,
        message: "Subscription plan updated successfully",
        subscription: updated,
      });
    }

    return NextResponse.json({ error: "Invalid action requested" }, { status: 400 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to process subscription action";
    console.error("[API_SUBSCRIPTION] Error modifying subscription:", error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
