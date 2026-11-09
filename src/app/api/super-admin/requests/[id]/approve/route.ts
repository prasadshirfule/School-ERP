import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSuperAdminSession, unauthorized } from "@/lib/utils";
import { logAuditEvent } from "@/lib/audit";
import { createTrialSubscription } from "@/lib/subscription";
import { Role } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdminSession();
  if (!session) {
    return unauthorized();
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
  }

  try {
    const regRequest = await prisma.schoolRegistrationRequest.findUnique({
      where: { id },
    });

    if (!regRequest) {
      return NextResponse.json({ error: "Registration request not found" }, { status: 404 });
    }

    if (regRequest.status === "APPROVED") {
      return NextResponse.json({ error: "Request is already approved" }, { status: 400 });
    }

    // Process approval inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create School
      const school = await tx.school.create({
        data: {
          name: regRequest.schoolName,
          boardType: regRequest.boardType || "CBSE",
          email: regRequest.officialEmail,
          phone: regRequest.phone,
          address: regRequest.address,
          principalName: regRequest.principalName,
          affiliationNumber: regRequest.affiliationNo,
          isActive: true,
          status: "APPROVED",
          approvedAt: new Date(),
          approvedByUserId: session.user.id,
        },
      });

      // 2. Setup standard default grading scale for the new school
      const defaultGrades = [
        { grade: "A1", minScore: 91, maxScore: 100 },
        { grade: "A2", minScore: 81, maxScore: 90 },
        { grade: "B1", minScore: 71, maxScore: 80 },
        { grade: "B2", minScore: 61, maxScore: 70 },
        { grade: "C1", minScore: 51, maxScore: 60 },
        { grade: "C2", minScore: 41, maxScore: 50 },
        { grade: "D", minScore: 33, maxScore: 40 },
        { grade: "E", minScore: 0, maxScore: 32 },
      ];

      for (const dg of defaultGrades) {
        await tx.gradingScale.create({
          data: {
            schoolId: school.id,
            grade: dg.grade,
            minScore: dg.minScore,
            maxScore: dg.maxScore,
          },
        });
      }

      // 3. Create or attach school admin user
      let adminUser = await tx.user.findUnique({
        where: { email: regRequest.adminEmail },
      });

      if (!adminUser) {
        adminUser = await tx.user.create({
          data: {
            email: regRequest.adminEmail,
            phone: regRequest.adminPhone,
            passwordHash: regRequest.adminPasswordHash,
            role: Role.ADMIN,
            schoolId: school.id,
            isActive: true,
            status: "ACTIVE",
            emailVerified: regRequest.emailVerifiedAt || new Date(),
          },
        });
      } else {
        // Link existing user to this school as ADMIN if unassigned
        adminUser = await tx.user.update({
          where: { id: adminUser.id },
          data: {
            schoolId: school.id,
            role: Role.ADMIN,
            status: "ACTIVE",
            isActive: true,
          },
        });
      }

      // 4. Update registration request
      const updatedRequest = await tx.schoolRegistrationRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedByUserId: session.user.id,
          schoolId: school.id,
        },
      });

      // 5. Automatically provision 30-day trial subscription for new school
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const starterPlan = await tx.subscriptionPlan.findUnique({
        where: { code: "PROFESSIONAL" },
      });

      await tx.subscription.create({
        data: {
          schoolId: school.id,
          planId: starterPlan?.id || null,
          status: "TRIALING",
          billingCycle: "ANNUAL",
          studentCount: 100,
          amount: 0,
          currency: "INR",
          trialStartsAt: new Date(),
          trialEndsAt,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndsAt,
        },
      });

      // 6. Send welcome notification to school administrator
      await tx.notification.create({
        data: {
          schoolId: school.id,
          userId: adminUser.id,
          title: "Welcome to School ERP!",
          message: `Congratulations! ${school.name} has been approved with a complimentary 30-day trial. Explore all features and configure your academic year.`,
          type: "APPROVAL",
          linkUrl: "/admin/dashboard",
        },
      });

      return { school, adminUser, updatedRequest };
    });

    // 5. Audit Log
    await logAuditEvent({
      schoolId: result.school.id,
      userId: session.user.id,
      userEmail: session.user.email,
      action: "SCHOOL_APPROVED",
      targetType: "School",
      targetId: result.school.id,
      details: {
        schoolName: result.school.name,
        adminEmail: result.adminUser.email,
        requestId: id,
      },
    });

    return NextResponse.json({
      success: true,
      schoolId: result.school.id,
      schoolName: result.school.name,
      adminEmail: result.adminUser.email,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to approve registration request";
    console.error("[SUPER_ADMIN] Error approving school registration:", error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
