import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset, PasswordSecurityError } from "@/lib/services/password";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await requestPasswordReset(email, clientIp, userAgent);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof PasswordSecurityError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Unable to process request." }, { status: 400 });
  }
}
