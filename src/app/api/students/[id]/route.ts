import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";

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

  return NextResponse.json(student);
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

  const body = await request.json();
  const {
    fullName,
    rollNumber,
    dob,
    gender,
    bloodGroup,
    aadharNumber,
    category,
    photoUrl,
    currentAddress,
    permanentAddress,
    fatherName,
    fatherOccupation,
    fatherPhone,
    motherName,
    motherOccupation,
    motherPhone,
    guardianName,
    guardianRelation,
    guardianPhone,
    previousSchoolName,
    previousClass,
    transferCertificateNumber,
    emergencyContactName,
    emergencyContactPhone,
    medicalConditions,
    classDesignation,
  } = body;

  const updateData: any = {};

  if (typeof fullName === "string" && fullName.trim()) {
    updateData.fullName = fullName.trim();
  }
  if (dob) {
    const dobDate = new Date(dob);
    if (!isNaN(dobDate.getTime())) {
      updateData.dob = dobDate;
    }
  }
  if (rollNumber !== undefined) updateData.rollNumber = rollNumber ? String(rollNumber).trim() : null;
  if (gender !== undefined) updateData.gender = gender ? String(gender).trim() : null;
  if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup ? String(bloodGroup).trim() : null;
  if (aadharNumber !== undefined) updateData.aadharNumber = aadharNumber ? String(aadharNumber).trim() : null;
  if (category !== undefined) updateData.category = category ? String(category).trim() : null;
  if (photoUrl !== undefined) updateData.photoUrl = photoUrl ? String(photoUrl).trim() : null;
  if (currentAddress !== undefined) updateData.currentAddress = currentAddress ? String(currentAddress).trim() : null;
  if (permanentAddress !== undefined) updateData.permanentAddress = permanentAddress ? String(permanentAddress).trim() : null;
  if (fatherName !== undefined) updateData.fatherName = fatherName ? String(fatherName).trim() : null;
  if (fatherOccupation !== undefined) updateData.fatherOccupation = fatherOccupation ? String(fatherOccupation).trim() : null;
  if (fatherPhone !== undefined) updateData.fatherPhone = fatherPhone ? String(fatherPhone).trim() : null;
  if (motherName !== undefined) updateData.motherName = motherName ? String(motherName).trim() : null;
  if (motherOccupation !== undefined) updateData.motherOccupation = motherOccupation ? String(motherOccupation).trim() : null;
  if (motherPhone !== undefined) updateData.motherPhone = motherPhone ? String(motherPhone).trim() : null;
  if (guardianName !== undefined) updateData.guardianName = guardianName ? String(guardianName).trim() : null;
  if (guardianRelation !== undefined) updateData.guardianRelation = guardianRelation ? String(guardianRelation).trim() : null;
  if (guardianPhone !== undefined) updateData.guardianPhone = guardianPhone ? String(guardianPhone).trim() : null;
  if (previousSchoolName !== undefined) updateData.previousSchoolName = previousSchoolName ? String(previousSchoolName).trim() : null;
  if (previousClass !== undefined) updateData.previousClass = previousClass ? String(previousClass).trim() : null;
  if (transferCertificateNumber !== undefined) updateData.transferCertificateNumber = transferCertificateNumber ? String(transferCertificateNumber).trim() : null;
  if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName ? String(emergencyContactName).trim() : null;
  if (emergencyContactPhone !== undefined) updateData.emergencyContactPhone = emergencyContactPhone ? String(emergencyContactPhone).trim() : null;
  if (medicalConditions !== undefined) updateData.medicalConditions = medicalConditions ? String(medicalConditions).trim() : null;
  if (classDesignation !== undefined) updateData.classDesignation = classDesignation ? String(classDesignation).trim() : null;

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

  return NextResponse.json(updated);
}

