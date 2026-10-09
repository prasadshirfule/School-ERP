import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * GET /api/teachers
 * - Query param `all=true` (or when called by Admin/Principal without specific filters):
 *   Returns all teachers with user details (email, phone, isActive) and assigned sections.
 * - Otherwise: Returns active teachers for dropdowns (id, fullName, userId).
 */
export async function GET(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get("all") === "true";

  if (includeAll || ctx.session.user.role === "ADMIN" || ctx.session.user.role === "PRINCIPAL") {
    const teacherUsers = await ctx.db.user.findMany({
      where: { role: "TEACHER" },
      include: {
        teacherProfile: {
          include: {
            sections: {
              include: { class: true },
              orderBy: { name: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const teachers = teacherUsers
      .filter((u: any) => u.teacherProfile)
      .map((u: any) => ({
        id: u.teacherProfile.id,
        userId: u.id,
        fullName: u.teacherProfile.fullName,
        email: u.email,
        phone: u.phone,
        isActive: u.isActive,
        createdAt: u.createdAt,
        sections: u.teacherProfile.sections.map((sec: any) => ({
          id: sec.id,
          name: sec.name,
          className: sec.class.name,
          academicYear: sec.academicYear,
        })),
      }));

    return NextResponse.json(teachers);
  }

  // Standard lightweight active teacher list for select dropdowns
  const teacherUsers = await ctx.db.user.findMany({
    where: { role: "TEACHER", isActive: true },
    include: { teacherProfile: true },
    orderBy: { createdAt: "asc" },
  });

  const teachers = teacherUsers
    .filter((u: any) => u.teacherProfile)
    .map((u: any) => ({
      id: u.teacherProfile.id,
      fullName: u.teacherProfile.fullName,
      userId: u.id,
    }));

  return NextResponse.json(teachers);
}

/**
 * POST /api/teachers
 * Creates a User (role: TEACHER) and linked Teacher profile in a single transaction.
 */
export async function POST(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { fullName, email, phone, password } = body;

  if (!fullName || typeof fullName !== "string" || fullName.trim() === "") {
    return badRequest("fullName is required");
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return badRequest("A valid email address is required");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return badRequest("Password must be at least 6 characters long");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const schoolId = ctx.session.user.schoolId;

  // Check if user with this email already exists
  const existingUser = await ctx.db.user.findFirst({
    where: { email: normalizedEmail },
  });
  if (existingUser) {
    return badRequest("A user with this email address already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const db = ctx.db;
    const result = await (db as any).$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          phone: phone?.trim() || null,
          passwordHash,
          role: "TEACHER",
          isActive: true,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          fullName: fullName.trim(),
        },
        include: {
          sections: {
            include: { class: true },
          },
        },
      });

      return {
        id: teacher.id,
        userId: user.id,
        fullName: teacher.fullName,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        sections: [],
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return badRequest("A user with this email already exists");
    }
    return badRequest(e.message || "Failed to create teacher account");
  }
}

/**
 * PATCH /api/teachers
 * Updates teacher profile, phone, or toggles active/inactive login status.
 */
export async function PATCH(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { teacherId, isActive, fullName, phone } = body;

  if (!teacherId) {
    return badRequest("teacherId is required");
  }

  // Find teacher record
  const teacher = await ctx.db.teacher.findUnique({
    where: { id: teacherId },
    include: { user: true },
  });

  if (!teacher || teacher.user.schoolId !== ctx.session.user.schoolId) {
    return badRequest("Teacher not found");
  }

  try {
    const db = ctx.db;
    const result = await (db as any).$transaction(async (tx: any) => {
      if (fullName) {
        await tx.teacher.update({
          where: { id: teacherId },
          data: { fullName: fullName.trim() },
        });
      }

      const userUpdateData: any = {};
      if (typeof isActive === "boolean") {
        userUpdateData.isActive = isActive;
      }
      if (phone !== undefined) {
        userUpdateData.phone = phone ? phone.trim() : null;
      }

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: userUpdateData,
        });
      }

      const updated = await tx.teacher.findUnique({
        where: { id: teacherId },
        include: {
          user: true,
          sections: { include: { class: true } },
        },
      });

      return {
        id: updated!.id,
        userId: updated!.userId,
        fullName: updated!.fullName,
        email: updated!.user.email,
        phone: updated!.user.phone,
        isActive: updated!.user.isActive,
        sections: updated!.sections.map((sec: any) => ({
          id: sec.id,
          name: sec.name,
          className: sec.class.name,
          academicYear: sec.academicYear,
        })),
      };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return badRequest(e.message || "Failed to update teacher");
  }
}
