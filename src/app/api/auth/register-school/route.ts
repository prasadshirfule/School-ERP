import { NextRequest, NextResponse } from "next/server";
import { submitSchoolRegistration, RegistrationError } from "@/lib/services/registration";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await submitSchoolRegistration(body, clientIp, userAgent);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Registration request failed.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
