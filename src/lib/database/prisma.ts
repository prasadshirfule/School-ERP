import { PrismaClient } from "@prisma/client";

declare global {
  var __vidyora_prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__vidyora_prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__vidyora_prisma = prisma;
}

export default prisma;
