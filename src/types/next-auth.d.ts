import { Role } from "@prisma/client";
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    error?: string;
    user: {
      id: string;
      role: Role;
      schoolId: string;
      schoolName?: string;
      mfaEnrolled?: boolean;
      isRestricted?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    schoolId: string;
    schoolName?: string;
    mfaEnrolled?: boolean;
    isRestricted?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    schoolId: string;
    schoolName?: string;
    mfaEnrolled?: boolean;
    isRestricted?: boolean;
  }
}
