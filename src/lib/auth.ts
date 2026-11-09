import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./database/prisma";
import { verifyPassword } from "./security/hashing";
import { checkRateLimit } from "./security/rateLimit";
import { logSecurityEvent } from "./security/events";
import { LoginSchema } from "./validation/auth";
import { SchoolStatus } from "@prisma/client";

const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours max lifetime
const INACTIVITY_TIMEOUT_SECONDS = 2 * 60 * 60; // 2 hours inactivity limit

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Vidyora Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const parseResult = LoginSchema.safeParse(credentials);
        if (!parseResult.success) {
          return null;
        }

        const { email, password } = parseResult.data;

        // Rate limiting: max 5 login attempts per 15 minutes per email/IP
        const clientIp = (req?.headers?.["x-forwarded-for"] as string) || "127.0.0.1";
        const rateLimitKey = `login:${clientIp}:${email}`;
        const rateLimit = await checkRateLimit(rateLimitKey, { limit: 5, windowSeconds: 900 });

        if (!rateLimit.allowed) {
          await logSecurityEvent({
            eventType: "ACCOUNT_LOCKED",
            ipAddress: clientIp,
            metadata: { email, reason: "Rate limit exceeded" },
          });
          throw new Error("Too many failed login attempts. Please try again after 15 minutes.");
        }

        // Fetch user with memberships and school
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              where: { isActive: true },
              include: { school: true },
            },
          },
        });

        if (!user) {
          await logSecurityEvent({
            eventType: "LOGIN_FAILED",
            ipAddress: clientIp,
            metadata: { email, reason: "User not found" },
          });
          return null;
        }

        // Check account status
        if (!user.isActive || user.suspendedAt) {
          await logSecurityEvent({
            userId: user.id,
            eventType: "LOGIN_FAILED",
            ipAddress: clientIp,
            metadata: { email, reason: "Account inactive or suspended" },
          });
          throw new Error("Your account has been deactivated or suspended. Please contact your school administrator.");
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.passwordHash);
        if (!isPasswordValid) {
          await logSecurityEvent({
            userId: user.id,
            eventType: "LOGIN_FAILED",
            ipAddress: clientIp,
            metadata: { email, reason: "Invalid password" },
          });
          return null;
        }

        // Find primary or first active school membership
        const primaryMembership =
          user.memberships.find((m) => m.isPrimary && m.isActive) || user.memberships[0];

        if (!primaryMembership) {
          throw new Error("No active school membership found for this account.");
        }

        // Validate school status
        if (primaryMembership.school.status !== SchoolStatus.ACTIVE) {
          throw new Error("School account is currently not active or under review.");
        }

        // Update last login timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        await logSecurityEvent({
          schoolId: primaryMembership.schoolId,
          userId: user.id,
          eventType: "LOGIN_SUCCESS",
          ipAddress: clientIp,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: primaryMembership.role,
          schoolId: primaryMembership.schoolId,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000);

      // Initial login: attach user fields to token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.sessionVersion = user.sessionVersion;
        token.lastActive = now;
        return token;
      }

      // Inactivity timeout validation (2 hours)
      if (token.lastActive && now - token.lastActive > INACTIVITY_TIMEOUT_SECONDS) {
        await logSecurityEvent({
          userId: token.id,
          schoolId: token.schoolId,
          eventType: "SESSION_INACTIVITY_EXPIRED",
        });
        // Invalidate token by resetting claims
        return {} as typeof token;
      }

      // Server-side database validation on subsequent requests
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: { isActive: true, sessionVersion: true, suspendedAt: true },
      });

      if (!dbUser || !dbUser.isActive || dbUser.suspendedAt || dbUser.sessionVersion !== token.sessionVersion) {
        // Session was revoked (e.g. password changed/reset or user suspended)
        return {} as typeof token;
      }

      // Refresh activity timestamp
      token.lastActive = now;
      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        return session;
      }

      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
        role: token.role,
        schoolId: token.schoolId,
        sessionVersion: token.sessionVersion,
      };

      return session;
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "vidyora-dev-jwt-super-secret-key-at-least-32-chars",
};
