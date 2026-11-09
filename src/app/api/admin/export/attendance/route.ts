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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "csv";

    const where: Prisma.AttendanceWhereInput = { schoolId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { admissionNo: true, fullName: true } },
        section: { select: { name: true, class: { select: { name: true } } } },
      },
      orderBy: [{ date: "desc" }, { studentId: "asc" }],
      take: 5000,
    });

    if (format === "json") {
      return new NextResponse(JSON.stringify(records, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="attendance-export-${Date.now()}.json"`,
        },
      });
    }

    const headers = ["Date", "Admission No", "Student Name", "Class", "Section", "Status", "Marked By"];
    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = records.map((r) => [
      escapeCsv(r.date.toISOString().split("T")[0]),
      escapeCsv(r.student?.admissionNo || ""),
      escapeCsv(r.student?.fullName || ""),
      escapeCsv(r.section?.class?.name || ""),
      escapeCsv(r.section?.name || ""),
      escapeCsv(r.status),
      escapeCsv(r.markedBy),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-export-${Date.now()}.csv"`,
      },
    });
  } catch (error: unknown) {
    console.error("[EXPORT_ATTENDANCE] Error exporting attendance:", error);
    return NextResponse.json({ error: "Failed to export attendance" }, { status: 500 });
  }
}
