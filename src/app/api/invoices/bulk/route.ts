import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { BulkInvoiceCreateSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (
    ctx.session.user.role !== "ACCOUNTANT" &&
    ctx.session.user.role !== "ADMIN" &&
    ctx.session.user.role !== "PRINCIPAL"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = BulkInvoiceCreateSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid bulk invoice data");
  }

  const { feeStructureId, sectionId, classId, dueDate, discountAmount } = parsed.data;

  // Validate feeStructure exists
  const feeStructure = await ctx.db.feeStructure.findUnique({
    where: { id: feeStructureId },
  });
  if (!feeStructure) {
    return badRequest("Fee structure not found");
  }

  // Find target students
  const studentWhere: any = { isActive: true };
  if (sectionId) {
    studentWhere.sectionId = sectionId;
  } else if (classId) {
    studentWhere.section = { classId };
  } else {
    return badRequest("Either sectionId or classId must be provided");
  }

  const students = await ctx.db.student.findMany({
    where: studentWhere,
    select: { id: true, fullName: true },
  });

  if (students.length === 0) {
    return badRequest("No active students found in the selected class/section");
  }

  const discount = new Prisma.Decimal(discountAmount || 0);
  const amountDue = feeStructure.amount.sub(discount);

  if (amountDue.lessThan(0)) {
    return badRequest("Discount cannot exceed fee structure amount");
  }

  const due = new Date(dueDate);

  // Check if invoice for this feeStructure already exists for each student to avoid accidental duplication
  const existingInvoices = await ctx.db.feeInvoice.findMany({
    where: {
      feeStructureId,
      studentId: { in: students.map((s) => s.id) },
    },
    select: { studentId: true },
  });
  const existingStudentIdSet = new Set(existingInvoices.map((inv) => inv.studentId));

  const eligibleStudents = students.filter((s) => !existingStudentIdSet.has(s.id));
  if (eligibleStudents.length === 0) {
    return badRequest("All students in this section already have an invoice for this fee structure");
  }

  const invoicesData = eligibleStudents.map((s) => ({
    studentId: s.id,
    feeStructureId,
    amountDue,
    discountAmount: discount,
    dueDate: due,
    status: "UNPAID" as const,
  }));

  const db = ctx.db;
  const result = await (db as any).$transaction(async (tx: any) => {
    return tx.feeInvoice.createMany({
      data: invoicesData,
    });
  });

  return NextResponse.json(
    {
      message: `Successfully created ${result.count} invoice(s)`,
      createdCount: result.count,
      skippedCount: existingInvoices.length,
    },
    { status: 201 }
  );
}
