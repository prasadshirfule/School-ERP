import prisma from "./prisma";
import { logAuditEvent } from "./audit";

export interface SubscriptionPlanInfo {
  code: string;
  name: string;
  description?: string | null;
  pricePerStudentMonth?: number | unknown;
  pricePerStudentYear?: number | unknown;
  minStudents?: number;
  maxStudents?: number | null;
  features?: string[];
  [key: string]: unknown;
}

export interface SubscriptionStatusResult {
  subscription: unknown;
  plan: SubscriptionPlanInfo | null;
  isReadOnly: boolean;
  daysRemaining: number;
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "EXPIRED" | "CANCELLED";
}

/**
 * Standard default pricing plans for School ERP SaaS platform
 */
export const DEFAULT_PLANS = [
  {
    code: "STARTER",
    name: "Starter",
    description: "Core academic operations, student records, daily attendance, and report cards.",
    pricePerStudentMonth: 15,
    pricePerStudentYear: 150,
    minStudents: 50,
    maxStudents: 300,
    features: [
      "Student & Staff Roster",
      "Daily Attendance Tracking",
      "Report Cards & Grading",
      "Fee Invoices & Offline Receipts",
      "Noticeboard Broadcasts",
      "Standard Email Support"
    ],
  },
  {
    code: "PROFESSIONAL",
    name: "Professional",
    description: "Complete ERP operations with timetable, staff leave, online payments, and parent portal.",
    pricePerStudentMonth: 25,
    pricePerStudentYear: 250,
    minStudents: 100,
    maxStudents: 1000,
    features: [
      "Everything in Starter",
      "Weekly Timetable & Syllabus Tracking",
      "Staff Leave & Department Operations",
      "Parent Self-Registration & Portal",
      "Razorpay Online Fee Payments",
      "Homework & Study Notes Attachments",
      "Priority Email & Phone Support"
    ],
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    description: "Comprehensive institutional governance, multi-campus controls, custom branding & dedicated SLA.",
    pricePerStudentMonth: 35,
    pricePerStudentYear: 350,
    minStudents: 200,
    maxStudents: null,
    features: [
      "Everything in Professional",
      "Multi-Campus Management",
      "Document Storage & Retention Vault",
      "Automated Scheduled Data Backups",
      "Custom School Domain & Branding",
      "Dedicated Account Manager & 99.9% SLA"
    ],
  },
];

/**
 * Seeds or synchronizes the default SaaS pricing plans in PostgreSQL.
 */
export async function seedDefaultPlans() {
  for (const p of DEFAULT_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        description: p.description,
        pricePerStudentMonth: p.pricePerStudentMonth,
        pricePerStudentYear: p.pricePerStudentYear,
        minStudents: p.minStudents,
        maxStudents: p.maxStudents,
        features: p.features,
        isActive: true,
      },
      create: {
        code: p.code,
        name: p.name,
        description: p.description,
        pricePerStudentMonth: p.pricePerStudentMonth,
        pricePerStudentYear: p.pricePerStudentYear,
        minStudents: p.minStudents,
        maxStudents: p.maxStudents,
        features: p.features,
        isActive: true,
      },
    });
  }
}

/**
 * Retrieves the current subscription for a school.
 * If no subscription exists (e.g. legacy school), provisions an automatic 30-day trial.
 * Automatically marks expired trials and periods as EXPIRED.
 */
export async function getSchoolSubscription(schoolId: string): Promise<SubscriptionStatusResult> {
  const cleanSchoolId = schoolId.trim();

  let subscription = await prisma.subscription.findUnique({
    where: { schoolId: cleanSchoolId },
    include: { plan: true },
  });

  const now = new Date();

  // If no subscription exists, automatically provision a 30-day trial
  if (!subscription) {
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const starterPlan = await prisma.subscriptionPlan.findUnique({
      where: { code: "PROFESSIONAL" },
    });

    const studentCount = await prisma.student.count({
      where: { schoolId: cleanSchoolId, isActive: true },
    });

    subscription = await prisma.subscription.create({
      data: {
        schoolId: cleanSchoolId,
        planId: starterPlan?.id || null,
        status: "TRIALING",
        billingCycle: "ANNUAL",
        studentCount: Math.max(studentCount, 50),
        amount: 0,
        currency: "INR",
        trialStartsAt: now,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
      },
      include: { plan: true },
    });
  }

  // Automatic state transition check: Trial Expired
  if (subscription.status === "TRIALING" && now > subscription.trialEndsAt) {
    subscription = await prisma.subscription.update({
      where: { schoolId: cleanSchoolId },
      data: { status: "EXPIRED" },
      include: { plan: true },
    });
  }

  // Automatic state transition check: Period Expired
  if (subscription.status === "ACTIVE" && now > subscription.currentPeriodEnd) {
    subscription = await prisma.subscription.update({
      where: { schoolId: cleanSchoolId },
      data: { status: "EXPIRED" },
      include: { plan: true },
    });
  }

  const isReadOnly = subscription.status === "EXPIRED" || subscription.status === "CANCELLED";

  // Calculate days remaining
  const targetEndDate = subscription.status === "TRIALING" ? subscription.trialEndsAt : subscription.currentPeriodEnd;
  const msRemaining = targetEndDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return {
    subscription,
    plan: subscription.plan,
    isReadOnly,
    daysRemaining,
    status: subscription.status as SubscriptionStatusResult["status"],
  };
}

