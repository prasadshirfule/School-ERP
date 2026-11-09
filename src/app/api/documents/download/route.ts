import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifySignedFileToken } from "@/lib/storage";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing download token" }, { status: 400 });
    }

    const verification = verifySignedFileToken(token);
    if (!verification.valid || !verification.path) {
      if (verification.expired) {
        return NextResponse.json({ error: "Download link has expired" }, { status: 410 });
      }
      return NextResponse.json({ error: "Invalid or tampered download token" }, { status: 403 });
    }

    const filePath = verification.path;

    // Check if it's an absolute cloud URL
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return NextResponse.redirect(filePath);
    }

    // Local disk file resolution
    const baseDir = path.resolve(process.cwd(), "public");
    const cleanRelativePath = filePath.replace(/^\/+/, "");
    const absolutePath = path.resolve(baseDir, cleanRelativePath);

    // Path traversal defense
    if (!absolutePath.startsWith(baseDir)) {
      return NextResponse.json({ error: "Forbidden file path" }, { status: 403 });
    }

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: "Requested document was not found" }, { status: 404 });
    }

    const stat = await fs.promises.stat(absolutePath);
    const fileBuffer = await fs.promises.readFile(absolutePath);
    const filename = path.basename(absolutePath);

    // Determine basic MIME type
    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".json") contentType = "application/json";
    else if (ext === ".csv") contentType = "text/csv";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: unknown) {
    console.error("[DOCUMENT_DOWNLOAD] Download error:", error);
    return NextResponse.json({ error: "Internal server error downloading document" }, { status: 500 });
  }
}
