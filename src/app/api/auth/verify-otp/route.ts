import { NextRequest, NextResponse } from "next/server";
import {
  verifyRegistrationEmailOtp,
  verifyRegistrationMobileOtp,
  activateAdminAccount,
} from "@/lib/services/registration";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { extractClientIp, hashIpForRateLimit } from "@/lib/security/clientIp";

export async function POST(req: NextRequest) {
  try {
    // 1. IP-based Rate Limiting (Applied BEFORE parsing body / reading DB)
    const clientIp = extractClientIp(req.headers);
    const hashedIp = hashIpForRateLimit(clientIp);
    const ipRateLimit = await checkRateLimit(`ratelimit:otp:ip:${hashedIp}`, {
      limit: 10,
      windowSeconds: 60,
      failClosed: true,
    });

    if (!ipRateLimit.allowed) {
      const status = ipRateLimit.isBackendFailure ? 503 : 429;
      return NextResponse.json(
        {
          success: false,
          error: ipRateLimit.isBackendFailure
            ? "Service temporarily unavailable. Please try again in a few moments."
            : "Too many verification attempts from this IP address. Please wait before retrying.",
        },
        { status }
      );
    }

    const { applicationId, type, otp } = await req.json();

    if (!applicationId || !otp) {
      return NextResponse.json(
        { success: false, error: "Application ID and verification code are required." },
        { status: 400 }
      );
    }

    // 2. Application-specific Rate Limiting (prevents brute-forcing a single application)
    const appRateLimit = await checkRateLimit(`ratelimit:otp:app:${applicationId}`, {
      limit: 5,
      windowSeconds: 60,
      failClosed: true,
    });

    if (!appRateLimit.allowed) {
      const status = appRateLimit.isBackendFailure ? 503 : 429;
      return NextResponse.json(
        {
          success: false,
          error: appRateLimit.isBackendFailure
            ? "Service temporarily unavailable. Please try again in a few moments."
            : "Too many attempts for this application. Please wait before retrying.",
        },
        { status }
      );
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