/**
 * Asserts that a school subscription permits write operations.
 * Accepts either a schoolId (queries database) or an in-memory subscription object.
 * Throws an explicit error if the school is expired or in read-only mode.
 */
export async function assertSubscriptionAllowsWrite(
  schoolOrSub: string | { status: string; trialEndsAt?: Date | null; currentPeriodEnd?: Date | null }
): Promise<void> {
  if (typeof schoolOrSub === "object" && schoolOrSub !== null) {
    const now = new Date();
    const isExpired =
      schoolOrSub.status === "EXPIRED" ||
      schoolOrSub.status === "CANCELLED" ||
      schoolOrSub.status === "SUSPENDED" ||
      (schoolOrSub.status === "TRIALING" && schoolOrSub.trialEndsAt && now > schoolOrSub.trialEndsAt) ||
      (schoolOrSub.status === "ACTIVE" && schoolOrSub.currentPeriodEnd && now > schoolOrSub.currentPeriodEnd);

    if (isExpired) {
      const err = Object.assign(
        new Error(
          "SUBSCRIPTION_EXPIRED: Your school's 30-day trial or subscription has expired. The portal is currently in read-only mode. Please renew your subscription to perform changes."
        ),
        { code: "SUBSCRIPTION_EXPIRED" }
      );
      throw err;
    }
    return;
  }

  const status = await getSchoolSubscription(schoolOrSub);
  if (status.isReadOnly) {
    const err = Object.assign(
      new Error(
        "SUBSCRIPTION_EXPIRED: Your school's 30-day trial or subscription has expired. The portal is currently in read-only mode. Please renew your subscription to perform changes."
      ),
      { code: "SUBSCRIPTION_EXPIRED" }
    );
    throw err;
  }
}

/**
 * Automatically creates a 30-day trial subscription when a new school is approved.
 */
export async function createTrialSubscription(schoolId: string, initialStudentCount: number = 50) {
  const now = new Date();
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Get or seed professional plan
  let plan = await prisma.subscriptionPlan.findUnique({
    where: { code: "PROFESSIONAL" },
  });

  if (!plan) {
    await seedDefaultPlans();
    plan = await prisma.subscriptionPlan.findUnique({
      where: { code: "PROFESSIONAL" },
    });
  }

  return await prisma.subscription.upsert({
    where: { schoolId },
    update: {
      status: "TRIALING",
      trialStartsAt: now,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
    },
    create: {
      schoolId,
      planId: plan?.id || null,
      status: "TRIALING",
      billingCycle: "ANNUAL",
      studentCount: initialStudentCount,
      amount: 0,
      currency: "INR",
      trialStartsAt: now,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
    },
  });
}

/**
 * Platform Admin action to extend a school's trial period.
 */
export async function extendSchoolTrial(
  schoolId: string,
  additionalDays: number,
  adminUserId: string,
  adminUserEmail: string
) {
  const sub = await prisma.subscription.findUnique({ where: { schoolId } });
  if (!sub) throw new Error("Subscription record not found for school.");

  const currentEnd = sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
  const newEndsAt = new Date(currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);

  const updated = await prisma.subscription.update({
    where: { schoolId },
    data: {
      trialEndsAt: newEndsAt,
      currentPeriodEnd: newEndsAt,
      status: "TRIALING", // Re-activate from expired if extended
    },
  });

  await logAuditEvent({
    schoolId,
    userId: adminUserId,
    userEmail: adminUserEmail,
    action: "SUBSCRIPTION_TRIAL_EXTENDED",
    targetType: "Subscription",
    targetId: sub.id,
    details: { additionalDays, newTrialEndsAt: newEndsAt },
  });

  return updated;
}

/**
 * Change a school's subscription plan (e.g. Starter -> Professional -> Enterprise).
 */
export async function updateSubscriptionPlan(
  schoolId: string,
  planId: string,
  billingCycle: string = "ANNUAL"
) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) throw new Error("Invalid subscription plan.");

  const updated = await prisma.subscription.update({
    where: { schoolId },
    data: {
      planId: plan.id,
      billingCycle,
    },
    include: { plan: true },
  });

  return updated;
}
