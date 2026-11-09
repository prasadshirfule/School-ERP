import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const applicationId = searchParams.get("id");
  const email = searchParams.get("email");

  if (!applicationId && !email) {
    return NextResponse.json({ success: false, error: "Application ID or email is required." }, { status: 400 });
  }

  const whereClause = applicationId
    ? { id: applicationId }
    : { schoolEmail: email!.toLowerCase().trim() };

  const application = await prisma.schoolRegistrationApplication.findFirst({
    where: whereClause,
    select: {
      id: true,
      schoolName: true,
      schoolEmail: true,
      boardType: true,
      status: true,
      emailVerifiedAt: true,
      mobileVerifiedAt: true,
      requestedDocuments: true,
      rejectionReason: true,
      createdSchoolId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!application) {
    return NextResponse.json({ success: false, error: "Application not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, application });
}
