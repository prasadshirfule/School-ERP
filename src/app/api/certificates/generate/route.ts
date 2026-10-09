import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import prisma from "@/lib/prisma";

/**
 * POST /api/certificates/generate
 * Generate certificate data for rendering. For TC, also persists a CertificateLog record.
 * Body: { studentId, type: "BONAFIDE"|"TC"|"CHARACTER", fields: { ... } }
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  const type = typeof body.type === "string" ? body.type.trim().toUpperCase() : "";
  const fields = body.fields || {};

  if (!studentId) return badRequest("studentId is required");
  if (!["BONAFIDE", "TC", "CHARACTER"].includes(type)) {
    return badRequest("Invalid certificate type. Use BONAFIDE, TC, or CHARACTER");
  }

  // Fetch student with school info
  const student = await ctx.db.student.findUnique({
    where: { id: studentId },
    include: {
      section: {
        select: {
          name: true,
          class: { select: { name: true } },
          academicYear: true,
        },
      },
      school: true,
    },
  });

  if (!student) return badRequest("Student not found");

  const school = student.school;
  if (!school) return badRequest("School not found");

  const certificateData: any = {
    type,
    student: {
      fullName: student.fullName,
      admissionNo: student.admissionNo,
      dob: student.dob,
      gender: student.gender,
      fatherName: student.fatherName,
      motherName: student.motherName,
      academicYear: student.academicYear,
      section: student.section
        ? { name: student.section.name, className: student.section.class.name }
        : null,
    },
    school: {
      name: school.name,
      address: school.address,
      phone: school.phone,
      email: school.email,
      logoUrl: school.logoUrl,
      principalName: school.principalName,
      affiliationNumber: school.affiliationNumber,
      trustName: school.trustName,
    },
  };

  if (type === "BONAFIDE") {
    certificateData.fields = {
      purpose: typeof fields.purpose === "string" ? fields.purpose.trim() : "",
      issueDate: fields.issueDate || new Date().toISOString().slice(0, 10),
    };
  } else if (type === "TC") {
    const reasonForLeaving = typeof fields.reasonForLeaving === "string" ? fields.reasonForLeaving.trim() : "";
    const lastAttendanceDate = fields.lastAttendanceDate || new Date().toISOString().slice(0, 10);
    const conductRemark = typeof fields.conductRemark === "string" ? fields.conductRemark.trim() : "Good";
    const tcNumber = typeof fields.tcNumber === "string" ? fields.tcNumber.trim() : "";
    const issueDate = fields.issueDate || new Date().toISOString().slice(0, 10);

    if (!reasonForLeaving) return badRequest("Reason for leaving is required for TC");
    if (!tcNumber) return badRequest("TC Number is required");

    // Persist CertificateLog for TC
    try {
      await ctx.db.certificateLog.create({
        data: {
          studentId,
          tcNumber,
          issueDate: new Date(issueDate),
          reasonForLeaving,
          lastAttendanceDate: new Date(lastAttendanceDate),
          conductRemark,
          generatedByUserId: ctx.session.user.id,
        } as any,
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        return badRequest(`TC Number "${tcNumber}" already exists. Each TC must have a unique number.`);
      }
      throw err;
    }

    certificateData.fields = {
      reasonForLeaving,
      lastAttendanceDate,
      conductRemark,
      tcNumber,
      issueDate,
    };
  } else if (type === "CHARACTER") {
    certificateData.fields = {
      conductRemark: typeof fields.conductRemark === "string" ? fields.conductRemark.trim() : "Good",
      issueDate: fields.issueDate || new Date().toISOString().slice(0, 10),
    };
  }

  return NextResponse.json(certificateData);
}

/**
 * GET /api/certificates/generate
 * Returns all TC records (CertificateLog) for the TC Register view.
 */
export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const logs = await ctx.db.certificateLog.findMany({
    include: {
      student: {
        select: {
          fullName: true,
          admissionNo: true,
          section: {
            select: {
              name: true,
              class: { select: { name: true } },
            },
          },
        },
      },
      generatedByUser: {
        select: { email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(logs);
}
