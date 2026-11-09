import type { NextAuthOptions, Session, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import {
  checkDatabaseRateLimit,
  checkIpRateLimit,
  resetDatabaseRateLimit,
  getClientIp,
  maskIdentifier,
} from "./rateLimit";
import { getAuthSecret } from "./env";
import {
  verifyRecoveryCode,
  findMatchingTotpStep,
  recordTotpConsumedAtDatabaseLevel,
  decryptSecret,
} from "./totp";
import { logAuditEvent } from "./audit";
import { Role } from "@prisma/client";

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [name, domain] = parts;
  const maskedName = name.length <= 2 ? name[0] + "***" : name.slice(0, 2) + "***";
  return `${maskedName}@${domain}`;
}

// Pre-computed bcrypt cost 10 hash of "dummy_password" for constant-time comparison when user is not found (anti-enumeration)
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

interface CustomUser extends NextAuthUser {
  id: string;
  email: string;
  role: Role;
  schoolId: string;
  schoolName: string;
  mfaEnrolled?: boolean;
  isRestricted?: boolean;
}

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
    signOut: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "MFA Code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.trim().toLowerCase().normalize("NFKC");
        const clientIp = req?.headers ? getClientIp(req.headers) : null;

        // IP throttling for distributed brute force defense
        if (clientIp) {
          const ipRateCheck = await checkIpRateLimit(clientIp, 60, 5 * 60 * 1000);
          if (!ipRateCheck.allowed) {
            console.warn(`[AUTH] IP rate limit exceeded for client: ${maskIdentifier(clientIp)}`);
            throw new Error("RATE_LIMITED: Too many requests from this IP address. Please wait a few minutes.");
          }
        }

        // Shared PostgreSQL database rate limit: max 15 login attempts per 5 minutes per normalized email
        const rateCheck = await checkDatabaseRateLimit(`login:${normalizedEmail}`, 15, 5 * 60 * 1000);
        if (!rateCheck.allowed) {
          console.warn(`[AUTH] Rate limit exceeded for login attempts on email: ${maskEmail(normalizedEmail)}`);
          throw new Error("RATE_LIMITED: Too many attempts. Please wait 5 minutes before trying again.");
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: normalizedEmail,
            },
            include: {
              school: {
                select: {
                  id: true,
                  name: true,
                  isActive: true,
                  status: true,
                },
              },
            },
          });

          // Anti-enumeration: execute dummy hash comparison if user doesn't exist
          if (!user || !user.passwordHash || !user.isActive) {
            await bcrypt.compare(credentials.password, DUMMY_HASH);
            return null;
          }

          if (user.status && user.status !== "ACTIVE") {
            console.warn(`[AUTH] Login blocked: user account is ${user.status}`);
            await bcrypt.compare(credentials.password, DUMMY_HASH);
            return null;
          }

          // If not SUPER_ADMIN, verify that school exists and is not suspended/inactive
          if (user.role !== Role.SUPER_ADMIN) {
            if (user.school && (user.school.isActive === false || user.school.status === "SUSPENDED")) {
              console.warn(`[AUTH] Login blocked: School ${user.schoolId} is suspended or inactive`);
              throw new Error("SCHOOL_SUSPENDED: Your school access has been suspended. Please contact platform administration.");
            }
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isValid) {
            return null;
          }

          // Platform Admin Mandatory TOTP MFA Enforcement
          if (user.role === Role.SUPER_ADMIN) {
            if (user.mfaEnabled) {
              const enteredCode = credentials.totpCode ? credentials.totpCode.trim() : "";
              if (!enteredCode) {
                throw new Error("MFA_REQUIRED: Multi-factor authentication code is required.");
              }

              let mfaValid = false;
              let usedRecoveryHash: string | null = null;

              if (user.mfaSecret) {
                const plainSecret = decryptSecret(user.mfaSecret);
                const matchedStep = findMatchingTotpStep(plainSecret, enteredCode);
                if (matchedStep !== null) {
                  // Atomically record TOTP consumed at PostgreSQL database level
                  await recordTotpConsumedAtDatabaseLevel(user.id, matchedStep, enteredCode);
                  mfaValid = true;
                }
              }

              if (!mfaValid && user.mfaRecoveryCodes && user.mfaRecoveryCodes.length > 0) {
                usedRecoveryHash = verifyRecoveryCode(enteredCode, user.mfaRecoveryCodes);
                if (usedRecoveryHash) {
                  mfaValid = true;
                  // Atomically consume recovery code
                  await prisma.user.update({
                    where: { id: user.id },
                    data: {
                      mfaRecoveryCodes: user.mfaRecoveryCodes.filter((h) => h !== usedRecoveryHash),
                    },
                  });
                  await logAuditEvent({
                    userId: user.id,
                    userEmail: user.email,
                    action: "MFA_RECOVERY_CODE_CONSUMED",
                    targetType: "User",
                    targetId: user.id,
                    details: { remainingCodes: user.mfaRecoveryCodes.length - 1 },
                  });
                }
              }

              if (!mfaValid) {
                throw new Error("INVALID_MFA_CODE: Invalid authenticator code or recovery code.");
              }
            }
          }

          const isSuperAdmin = user.role === Role.SUPER_ADMIN;
          const isEnrolled = isSuperAdmin ? Boolean(user.mfaEnabled) : true;

          // Reset rate limit counters upon successful authentication
          await resetDatabaseRateLimit(`login:${normalizedEmail}`);
          if (clientIp) {
            await resetDatabaseRateLimit(`ip:${clientIp}`);
          }

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            schoolId: user.schoolId || "",
            schoolName: user.school?.name || (isSuperAdmin ? "Platform Super Admin" : "School ERP"),
            mfaEnrolled: isEnrolled,
            isRestricted: isSuperAdmin && !isEnrolled,
          } as CustomUser;
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : "Unknown error";
          if (
            errMsg.startsWith("RATE_LIMITED") ||
            errMsg.startsWith("SCHOOL_SUSPENDED") ||
            errMsg.startsWith("MFA_REQUIRED") ||
            errMsg.startsWith("INVALID_MFA_CODE") ||
            errMsg.startsWith("MFA_DATABASE_ERROR") ||
            errMsg.startsWith("AUTH_DATABASE_UNAVAILABLE")
          ) {
            throw error;
          }
          console.error("[AUTH] Authorization or database error during sign in attempt:", errMsg);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      if (user) {
        const u = user as CustomUser;
        token.id = u.id;
        token.role = u.role;
        token.schoolId = u.schoolId;
        token.schoolName = u.schoolName || "School ERP";
        token.mfaEnrolled = u.mfaEnrolled ?? true;
        token.isRestricted = u.isRestricted ?? false;
      }
      return token;
    },
    async session({ session, token }): Promise<Session> {
      if (!session.user) {
        session.user = {
          id: token.id as string,
          role: token.role as Role,
          schoolId: token.schoolId as string,
          schoolName: (token.schoolName as string) || "School ERP",
          mfaEnrolled: token.mfaEnrolled as boolean,
          isRestricted: (token.isRestricted as boolean) ?? false,
        };
      } else {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.schoolId = token.schoolId as string;
        session.user.schoolName = (token.schoolName as string) || "School ERP";
        session.user.mfaEnrolled = token.mfaEnrolled as boolean;
        session.user.isRestricted = (token.isRestricted as boolean) ?? false;
      }

      // Live database validation for SUPER_ADMIN: prevent stale JWT from bypassing newly enabled MFA
      if (token.role === Role.SUPER_ADMIN) {
        try {
          const adminUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { mfaEnabled: true, isActive: true, status: true },
          });

          if (!adminUser || !adminUser.isActive || adminUser.status !== "ACTIVE") {
            session.error = "ACCOUNT_INACTIVE";
          } else if (adminUser.mfaEnabled && !token.mfaEnrolled) {
            // Live revocation: MFA was enabled after token issuance, invalidate full access immediately
            session.user.mfaEnrolled = false;
            session.user.isRestricted = true;
            session.error = "MFA_REQUIRED";
          }
        } catch {
          // Safe fallback
        }
      }

      // Check live school status for non-superadmin users to revoke suspended sessions
      if (token.role !== Role.SUPER_ADMIN && token.schoolId && token.schoolId !== "platform") {
        try {
          const school = await prisma.school.findUnique({
            where: { id: token.schoolId as string },
            select: { isActive: true, status: true },
          });
          if (school && (school.isActive === false || school.status === "SUSPENDED")) {
            session.error = "SCHOOL_SUSPENDED";
          }
        } catch {
          // Safe fallback
        }
      }

      return session;
    },
  },
};
