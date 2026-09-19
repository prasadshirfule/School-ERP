import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { calculateInvoiceStatus } from "@/lib/invoiceStatus";

export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("sectionId");

  const where: any = { isActive: true };
  if (sectionId === "unassigned") {
    where.sectionId = null;
  } else if (sectionId) {
    where.sectionId = sectionId;
  }

  const students = await ctx.db.student.findMany({
    where,
    include: {
      section: { include: { class: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json(students);
}

export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    fullName,
    rollNumber,
    dob,
    sectionId,
    academicYear,
    gender,
    bloodGroup,
    aadharNumber,
    category,
    currentAddress,
    permanentAddress,
    previousSchoolName,
    previousClass,
    transferCertificateNumber,
    fatherName,
    fatherOccupation,
    fatherPhone,
    motherName,
    motherOccupation,
    motherPhone,
    guardianName,
    guardianRelation,
    guardianPhone,
    emergencyContactName,
    emergencyContactPhone,
    medicalConditions,
    photoUrl,
    // Fee details
    totalFees,
    amountPaidNow,
    dueDate,
    paymentMethod,
  } = body;

  if (!fullName || typeof fullName !== "string" || fullName.trim() === "") {
    return badRequest("fullName is required");
  }
  if (!dob) {
    return badRequest("dob is required");
  }

  const schoolId = ctx.session.user.schoolId;
  const currentYear = new Date().getFullYear();
  const yearStr = academicYear?.trim() || `${currentYear}-${(currentYear + 1).toString().slice(2)}`;
  const normalizedFullName = fullName.trim().toUpperCase();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Auto-generate admission number: AY-{currentYear}-{4-digit sequential number}
      const prefix = `AY-${currentYear}-`;

      const existingStudents = await tx.student.findMany({
        where: {
          schoolId,
          admissionNo: { startsWith: prefix },
        },
        select: { admissionNo: true },
      });

      let maxSeq = 0;
      for (const s of existingStudents) {
        const parts = s.admissionNo.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }

      const nextSeq = maxSeq + 1;
      const admissionNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;

      // Create student record (sectionId is optional)
      const student = await tx.student.create({
        data: {
          schoolId,
          admissionNo,
          rollNumber: rollNumber?.trim() || null,
          fullName: normalizedFullName,
          dob: new Date(dob),
          sectionId: sectionId?.trim() || null,
          academicYear: yearStr,
          photoUrl: photoUrl?.trim() || null,
          gender: gender?.trim() || null,
          bloodGroup: bloodGroup?.trim() || null,
          // Sensitive PII: stored as plain text for MVP; future hardening: encryption at rest, restricted display
          aadharNumber: aadharNumber?.trim() || null,
          category: category?.trim() || null,
          currentAddress: currentAddress?.trim() || null,
          permanentAddress: permanentAddress?.trim() || null,
          previousSchoolName: previousSchoolName?.trim() || null,
          previousClass: previousClass?.trim() || null,
          transferCertificateNumber: transferCertificateNumber?.trim() || null,
          fatherName: fatherName?.trim() || null,
          fatherOccupation: fatherOccupation?.trim() || null,
          fatherPhone: fatherPhone?.trim() || null,
          motherName: motherName?.trim() || null,
          motherOccupation: motherOccupation?.trim() || null,
          motherPhone: motherPhone?.trim() || null,
          guardianName: guardianName?.trim() || null,
          guardianRelation: guardianRelation?.trim() || null,
          guardianPhone: guardianPhone?.trim() || null,
          emergencyContactName: emergencyContactName?.trim() || null,
          emergencyContactPhone: emergencyContactPhone?.trim() || null,
          medicalConditions: medicalConditions?.trim() || null,
        },
        include: {
          section: { include: { class: true } },
        },
      });

      // Handle admission FeeInvoice and initial Payment if totalFees provided
      if (totalFees && Number(totalFees) > 0) {
        const totalFeesNum = Number(totalFees);
        const paidNum = amountPaidNow ? Number(amountPaidNow) : 0;

        if (paidNum < 0) {
          throw new Error("Amount paid cannot be negative");
        }
        if (paidNum > totalFeesNum) {
          throw new Error("Amount paid cannot exceed total fees");
        }

        const dueDecimal = new Prisma.Decimal(totalFeesNum);
        const paidDecimal = new Prisma.Decimal(paidNum);

        // Find or create generic FeeStructure for Admission Fee in this academic year
        let feeStructure = await tx.feeStructure.findFirst({
          where: {
            schoolId,
            name: `Admission Fee - ${yearStr}`,
            academicYear: yearStr,
          },
        });

        if (!feeStructure) {
          feeStructure = await tx.feeStructure.create({
            data: {
              schoolId,
              name: `Admission Fee - ${yearStr}`,
              academicYear: yearStr,
              amount: dueDecimal,
              frequency: "ONE_TIME",
            },
          });
        }

        const initialStatus = calculateInvoiceStatus(dueDecimal, paidDecimal);

        const invoiceDueDate =
          paidNum < totalFeesNum && dueDate
            ? new Date(dueDate)
            : new Date();

        const invoice = await tx.feeInvoice.create({
          data: {
            schoolId,
            studentId: student.id,
            feeStructureId: feeStructure.id,
            amountDue: dueDecimal,
            discountAmount: new Prisma.Decimal(0),
            dueDate: invoiceDueDate,
            status: initialStatus,
          },
        });

        if (paidDecimal.greaterThan(0)) {
          // Generate sequential receipt number: REC-{currentYear}-{4-digit}
          const recPrefix = `REC-${currentYear}-`;
          const existingPayments = await tx.payment.findMany({
            where: {
              schoolId,
              receiptNumber: { startsWith: recPrefix },
            },
            select: { receiptNumber: true },
          });

          let maxRecSeq = 0;
          for (const p of existingPayments) {
            const parts = p.receiptNumber.split("-");
            const num = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(num) && num > maxRecSeq) {
              maxRecSeq = num;
            }
          }

          const receiptNumber = `${recPrefix}${String(maxRecSeq + 1).padStart(4, "0")}`;

          await tx.payment.create({
            data: {
              schoolId,
              invoiceId: invoice.id,
              amount: paidDecimal,
              method: paymentMethod || "CASH",
              receiptNumber,
              paidAt: new Date(),
            },
          });
        }
      }

      return student;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return badRequest("A student with this admission number already exists in this school");
    }
    return badRequest(e.message || "Failed to create student");
  }
}

export async function PATCH(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { studentId, sectionId } = body;

  if (!studentId) {
    return badRequest("studentId is required");
  }

  // Verify student belongs to this tenant
  const student = await ctx.db.student.findFirst({
    where: { id: studentId },
  });

  if (!student) {
    return badRequest("Student not found");
  }

  // If sectionId is provided, verify it belongs to this tenant
  if (sectionId) {
    const section = await ctx.db.section.findFirst({
      where: { id: sectionId },
    });
    if (!section) {
      return badRequest("Section not found");
    }
  }

  const updatedStudent = await ctx.db.student.update({
    where: { id: studentId },
    data: {
      sectionId: sectionId ? sectionId : null,
    },
    include: {
      section: { include: { class: true } },
    },
  });

  return NextResponse.json(updatedStudent);
}
