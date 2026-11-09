import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, requireRole } from "@/lib/authorization";
import { Role } from "@/lib/authorization/roles";
import { requestChildLink, ParentSecurityError } from "@/lib/services/parent";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    requireRole(user, [Role.PARENT]);

    const { schoolId, admissionNo, relationship } = await req.json();
    if (!schoolId || !admissionNo) {
      return NextResponse.json({ success: false, error: "School ID and student admission number are required." }, { status: 400 });
    }

    const result = await requestChildLink(user.id, schoolId, admissionNo, relationship);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof ParentSecurityError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Child linking request failed.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
