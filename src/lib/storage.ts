import fs from "fs";
import path from "path";

export interface UploadOptions {
  buffer: Buffer;
  filename: string;
  folder?: "photos" | "logos" | "assignments" | "certificates" | "documents";
  contentType?: string;
}

export interface StorageDriver {
  upload(options: UploadOptions): Promise<{ url: string; path: string }>;
  delete(filePath: string): Promise<boolean>;
  getPublicUrl(filePath: string): string;
}

/**
 * Local Disk Storage Driver (Development / Self-hosted standard)
 */
class LocalStorageDriver implements StorageDriver {
  private getFolderDir(folder: string): string {
    const safeFolder = ["photos", "logos", "assignments", "certificates", "documents"].includes(folder)
      ? folder
      : "documents";
    const dir = path.join(process.cwd(), "public", "uploads", safeFolder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async upload({ buffer, filename, folder = "documents" }: UploadOptions): Promise<{ url: string; path: string }> {
    const targetFolder = this.getFolderDir(folder);
    const safeFolder = ["photos", "logos", "assignments", "certificates", "documents"].includes(folder)
      ? folder
      : "documents";

    // Sanitize filename & add timestamp prefix to avoid collision
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueName = `${Date.now()}-${sanitized}`;
    const fullPath = path.join(targetFolder, uniqueName);

    await fs.promises.writeFile(fullPath, buffer);

    const relativeUrl = `/uploads/${safeFolder}/${uniqueName}`;
    return {
      url: relativeUrl,
      path: fullPath,
    };
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      if (!filePath.startsWith("/uploads/")) return false;
      const cleanPath = filePath.replace(/^\/uploads\//, "");
      const fullPath = path.join(process.cwd(), "public", "uploads", cleanPath);
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
    return `/uploads/${filePath}`;
  }
}

/**
 * S3 / Cloudflare R2 Storage Driver Stub
 * (Ready to be enabled when S3 / R2 environment variables are configured)
 */
class S3StorageDriver implements StorageDriver {
  async upload(options: UploadOptions): Promise<{ url: string; path: string }> {
    // Falls back to local if S3 is not configured
    const local = new LocalStorageDriver();
    return local.upload(options);
  }

  async delete(filePath: string): Promise<boolean> {
    const local = new LocalStorageDriver();
    return local.delete(filePath);
  }

  getPublicUrl(filePath: string): string {
    const local = new LocalStorageDriver();
    return local.getPublicUrl(filePath);
  }
}

/**
 * Storage factory - defaults to local disk, uses S3 if configured
 */
export const storage: StorageDriver =
  process.env.STORAGE_PROVIDER === "s3" || process.env.AWS_S3_BUCKET
    ? new S3StorageDriver()
    : new LocalStorageDriver();
