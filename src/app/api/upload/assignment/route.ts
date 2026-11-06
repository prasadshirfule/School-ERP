import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized, badRequest, forbidden, hasRole } from "@/lib/utils";
import { storage, validateFileMagicBytes } from "@/lib/storage";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".zip",
]);

export async function POST(request: Request) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  if (!hasRole(session, ["ADMIN", "PRINCIPAL", "TEACHER"])) {
    return forbidden();
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

    const origExt = path.extname(file.name || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(origExt)) {
      return badRequest(
        `Invalid file type (${origExt}). Allowed formats: PDF, Word, Excel, PowerPoint, Text, Images, and ZIP.`
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate signature for document types
    if (!validateFileMagicBytes(buffer, "document")) {
      return badRequest("File content does not match a valid document format signature.");
    }

    const result = await storage.upload({
      buffer,
      filename: file.name || "attachment.pdf",
      folder: "assignments",
      contentType: file.type,
      schoolId: session.user.schoolId,
    });

    return NextResponse.json({
      url: result.url,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    return badRequest(error.message || "Failed to process assignment attachment");
  }
}

