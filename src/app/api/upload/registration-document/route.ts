import { NextResponse } from "next/server";
import { storage, validateFileMagicBytes } from "@/lib/storage";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown-ip";
    const rateCheck = checkRateLimit(`upload-reg-doc:${ip}`, 10, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many upload attempts. Please try again later." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = (formData.get("document") ||
      formData.get("file") ||
      formData.get("certificate")) as File | null;

    if (!file) {
      return NextResponse.json({ error: "No document file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Invalid file format (${file.type}). Only PDF and images (JPG, PNG) are permitted.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate binary magic bytes
    if (!validateFileMagicBytes(buffer, "document")) {
      return NextResponse.json(
        { error: "File content does not match a valid document or image format signature." },
        { status: 400 }
      );
    }

    const uploadResult = await storage.upload({
      buffer,
      filename: file.name,
      folder: "documents",
      schoolId: "pending-registration",
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      filename: file.name,
      size: file.size,
    });
  } catch (error: unknown) {
    console.error("[UPLOAD_REG_DOC] Error processing document upload:", error);
    return NextResponse.json(
      { error: "Failed to upload verification document" },
      { status: 500 }
    );
  }
}
