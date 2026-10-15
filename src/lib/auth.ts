import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { checkRateLimit } from "./rateLimit";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "school_erp_production_secret_key_min32chars!!",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
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
          console.warn(`Rate limit exceeded for login attempts on email: ${normalizedEmail}`);
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
          };
        } catch (error: any) {
          console.error("Auth authorization error:", error?.message || error);
          if (error?.message?.startsWith("RATE_LIMITED")) {
            throw error;
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.schoolName = (user as any).schoolName || "School ERP";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.schoolId = token.schoolId as string;
        session.user.schoolName = (token as any).schoolName || "School ERP";
      }
      return session;
    },
  },
};
