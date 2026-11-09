import { NextRequest, NextResponse } from "next/server";
import {
  verifyRegistrationEmailOtp,
  verifyRegistrationMobileOtp,
  activateAdminAccount,
} from "@/lib/services/registration";

export async function POST(req: NextRequest) {
  try {
    const { applicationId, type, otp } = await req.json();

    if (!applicationId || !otp) {
      return NextResponse.json({ success: false, error: "Application ID and verification code are required." }, { status: 400 });
    }

    if (type === "EMAIL") {
      const result = await verifyRegistrationEmailOtp(applicationId, otp);
      return NextResponse.json(result);
    } else if (type === "MOBILE") {
      const result = await verifyRegistrationMobileOtp(applicationId, otp);
      return NextResponse.json(result);
    } else if (type === "ACTIVATION") {
      const result = await activateAdminAccount(applicationId, otp);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: "Invalid verification type specified." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Verification failed.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
