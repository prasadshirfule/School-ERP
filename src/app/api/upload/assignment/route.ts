// TEMPORARY: local disk storage for MVP/dev only. Must be replaced with cloud object storage (R2/S3) before deploying to a real hosted server — local disk storage does not survive redeploys or scale across multiple server instances.

import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized, badRequest } from "@/lib/utils";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/zip": ".zip",
};

export async function POST(request: Request) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "PRINCIPAL" &&
    session.user.role !== "TEACHER"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = (formData.get("file") || formData.get("attachment")) as File | null;

    if (!file) {
      return badRequest("No attachment file provided");
    }

    if (file.size > MAX_FILE_SIZE) {
      return badRequest(
        `File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`
      );
    }

    if (file.size === 0) {
      return badRequest("File is empty");
    }

    const mimeType = file.type.toLowerCase();
    let ext = ALLOWED_MIME_TYPES[mimeType];
    if (!ext) {
      // Fallback check based on original filename extension
      const origExt = path.extname(file.name).toLowerCase();
      if ([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".jpg", ".jpeg", ".png", ".webp", ".zip"].includes(origExt)) {
        ext = origExt;
      } else {
        return badRequest(
          `Invalid file type. Allowed formats: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, Images (JPG/PNG/WebP), ZIP.`
        );
      }
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "assignments");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const randomHex = crypto.randomBytes(8).toString("hex");
    const cleanOrigName = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const filename = `assignment_${Date.now()}_${cleanOrigName}_${randomHex}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/assignments/${filename}`;

    return NextResponse.json({
      url,
      filename: file.name,
      size: file.size,
      mimeType,
    });
  } catch (error: any) {
    return badRequest(error.message || "Failed to process assignment attachment");
  }
}
