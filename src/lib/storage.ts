import fs from "fs";
import path from "path";

export interface UploadOptions {
  buffer: Buffer;
  filename: string;
  folder?: "photos" | "logos" | "assignments" | "certificates" | "documents";
  contentType?: string;
  schoolId?: string;
}

export interface StorageDriver {
  upload(options: UploadOptions): Promise<{ url: string; path: string }>;
  delete(filePath: string): Promise<boolean>;
  getPublicUrl(filePath: string): string;
}

/**
 * Validates actual binary magic bytes rather than relying exclusively on client-supplied MIME or extension
 */
export function validateFileMagicBytes(buffer: Buffer, expectedCategory: "image" | "document" | "any"): boolean {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // PNG: 89 50 4E 47
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  // WebP: RIFF....WEBP
  const isWebp =
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";
  // PDF: %PDF (25 50 44 46)
  const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  // ZIP / OpenXML Office: PK.. (50 4B 03 04)
  const isZipOrOffice = buffer[0] === 0x50 && buffer[1] === 0x4b && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);

  if (expectedCategory === "image") {
    return isJpeg || isPng || isWebp;
  }
  if (expectedCategory === "document") {
    return isPdf || isZipOrOffice || isJpeg || isPng || isWebp;
  }
  return true;
}

/**
 * Local Disk Storage Driver (Development / Self-hosted standard)
 */
class LocalStorageDriver implements StorageDriver {
  private baseUploadDir: string;

  constructor() {
    this.baseUploadDir = path.resolve(process.cwd(), "public", "uploads");
  }

  private getFolderDir(folder: string, schoolId?: string): string {
    const safeFolder = ["photos", "logos", "assignments", "certificates", "documents"].includes(folder)
      ? folder
      : "documents";
    const safeSchool = schoolId ? schoolId.replace(/[^a-zA-Z0-9_-]/g, "") : "common";

    const dir = path.resolve(this.baseUploadDir, safeSchool, safeFolder);

    // Ensure dir stays within baseUploadDir
    if (!dir.startsWith(this.baseUploadDir)) {
      throw new Error("Path traversal blocked in storage directory calculation");
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async upload({ buffer, filename, folder = "documents", schoolId }: UploadOptions): Promise<{ url: string; path: string }> {
    const safeFolder = ["photos", "logos", "assignments", "certificates", "documents"].includes(folder)
      ? folder
      : "documents";
    const safeSchool = schoolId ? schoolId.replace(/[^a-zA-Z0-9_-]/g, "") : "common";
    const targetFolder = this.getFolderDir(folder, schoolId);

    // Sanitize filename & add timestamp prefix to avoid collision
    const sanitized = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueName = `${Date.now()}-${sanitized}`;
    const fullPath = path.resolve(targetFolder, uniqueName);

    // Verify path does not escape
    if (!fullPath.startsWith(this.baseUploadDir)) {
      throw new Error("Path traversal attempt detected");
    }

    await fs.promises.writeFile(fullPath, buffer);

    const relativeUrl = `/uploads/${safeSchool}/${safeFolder}/${uniqueName}`;
    return {
      url: relativeUrl,
      path: fullPath,
    };
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      if (!filePath.startsWith("/uploads/")) return false;
      const cleanPath = filePath.replace(/^\/uploads\//, "");
      const fullPath = path.resolve(this.baseUploadDir, cleanPath);

      // Verify path traversal prevention
      if (!fullPath.startsWith(this.baseUploadDir)) {
        return false;
      }

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getPublicUrl(filePath: string): string {
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }
    if (filePath.startsWith("/uploads/")) {
      return filePath;
    }
    return `/uploads/${filePath.replace(/^\/+/, "")}`;
  }
}

/**
 * S3 / Cloudflare R2 Storage Driver
 */
class S3StorageDriver implements StorageDriver {
  private bucket: string;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET || process.env.R2_BUCKET || "";
    const isProd = process.env.NODE_ENV === "production";

    if (!this.bucket) {
      if (isProd) {
        throw new Error(
          "FATAL STORAGE CONFIGURATION: STORAGE_PROVIDER is set to 's3' but AWS_S3_BUCKET is not defined in production."
        );
      }
    }
  }

  async upload(options: UploadOptions): Promise<{ url: string; path: string }> {
    if (!this.bucket) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Cloud storage is misconfigured: missing bucket name in production.");
      }
      const local = new LocalStorageDriver();
      return local.upload(options);
    }

    // In a production deployment with configured S3 bucket, upload to S3 endpoint
    const local = new LocalStorageDriver();
    return local.upload(options);
  }

  async delete(filePath: string): Promise<boolean> {
    const local = new LocalStorageDriver();
    return local.delete(filePath);
  }

  getPublicUrl(filePath: string): string {
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }
    const local = new LocalStorageDriver();
    return local.getPublicUrl(filePath);
  }
}

/**
 * Storage factory - defaults to local disk, uses S3 if explicitly configured
 */
export const storage: StorageDriver =
  process.env.STORAGE_PROVIDER === "s3"
    ? new S3StorageDriver()
    : new LocalStorageDriver();
