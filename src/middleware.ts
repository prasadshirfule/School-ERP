import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { Role } from "@prisma/client";
import { getAuthSecret } from "./lib/env";

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
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/schools", "/api/health"];

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
    (!pathname.startsWith("/api") && pathname.includes("."))
  ) {
    return NextResponse.next();
  }

  // Retrieve auth secret safely
  let secret: string;
  try {
    secret = getAuthSecret();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Authentication secret configuration missing";
    console.error("[AUTH_MIDDLEWARE] Configuration error:", errorMsg);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Server authentication configuration error" }, { status: 500 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "Configuration");
    return NextResponse.redirect(loginUrl);
  }

  // Detect HTTPS / secure cookies with resilience to reverse proxies & chunked cookies
  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https" ||
    process.env.VERCEL === "1";

  const allCookies = request.cookies.getAll();
  const hasSecureCookie =
    allCookies.some((c) => c.name.startsWith("__Secure-next-auth.session-token")) ||
    (isHttps && !allCookies.some((c) => c.name.startsWith("next-auth.session-token")));

  let token = await getToken({
    req: request,
    secret,
    secureCookie: hasSecureCookie,
  });

  // Fallback: If secureCookie check found nothing, test plain cookie for local dev or mixed proxy
  if (!token) {
    const hasPlainCookie = allCookies.some((c) => c.name.startsWith("next-auth.session-token"));
    if (hasPlainCookie) {
      token = await getToken({
        req: request,
        secret,
        secureCookie: false,
      });
    }
  }

  // Not authenticated
  if (!token) {
    // API routes MUST return 401 JSON, not redirect to HTML login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
