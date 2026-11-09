import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized, forbidden } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.schoolId) {
      return unauthorized();
    }

    if (!["ADMIN", "PRINCIPAL", "SUPER_ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
      return forbidden();
    }

    const { schoolId } = session.user;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId },
      include: {
        student: { select: { admissionNo: true, fullName: true } },
        feeStructure: { select: { name: true, frequency: true } },
        payments: { select: { amount: true, method: true, receiptNumber: true, paidAt: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    if (format === "json") {
      return new NextResponse(JSON.stringify(invoices, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="fee-invoices-export-${Date.now()}.json"`,
        },
      });
    }

    const headers = [
      "Invoice ID",
      "Admission No",
      "Student Name",
      "Fee Head",
      "Amount (INR)",
      "Paid Amount (INR)",
      "Balance Due (INR)",
      "Due Date",
      "Status",
      "Receipts Count",
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = invoices.map((inv) => {
      const paid = inv.payments.reduce((sum: number, p) => sum + Number(p.amount), 0);
      const balance = Math.max(0, Number(inv.amountDue) - paid);
      return [
        escapeCsv(inv.id),
        escapeCsv(inv.student?.admissionNo || ""),
        escapeCsv(inv.student?.fullName || ""),
        escapeCsv(inv.feeStructure?.name || ""),
        escapeCsv(Number(inv.amountDue).toFixed(2)),
        escapeCsv(paid.toFixed(2)),
        escapeCsv(balance.toFixed(2)),
        escapeCsv(inv.dueDate.toISOString().split("T")[0]),
        escapeCsv(inv.status),
        escapeCsv(inv.payments.length),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fee-invoices-export-${Date.now()}.csv"`,
      },
    });
  } catch (error: unknown) {
    console.error("[EXPORT_FEES] Error exporting fees:", error);
    return NextResponse.json({ error: "Failed to export fees" }, { status: 500 });
  }
}
