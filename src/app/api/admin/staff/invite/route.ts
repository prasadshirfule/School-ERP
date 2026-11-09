import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden: Only School Admins can invite staff" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { fullName, email, phone, role, password, subjectIds, sectionIds } = body;

    if (!fullName || !email || !role) {
      return badRequest("Full name, email, and staff role are required");
    }

    const assignedRole = role.toUpperCase();
    if (assignedRole !== "TEACHER" && assignedRole !== "ACCOUNTANT") {
      return badRequest("Role must be either TEACHER or ACCOUNTANT");
    }

    const cleanEmail = email.trim().toLowerCase();
    const schoolId = ctx.session.user.schoolId;
    if (!schoolId) {
      return badRequest("School ID missing from session");
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return badRequest("A user with this email address already exists");
    }

    const initialPassword = password || crypto.randomBytes(6).toString("hex") + "!Aa1";
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const invitationToken = crypto.randomBytes(32).toString("hex");

    const newStaff = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: cleanEmail,
          phone: phone ? phone.trim() : null,
          passwordHash,
          role: assignedRole as Role,
          schoolId,
          isActive: true,
          status: "ACTIVE",
          emailVerified: new Date(),
        },
      });

      // 2. If Teacher, create Teacher profile and optionally link subjects/sections
      if (assignedRole === "TEACHER") {
        const teacherProfile = await tx.teacher.create({
          data: {
            userId: user.id,
            fullName: fullName.trim(),
          },
        });

        // Link subjects if provided
        if (Array.isArray(subjectIds) && subjectIds.length > 0) {
          for (const sId of subjectIds) {
            // Verify subject belongs to this school
            const validSubject = await tx.subject.findFirst({
              where: { id: sId, schoolId },
            });
            if (validSubject) {
              await tx.teacherSubject.create({
                data: {
                  teacherId: teacherProfile.id,
                  subjectId: sId,
                },
              });
            }
          }
        }

        // Link class teacher sections if provided
        if (Array.isArray(sectionIds) && sectionIds.length > 0) {
          for (const secId of sectionIds) {
            await tx.section.updateMany({
              where: { id: secId, schoolId },
              data: { classTeacherId: teacherProfile.id },
            });
          }
        }
      }

      // 3. Create staff invitation record
      await tx.emailVerificationToken.create({
        data: {
          email: cleanEmail,
          token: invitationToken,
          type: "STAFF_INVITATION",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          metadata: JSON.stringify({ role: assignedRole, schoolId }),
        },
      });

      return user;
    });

    await logAuditEvent({
      schoolId,
      userId: ctx.session.user.id,
      userEmail: ctx.session.user.email,
      action: "STAFF_INVITED",
      targetType: "User",
      targetId: newStaff.id,
      details: {
        email: cleanEmail,
        role: assignedRole,
        fullName: fullName.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${assignedRole === "TEACHER" ? "Teacher" : "Accountant"} account created and invited successfully`,
      staff: {
        id: newStaff.id,
        email: newStaff.email,
        role: newStaff.role,
        temporaryPassword: initialPassword,
      },
    });
  } catch (error: unknown) {
    console.error("[STAFF_INVITATION] Error creating staff:", error);
    return NextResponse.json(
      { error: "Failed to create and invite staff member" },
      { status: 500 }
    );
  }
}
