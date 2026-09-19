import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized } from "@/lib/utils";
import prisma from "@/lib/prisma";

/** GET: returns students linked to the current parent user */
export async function GET() {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  // Find the parent profile for this user
  const parent = await prisma.parent.findUnique({
    where: { userId: session.user.id },
    include: {
      students: {
        include: {
          student: {
            include: {
              section: { include: { class: true } },
            },
          },
        },
      },
    },
  });

  if (!parent) {
    return NextResponse.json([]);
  }

  // Verify parent belongs to the same school
  if (parent.schoolId !== session.user.schoolId) {
    return NextResponse.json([]);
  }

  const students = parent.students.map((sp) => ({
    ...sp.student,
    relationship: sp.relationship,
    isPrimary: sp.isPrimary,
  }));

  return NextResponse.json(students);
}
