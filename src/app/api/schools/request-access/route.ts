import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rateLimit";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown-ip";
    const rateCheck = checkRateLimit(`reg-req:${ip}`, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      schoolName,
      boardType,
      officialEmail,
      phone,
      principalName,
      affiliationNo,
      address,
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
      documentUrl,
      documentName,
    } = body;

    if (!schoolName || !boardType || !officialEmail || !principalName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Missing required registration fields" },
        { status: 400 }
      );
    }

    const cleanOfficialEmail = officialEmail.trim().toLowerCase();
    const cleanAdminEmail = adminEmail.trim().toLowerCase();

    // Check existing school
    const existingSchool = await prisma.school.findFirst({
      where: {
        OR: [
          { email: cleanOfficialEmail },
          { name: { equals: schoolName.trim(), mode: "insensitive" } },
        ],
      },
    });

    if (existingSchool) {
      return NextResponse.json(
        { error: "A school with this email or name is already registered" },
        { status: 409 }
      );
    }

    // Check existing pending request
    const existingRequest = await prisma.schoolRegistrationRequest.findFirst({
      where: {
        OR: [
          { officialEmail: cleanOfficialEmail },
          { adminEmail: cleanAdminEmail },
        ],
        status: "PENDING",
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "A registration request for this school or administrator is already pending approval" },
        { status: 409 }
      );
    }

    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    const regRequest = await prisma.schoolRegistrationRequest.create({
      data: {
        schoolName: schoolName.trim(),
        boardType: boardType.trim().toUpperCase(),
        officialEmail: cleanOfficialEmail,
        phone: phone ? phone.trim() : "",
        principalName: principalName.trim(),
        affiliationNo: affiliationNo ? affiliationNo.trim() : null,
        address: address ? address.trim() : null,
        adminName: adminName.trim(),
        adminEmail: cleanAdminEmail,
        adminPhone: adminPhone ? adminPhone.trim() : null,
        adminPasswordHash,
        documentUrl: documentUrl ? String(documentUrl).trim() : null,
        documentName: documentName ? String(documentName).trim() : null,
        status: "PENDING",
      },
    });

    // Create verification token (expires in 24 hours)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        email: cleanAdminEmail,
        token: verificationToken,
        type: "SCHOOL_REGISTRATION",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await logAuditEvent({
      userId: null,
      userEmail: cleanAdminEmail,
      action: "SCHOOL_REGISTRATION_SUBMITTED",
      targetType: "SchoolRegistrationRequest",
      targetId: regRequest.id,
      details: {
        schoolName: regRequest.schoolName,
        adminEmail: cleanAdminEmail,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Registration request submitted successfully. Please verify your email to complete the request.",
      requestId: regRequest.id,
      verificationToken,
    });
  } catch (error: unknown) {
    console.error("[SCHOOL_REGISTRATION] Error submitting request:", error);
    return NextResponse.json(
      { error: "Failed to process school registration request" },
      { status: 500 }
    );
  }
}
