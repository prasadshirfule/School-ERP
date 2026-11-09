import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface SignedFilePayload {
  path: string;
  expires: number;
}

/**
 * Generates an HMAC-SHA256 signed access token for secure time-limited document download
 */
export function generateSignedFileToken(filePath: string, expiresInSeconds: number = 3600): string {
  const secret = process.env.STORAGE_SIGNING_SECRET || process.env.NEXTAUTH_SECRET || "erp-default-file-signing-key";
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payloadStr = Buffer.from(JSON.stringify({ path: filePath, expires })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
  return `${payloadStr}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed document token
 */
export function verifySignedFileToken(token: string): { valid: boolean; path?: string; expired?: boolean } {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return { valid: false };
    const [payloadStr, signature] = parts;
    const secret = process.env.STORAGE_SIGNING_SECRET || process.env.NEXTAUTH_SECRET || "erp-default-file-signing-key";
    const expectedSig = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false };
    }

    const payload: SignedFilePayload = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.expires < now) {
      return { valid: false, expired: true, path: payload.path };
    }
    return { valid: true, path: payload.path };
  } catch {
    return { valid: false };
  }
}

/**
 * Returns a signed download URL using token verification
 */
export function generateSignedFileUrl(filePath: string, expiresInSeconds: number = 3600): string {
  const token = generateSignedFileToken(filePath, expiresInSeconds);
  return `/api/documents/download?token=${token}`;
}

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
  getPresignedDownloadUrl(filePath: string, expiresInSeconds?: number): Promise<string>;
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

  async getPresignedDownloadUrl(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
    return generateSignedFileUrl(filePath, expiresInSeconds);
  }
}

/**
 * S3 / Cloudflare R2 Storage Driver
 * Provides durable cloud object storage with school-scoped key prefixes.
 */
class S3StorageDriver implements StorageDriver {
  private bucket: string;
  private region: string;
  private endpoint?: string;
  private customDomain?: string;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET || process.env.R2_BUCKET || "";
    this.region = process.env.AWS_S3_REGION || process.env.AWS_REGION || "auto";
    this.endpoint = process.env.AWS_S3_ENDPOINT;
    this.customDomain = process.env.AWS_S3_CUSTOM_DOMAIN;

    const isProd = process.env.NODE_ENV === "production";
    if (!this.bucket && isProd) {
      throw new Error(
        "FATAL STORAGE CONFIGURATION: STORAGE_PROVIDER is set to 's3' but AWS_S3_BUCKET is not defined in production."
      );
    }
  }

  private async getS3Client() {
    const { S3Client } = await import("@aws-sdk/client-s3");
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    const clientConfig: Record<string, unknown> = {
      region: this.region,
    };

    if (this.endpoint) {
      clientConfig.endpoint = this.endpoint;
    }

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    return new S3Client(clientConfig);
  }

  async upload({
    buffer,
    filename,
    folder = "documents",
    contentType,
    schoolId,
  }: UploadOptions): Promise<{ url: string; path: string }> {
    if (!this.bucket) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Cloud storage is misconfigured: missing AWS_S3_BUCKET in production.");
      }
      const local = new LocalStorageDriver();
      return local.upload({ buffer, filename, folder, contentType, schoolId });
    }

    const safeFolder = ["photos", "logos", "assignments", "certificates", "documents"].includes(folder)
      ? folder
      : "documents";
    const safeSchool = schoolId ? schoolId.replace(/[^a-zA-Z0-9_-]/g, "") : "common";
    const sanitized = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, "_");
    const objectKey = `uploads/${safeSchool}/${safeFolder}/${Date.now()}-${sanitized}`;

    try {
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await this.getS3Client();

      await client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: buffer,
          ContentType: contentType || "application/octet-stream",
        })
      );

      const url = this.getPublicUrl(objectKey);
      return { url, path: objectKey };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "S3 upload failed";
      console.error("[STORAGE_S3] Failed to upload object:", errMsg);
      throw new Error(`Cloud storage upload failed: ${errMsg}`);
    }
  }

  async delete(filePath: string): Promise<boolean> {
    // If it is a legacy local file path, delete through local driver
    if (filePath.startsWith("/uploads/")) {
      const local = new LocalStorageDriver();
      return local.delete(filePath);
    }

    if (!this.bucket) return false;

    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await this.getS3Client();
      const objectKey = filePath.replace(/^https?:\/\/[^/]+\//, "").replace(/^\/+/, "");

      await client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        })
      );
      return true;
    } catch (err) {
      console.error("[STORAGE_S3] Failed to delete object:", err);
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

    const cleanKey = filePath.replace(/^\/+/, "");

    if (this.customDomain) {
      return `https://${this.customDomain.replace(/\/+$/, "")}/${cleanKey}`;
    }

    if (this.endpoint) {
      return `${this.endpoint.replace(/\/+$/, "")}/${this.bucket}/${cleanKey}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${cleanKey}`;
  }

  async getPresignedDownloadUrl(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (!this.bucket) {
      return generateSignedFileUrl(filePath, expiresInSeconds);
    }
    try {
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      const client = await this.getS3Client();
      const objectKey = filePath.replace(/^https?:\/\/[^/]+\//, "").replace(/^\/+/, "");

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      });

      return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
      console.error("[STORAGE_S3] Failed to generate presigned URL:", err);
      return generateSignedFileUrl(filePath, expiresInSeconds);
    }
  }
}

/**
 * Storage factory - defaults to local disk, uses S3 if explicitly configured
 */
export const storage: StorageDriver =
  process.env.STORAGE_PROVIDER === "s3"
    ? new S3StorageDriver()
    : new LocalStorageDriver();

/**
 * Convenience helper to generate a secure time-limited download URL
 * across local disk or S3/R2 cloud storage.
 */
export async function getSecureDownloadUrl(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
  return storage.getPresignedDownloadUrl(filePath, expiresInSeconds);
}
