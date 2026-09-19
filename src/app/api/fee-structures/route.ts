import { NextResponse } from "next/server";
import { getTenantDb, unauthorized } from "@/lib/utils";

export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const feeStructures = await ctx.db.feeStructure.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    feeStructures.map((f) => ({
      ...f,
      amount: f.amount.toFixed(2),
    }))
  );
}
