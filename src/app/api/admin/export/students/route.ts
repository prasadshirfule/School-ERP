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
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status"); // "active", "archived", "all"

    const where: Prisma.StudentWhereInput = { schoolId };
    if (status === "active") where.isActive = true;
    if (status === "archived") where.isActive = false;

    const students = await prisma.student.findMany({
      where,
      include: {
        section: {
          select: {
            name: true,
            class: { select: { name: true } },
          },
        },
      },
      orderBy: [{ admissionNo: "asc" }],
    });

    if (format === "json") {
      return new NextResponse(JSON.stringify(students, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="students-export-${Date.now()}.json"`,
        },
      });
    }

    // Generate CSV
    const headers = [
      "Admission No",
      "Full Name",
      "Roll Number",
      "Class",
      "Section",
      "Academic Year",
      "Gender",
      "DOB",
      "Blood Group",
      "Father Name",
      "Mother Name",
      "Emergency Contact Phone",
      "Parent Email",
      "Status",
      "Archived At",
      "Archived Reason",
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = students.map((s) => [
      escapeCsv(s.admissionNo),
      escapeCsv(s.fullName),
      escapeCsv(s.rollNumber),
      escapeCsv(s.section?.class?.name || ""),
      escapeCsv(s.section?.name || ""),
      escapeCsv(s.academicYear),
      escapeCsv(s.gender),
      escapeCsv(s.dob ? s.dob.toISOString().split("T")[0] : ""),
      escapeCsv(s.bloodGroup),
      escapeCsv(s.fatherName),
      escapeCsv(s.motherName),
      escapeCsv(s.emergencyContactPhone),
      escapeCsv(s.parentEmail),
      escapeCsv(s.isActive ? "ACTIVE" : "ARCHIVED"),
      escapeCsv(s.archivedAt ? s.archivedAt.toISOString() : ""),
      escapeCsv(s.archivedReason || ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="students-export-${Date.now()}.csv"`,
      },
    });
  } catch (error: unknown) {
    console.error("[EXPORT_STUDENTS] Error generating export:", error);
    return NextResponse.json({ error: "Failed to export students" }, { status: 500 });
  }
}
