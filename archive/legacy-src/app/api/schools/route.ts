import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/** Public endpoint: returns active schools */
export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(schools);
  } catch (error) {
    console.error("Error fetching schools:", error);
    return NextResponse.json(
      { error: "Failed to fetch schools" },
      { status: 500 }
    );
  }
}
