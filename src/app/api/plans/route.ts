import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DEFAULT_PLANS, seedDefaultPlans } from "@/lib/subscription";

export async function GET() {
  try {
    let plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { pricePerStudentMonth: "asc" },
    });

    if (plans.length === 0) {
      await seedDefaultPlans();
      plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { pricePerStudentMonth: "asc" },
      });
    }

    return NextResponse.json({ success: true, plans });
  } catch (error: unknown) {
    console.error("[API_PLANS] Error fetching plans:", error);
    // Fallback to static default plans if db is offline/warming up
    return NextResponse.json({ success: true, plans: DEFAULT_PLANS });
  }
}
