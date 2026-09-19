import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { Role } from "@prisma/client";

/**
 * Route-to-role mapping. Each URL prefix is restricted to
 * the listed roles. If a user's role is not in the list,
 * they are redirected to /login.
 */
const ROLE_ROUTES: Record<string, Role[]> = {
  "/admin": [Role.ADMIN, Role.PRINCIPAL],
  "/teacher": [Role.TEACHER],
  "/parent": [Role.PARENT],
  "/accountant": [Role.ACCOUNTANT, Role.ADMIN, Role.PRINCIPAL],
};

/** Routes that don't require authentication */
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/schools"];

/** Role-based default dashboards for redirect after login */
const ROLE_DASHBOARDS: Record<Role, string> = {
  [Role.ADMIN]: "/admin/dashboard",
  [Role.PRINCIPAL]: "/admin/dashboard",
  [Role.TEACHER]: "/teacher/dashboard",
  [Role.PARENT]: "/parent/dashboard",
  [Role.ACCOUNTANT]: "/accountant/dashboard",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths, static assets, and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get JWT token from the request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated → redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Root path → redirect to role dashboard
  if (pathname === "/") {
    const dashboard = ROLE_DASHBOARDS[token.role as Role] || "/login";
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  // Check role-based route access
  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!allowedRoles.includes(token.role as Role)) {
        // User is authenticated but wrong role → redirect to their dashboard
        const dashboard = ROLE_DASHBOARDS[token.role as Role] || "/login";
        return NextResponse.redirect(new URL(dashboard, request.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
