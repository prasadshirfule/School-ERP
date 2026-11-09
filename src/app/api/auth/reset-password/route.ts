import { NextRequest, NextResponse } from "next/server";
import { resetPassword, PasswordSecurityError } from "@/lib/services/password";

export async function POST(req: NextRequest) {
  try {
    const { userId, token, password } = await req.json();

    if (!userId || !token || !password) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await resetPassword(userId, token, password, clientIp, userAgent);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof PasswordSecurityError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Password reset failed.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
