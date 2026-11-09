import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { unauthorized } from "@/lib/utils";
import prisma from "@/lib/prisma";

/**
 * GET: Returns all students linked to the current parent user.
 * Supports multi-school parents:
 * - Gathers children across all schools where the parent has a verified Parent profile.
 * - Displays each child's school name and affiliation.
 * - Only includes active, verified relationships.
 * - Filters out any suspended or inactive schools.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "PARENT") {
    return unauthorized();
  }

  try {
    // Query all parent profiles linked to this authenticated user across all schools
    const parentProfiles = await prisma.parent.findMany({
      where: { userId: session.user.id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            isActive: true,
            status: true,
          },
        },
        students: {
          include: {
            student: {
              include: {
                section: {
                  include: { class: true },
                },
              },
            },
          },
        },
      },
    });

    if (!parentProfiles || parentProfiles.length === 0) {
      return NextResponse.json([]);
    }

    // Filter out inactive or suspended schools
    const activeProfiles = parentProfiles.filter(
      (p) => p.school && p.school.isActive && p.school.status !== "SUSPENDED"
    );

    type ParentStudentItem = {
      id: string;
      fullName: string;
      admissionNo: string;
      academicYear: string;
      photoUrl: string | null;
      relationship: string;
      isPrimary: boolean;
      schoolId: string;
      schoolName: string;
      section: {
        id: string;
        name: string;
        class: {
          id: string;
          name: string;
        };
      } | null;
    };

    const studentsList: ParentStudentItem[] = [];
    for (const profile of activeProfiles) {
      for (const sp of profile.students) {
        if (sp.student && sp.student.isActive) {
          studentsList.push({
            id: sp.student.id,
            fullName: sp.student.fullName,
            admissionNo: sp.student.admissionNo,
            academicYear: sp.student.academicYear,
            photoUrl: sp.student.photoUrl,
            relationship: sp.relationship,
            isPrimary: sp.isPrimary,
            schoolId: profile.school.id,
            schoolName: profile.school.name,
            section: sp.student.section
              ? {
                  id: sp.student.section.id,
                  name: sp.student.section.name,
                  class: {
                    id: sp.student.section.class.id,
                    name: sp.student.section.class.name,
                  },
                }
              : null,
          });
        }
      }
    }

    return NextResponse.json(studentsList);
  } catch (error: unknown) {
    console.error("[PARENT_STUDENTS] Error fetching linked students:", error);
    return NextResponse.json({ error: "Failed to load linked students" }, { status: 500 });
  }
}
