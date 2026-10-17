import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized, badRequest, forbidden, hasRole } from "@/lib/utils";
import { storage, validateFileMagicBytes } from "@/lib/storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  if (!hasRole(session, ["ADMIN", "PRINCIPAL", "TEACHER"])) {
    return forbidden();
  }

  try {
    const formData = await request.formData();
    const file = (formData.get("photo") ||
      formData.get("logo") ||
      formData.get("image") ||
      formData.get("file")) as File | null;

    if (!file) {
      return badRequest("No image file provided");
    }

    if (file.size > MAX_FILE_SIZE) {
      return badRequest(
        `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`
      );
    }

    if (file.size === 0) {
      return badRequest("File is empty");
    }

    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return badRequest(
        `Invalid file type (${file.type}). Only JPG, JPEG, PNG, and WebP images are allowed.`
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate binary magic bytes to prevent spoofed MIME uploads
    if (!validateFileMagicBytes(buffer, "image")) {
      return badRequest("File content does not match a valid image format signature.");
    }

    const rawType = (formData.get("type") as string) || "";
    const isLogo = rawType === "logo" || rawType === "school" || Boolean(formData.get("logo"));
    const folder = isLogo ? "logos" : "photos";

    const result = await storage.upload({
      buffer,
      filename: file.name || (isLogo ? "school-logo.png" : "student-photo.png"),
      folder,
      contentType: mimeType,
      schoolId: session.user.schoolId,
    });

    return NextResponse.json({
      url: result.url,
      filename: file.name,
      size: file.size,
      mimeType,
    });
  } catch (error: any) {
    return badRequest(error.message || "Failed to process image upload");
  }
}

