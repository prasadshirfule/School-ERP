import { NextResponse } from "next/server";
import { getTenantDb, unauthorized } from "@/lib/utils";
import { FeeStructure } from "@prisma/client";

export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const feeStructures = await ctx.db.feeStructure.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    (feeStructures as FeeStructure[]).map((f: FeeStructure) => ({
      ...f,
      amount: f.amount.toFixed(2),
    }))
  );
}
