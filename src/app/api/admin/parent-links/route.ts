import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { unauthorized, forbidden } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.schoolId) {
      return unauthorized();
    }

    if (!["ADMIN", "PRINCIPAL", "SUPER_ADMIN"].includes(session.user.role)) {
      return forbidden();
    }

    const { schoolId } = session.user;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Prisma.ParentStudentLinkRequestWhereInput = { schoolId };
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      where.status = status as "PENDING" | "APPROVED" | "REJECTED";
    }

    const requests = await prisma.parentStudentLinkRequest.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            user: { select: { id: true, email: true } },
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
            admissionNo: true,
            rollNumber: true,
            dob: true,
            section: {
              select: {
                name: true,
                class: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error: unknown) {
    console.error("[ADMIN_PARENT_LINKS] Error fetching requests:", error);
    return NextResponse.json(
      { error: "Failed to load parent link requests" },
      { status: 500 }
    );
  }
}
