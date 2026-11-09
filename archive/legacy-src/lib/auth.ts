import type { NextAuthOptions, Session, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { checkRateLimit } from "./rateLimit";
import { getAuthSecret } from "./env";
import { Role } from "@prisma/client";

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [name, domain] = parts;
  const maskedName = name.length <= 2 ? name[0] + "***" : name.slice(0, 2) + "***";
  return `${maskedName}@${domain}`;
}

interface CustomUser extends NextAuthUser {
  id: string;
  email: string;
  role: Role;
  schoolId: string;
  schoolName: string;
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        
        // Rate limit: max 15 login attempts per 5 minutes per email
        const rateCheck = checkRateLimit(`login:${normalizedEmail}`, 15, 5 * 60 * 1000);
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
                  name: true,
                },
              },
            },
          });

          if (!user || !user.passwordHash || !user.isActive) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            schoolId: user.schoolId,
            schoolName: user.school?.name || "School ERP",
          } as CustomUser;
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : "Unknown error";
          if (errMsg.startsWith("RATE_LIMITED")) {
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
        };
      } else {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.schoolId = token.schoolId as string;
        session.user.schoolName = (token.schoolName as string) || "School ERP";
      }
      return session;
    },
  },
};
