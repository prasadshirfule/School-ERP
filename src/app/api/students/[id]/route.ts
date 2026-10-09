import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import { encryptPII, decryptPII, maskAadhaar } from "@/lib/security";
import { StudentUpdateSchema } from "@/lib/validations";

/**
 * GET /api/students/[id]
 * Returns full student profile including admission details, section & class,
 * parent linkages, fee invoices with payments, and last 30 attendance records.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("Student ID is required");

  const student = await ctx.db.student.findFirst({
    where: { id },
    include: {
      section: {
        include: { class: true },
      },
      parents: {
        include: {
          parent: {
            include: { user: true },
          },
        },
      },
      invoices: {
        include: {
          feeStructure: true,
          payments: {
            orderBy: { paidAt: "desc" },
          },
        },
        orderBy: { dueDate: "desc" },
      },
      attendance: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Handle sensitive PII
  const role = ctx.session.user.role;
  const decryptedAadhaar = decryptPII(student.aadharNumber);
  const decryptedMedical = decryptPII(student.medicalConditions);

  const formattedStudent = {
    ...student,
    aadharNumber:
      role === "ADMIN" || role === "PRINCIPAL"
        ? decryptedAadhaar
        : maskAadhaar(decryptedAadhaar),
    medicalConditions: decryptedMedical,
  };

  return NextResponse.json(formattedStudent);
}

/**
 * PATCH /api/students/[id]
 * Updates editable enrollment and demographic details for a student.
 * admissionNo and schoolId are immutable.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return badRequest("Student ID is required");

  // Verify student belongs to this tenant
  const existingStudent = await ctx.db.student.findFirst({
    where: { id },
  });

  if (!existingStudent) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = StudentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid student data");
  }

  const data = parsed.data;
  const updateData: any = {};

  if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
  if (data.dob) {
    const dobDate = new Date(data.dob);
    if (!isNaN(dobDate.getTime())) {
      updateData.dob = dobDate;
    }
  }
  if (data.rollNumber !== undefined) updateData.rollNumber = data.rollNumber ? String(data.rollNumber).trim() : null;
  if (data.sectionId !== undefined) updateData.sectionId = data.sectionId || null;
  if (data.academicYear !== undefined) updateData.academicYear = data.academicYear;
  if (data.gender !== undefined) updateData.gender = data.gender ? String(data.gender).trim() : null;
  if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup ? String(data.bloodGroup).trim() : null;
  if (data.aadharNumber !== undefined) {
    updateData.aadharNumber = data.aadharNumber ? encryptPII(String(data.aadharNumber).trim()) : null;
  }
  if (data.category !== undefined) updateData.category = data.category ? String(data.category).trim() : null;
  if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl ? String(data.photoUrl).trim() : null;
  if (data.currentAddress !== undefined) updateData.currentAddress = data.currentAddress ? String(data.currentAddress).trim() : null;
  if (data.permanentAddress !== undefined) updateData.permanentAddress = data.permanentAddress ? String(data.permanentAddress).trim() : null;
  if (data.fatherName !== undefined) updateData.fatherName = data.fatherName ? String(data.fatherName).trim() : null;
  if (data.fatherOccupation !== undefined) updateData.fatherOccupation = data.fatherOccupation ? String(data.fatherOccupation).trim() : null;
  if (data.fatherPhone !== undefined) updateData.fatherPhone = data.fatherPhone ? String(data.fatherPhone).trim() : null;
  if (data.motherName !== undefined) updateData.motherName = data.motherName ? String(data.motherName).trim() : null;
  if (data.motherOccupation !== undefined) updateData.motherOccupation = data.motherOccupation ? String(data.motherOccupation).trim() : null;
  if (data.motherPhone !== undefined) updateData.motherPhone = data.motherPhone ? String(data.motherPhone).trim() : null;
  if (data.guardianName !== undefined) updateData.guardianName = data.guardianName ? String(data.guardianName).trim() : null;
  if (data.guardianRelation !== undefined) updateData.guardianRelation = data.guardianRelation ? String(data.guardianRelation).trim() : null;
  if (data.guardianPhone !== undefined) updateData.guardianPhone = data.guardianPhone ? String(data.guardianPhone).trim() : null;
  if (data.previousSchoolName !== undefined) updateData.previousSchoolName = data.previousSchoolName ? String(data.previousSchoolName).trim() : null;
  if (data.previousClass !== undefined) updateData.previousClass = data.previousClass ? String(data.previousClass).trim() : null;
  if (data.transferCertificateNumber !== undefined) updateData.transferCertificateNumber = data.transferCertificateNumber ? String(data.transferCertificateNumber).trim() : null;
  if (data.emergencyContactName !== undefined) updateData.emergencyContactName = data.emergencyContactName ? String(data.emergencyContactName).trim() : null;
  if (data.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = data.emergencyContactPhone ? String(data.emergencyContactPhone).trim() : null;
  if (data.medicalConditions !== undefined) {
    updateData.medicalConditions = data.medicalConditions ? encryptPII(String(data.medicalConditions).trim()) : null;
  }
  if (data.classDesignation !== undefined) updateData.classDesignation = data.classDesignation ? String(data.classDesignation).trim() : null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await ctx.db.student.update({
    where: { id },
    data: updateData,
    include: {
      section: {
        include: { class: true },
      },
      parents: {
        include: {
          parent: {
            include: { user: true },
          },
        },
      },
      invoices: {
        include: {
          feeStructure: true,
          payments: {
            orderBy: { paidAt: "desc" },
          },
        },
        orderBy: { dueDate: "desc" },
      },
      attendance: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
  });

  const decryptedAadhaar = decryptPII(updated.aadharNumber);
  const decryptedMedical = decryptPII(updated.medicalConditions);

  return NextResponse.json({
    ...updated,
    aadharNumber: decryptedAadhaar,
    medicalConditions: decryptedMedical,
  });
}
