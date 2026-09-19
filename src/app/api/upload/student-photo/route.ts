// TEMPORARY: local disk storage for MVP/dev only. Must be replaced with cloud object storage (R2/S3) before deploying to a real hosted server — local disk storage does not survive redeploys or scale across multiple server instances.

import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized, badRequest } from "@/lib/utils";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(request: Request) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  // Role validation: only staff (Admin/Principal/Teacher) can upload images
  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "PRINCIPAL" &&
    session.user.role !== "TEACHER"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // 1. Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE) {
      return badRequest(
        `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`
      );
    }

    if (file.size === 0) {
      return badRequest("File is empty");
    }

    // 2. Validate MIME type
    const mimeType = file.type.toLowerCase();
    const ext = ALLOWED_MIME_TYPES[mimeType];
    if (!ext) {
      return badRequest(
        `Invalid file type (${file.type}). Only JPG, JPEG, PNG, and WebP images are allowed.`
      );
    }

    // Determine target subfolder (students or logos)
    const rawType = (formData.get("type") as string) || "";
    const isLogo = rawType === "logo" || rawType === "school" || Boolean(formData.get("logo"));
    const subfolder = isLogo ? "logos" : "students";
    const prefix = isLogo ? "logo" : "student";

    // 3. Ensure upload directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", subfolder);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 4. Generate unique, safe filename
    const randomHex = crypto.randomBytes(12).toString("hex");
    const filename = `${prefix}_${Date.now()}_${randomHex}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // 5. Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    // Return the public web URL path
    const url = `/uploads/${subfolder}/${filename}`;

    return NextResponse.json({
      url,
      filename,
      size: file.size,
      mimeType,
    });
  } catch (error: any) {
    return badRequest(error.message || "Failed to process image upload");
  }
}
