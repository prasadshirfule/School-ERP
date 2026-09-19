import { NextResponse } from "next/server";
import { getTenantDb, unauthorized, badRequest } from "@/lib/utils";
import prisma from "@/lib/prisma";

export async function GET() {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const schoolId = ctx.session.user.schoolId;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      boardType: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      logoUrl: true,
      principalName: true,
      affiliationNumber: true,
      establishedYear: true,
      trustName: true,
      term1StartDate: true,
      term1EndDate: true,
      term2StartDate: true,
      term2EndDate: true,
      createdAt: true,
    },
  });

  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  return NextResponse.json(school);
}

export async function PATCH(request: Request) {
  const ctx = await getTenantDb();
  if (!ctx) return unauthorized();

  const role = ctx.session.user.role;
  if (role !== "ADMIN" && role !== "PRINCIPAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = ctx.session.user.schoolId;
  const body = await request.json();
  const {
    name,
    boardType,
    address,
    phone,
    email,
    website,
    logoUrl,
    principalName,
    affiliationNumber,
    establishedYear,
    trustName,
    term1StartDate,
    term1EndDate,
    term2StartDate,
    term2EndDate,
  } = body;

  if (name !== undefined && (!name || typeof name !== "string" || name.trim() === "")) {
    return badRequest("School name cannot be empty");
  }

  const updateData: Record<string, any> = {};

  if (name !== undefined) updateData.name = name.trim();
  if (boardType !== undefined) updateData.boardType = boardType.trim() || "CBSE";
  if (address !== undefined) updateData.address = address ? address.trim() : null;
  if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
  if (email !== undefined) updateData.email = email ? email.trim() : null;
  if (website !== undefined) updateData.website = website ? website.trim() : null;
  if (logoUrl !== undefined) updateData.logoUrl = logoUrl ? logoUrl.trim() : null;
  if (principalName !== undefined) updateData.principalName = principalName ? principalName.trim() : null;
  if (affiliationNumber !== undefined)
    updateData.affiliationNumber = affiliationNumber ? affiliationNumber.trim() : null;
  if (trustName !== undefined) updateData.trustName = trustName ? trustName.trim() : null;
  if (term1StartDate !== undefined)
    updateData.term1StartDate = term1StartDate ? new Date(term1StartDate) : null;
  if (term1EndDate !== undefined)
    updateData.term1EndDate = term1EndDate ? new Date(term1EndDate) : null;
  if (term2StartDate !== undefined)
    updateData.term2StartDate = term2StartDate ? new Date(term2StartDate) : null;
  if (term2EndDate !== undefined)
    updateData.term2EndDate = term2EndDate ? new Date(term2EndDate) : null;

  if (establishedYear !== undefined) {
    if (establishedYear === null || establishedYear === "") {
      updateData.establishedYear = null;
    } else {
      const yr = parseInt(String(establishedYear), 10);
      if (isNaN(yr) || yr < 1800 || yr > new Date().getFullYear() + 1) {
        return badRequest("Invalid established year");
      }
      updateData.establishedYear = yr;
    }
  }

  try {
    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: updateData,
      select: {
        id: true,
        name: true,
        boardType: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        logoUrl: true,
        principalName: true,
        affiliationNumber: true,
        establishedYear: true,
        trustName: true,
        term1StartDate: true,
        term1EndDate: true,
        term2StartDate: true,
        term2EndDate: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return badRequest(error.message || "Failed to update school settings");
  }
}
