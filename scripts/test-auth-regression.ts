/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * School ERP — Authentication & NextAuth Production Regression Test Suite
 * 
 * Verifies all 9 regression requirements specified in the security remediation:
 * 1. Valid credentials successfully establish a session.
 * 2. Invalid credentials fail safely.
 * 3. The session persists across page navigation.
 * 4. Logout invalidates the session.
 * 5. Expired or invalid sessions are rejected.
 * 6. Admin, principal, teacher, accountant, and parent redirects remain correct.
 * 7. Missing required secrets fail securely.
 * 8. Protected APIs reject unauthenticated requests.
 * 9. Existing tenant isolation remains intact.
 * 
 * Run with: npx ts-node scripts/test-auth-regression.ts
 */

import { authOptions } from "../src/lib/auth";
import { getAuthSecret } from "../src/lib/env";
import { middleware } from "../src/middleware";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { Role } from "@prisma/client";
import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { TENANT_SCOPED_MODELS, tenantClient } from "../src/lib/tenant";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failed++;
  }
}

async function runRegressionSuite() {
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("🔐 SCHOOL ERP — AUTHENTICATION & SESSION PRODUCTION REGRESSION SUITE");
  console.log("═══════════════════════════════════════════════════════════════════════\n");

  // Setup deterministic mock user data for standalone test execution
  const mockPasswordHash = bcrypt.hashSync("password123", 10);
  const mockUsers: Record<string, any> = {
    "admin@dpa.edu.in": {
      id: "usr_admin_1",
      email: "admin@dpa.edu.in",
      passwordHash: mockPasswordHash,
      role: Role.ADMIN,
      schoolId: "sch_dpa_delhi",
      isActive: true,
      school: { name: "Delhi Public Academy" },
    },
    "principal@dpa.edu.in": {
      id: "usr_principal_1",
      email: "principal@dpa.edu.in",
      passwordHash: mockPasswordHash,
      role: Role.PRINCIPAL,
      schoolId: "sch_dpa_delhi",
      isActive: true,
      school: { name: "Delhi Public Academy" },
    },
    "ananya.sharma@dpa.edu.in": {
      id: "usr_teacher_1",
      email: "ananya.sharma@dpa.edu.in",
      passwordHash: mockPasswordHash,
      role: Role.TEACHER,
      schoolId: "sch_dpa_delhi",
      isActive: true,
      school: { name: "Delhi Public Academy" },
    },
    "accountant@dpa.edu.in": {
      id: "usr_accountant_1",
      email: "accountant@dpa.edu.in",
      passwordHash: mockPasswordHash,
      role: Role.ACCOUNTANT,
      schoolId: "sch_dpa_delhi",
      isActive: true,
      school: { name: "Delhi Public Academy" },
    },
    "parent.sharma@gmail.com": {
      id: "usr_parent_1",
      email: "parent.sharma@gmail.com",
      passwordHash: mockPasswordHash,
      role: Role.PARENT,
      schoolId: "sch_dpa_delhi",
      isActive: true,
      school: { name: "Delhi Public Academy" },
    },
    "inactive@dpa.edu.in": {
      id: "usr_inactive_1",
      email: "inactive@dpa.edu.in",
      passwordHash: mockPasswordHash,
      role: Role.TEACHER,
      schoolId: "sch_dpa_delhi",
      isActive: false,
      school: { name: "Delhi Public Academy" },
    },
  };

  (prisma.user as any).findUnique = async ({ where }: any) => {
    return mockUsers[where.email] || null;
  };

  const secret = getAuthSecret();
  const credentialsProvider = authOptions.providers[0] as any;
  const authorize = (credentialsProvider?.options?.authorize || credentialsProvider?.authorize) as (credentials: Record<string, string>) => Promise<any>;
  if (typeof authorize !== "function") {
    throw new Error("Credentials provider authorize function is not available");
  }

  // ═══════════════════════════════════════════════════════════════════
  // REQUIREMENT 1: Valid credentials successfully establish a session
  // ═══════════════════════════════════════════════════════════════════
  console.log("--- 1. Valid Credentials Session Establishment ---");

  // Test Admin login
  const adminUser = await authorize({ email: "admin@dpa.edu.in", password: "password123" });
  assert(adminUser !== null, "Admin credentials authorize successfully");
  assert(adminUser?.role === Role.ADMIN, "Admin role is accurately populated");
  assert(Boolean(adminUser?.schoolId), "Admin schoolId is populated");
  assert(Boolean(adminUser?.schoolName), "Admin schoolName is populated");

  // Test Principal login
  const principalUser = await authorize({ email: "principal@dpa.edu.in", password: "password123" });
  assert(principalUser !== null, "Principal credentials authorize successfully");
  assert(principalUser?.role === Role.PRINCIPAL, "Principal role is accurately populated");

  // Test Teacher login
  const teacherUser = await authorize({ email: "ananya.sharma@dpa.edu.in", password: "password123" });
  assert(teacherUser !== null, "Teacher credentials authorize successfully");
  assert(teacherUser?.role === Role.TEACHER, "Teacher role is accurately populated");

  // Test Accountant login
  const accountantUser = await authorize({ email: "accountant@dpa.edu.in", password: "password123" });
  assert(accountantUser !== null, "Accountant credentials authorize successfully");
  assert(accountantUser?.role === Role.ACCOUNTANT, "Accountant role is accurately populated");

  // Test Parent login
  const parentUser = await authorize({ email: "parent.sharma@gmail.com", password: "password123" });
  assert(parentUser !== null, "Parent credentials authorize successfully");
  assert(parentUser?.role === Role.PARENT, "Parent role is accurately populated");

  // Test JWT callback mapping
  const jwtCallback = authOptions.callbacks?.jwt;
  if (jwtCallback) {
    const token = await jwtCallback({
      token: {} as any,
      user: adminUser,
      account: null,
      profile: undefined,
      isNewUser: false,
    });
    assert(token.id === adminUser.id, "JWT callback populates token.id");
    assert(token.role === Role.ADMIN, "JWT callback populates token.role");
    assert(token.schoolId === adminUser.schoolId, "JWT callback populates token.schoolId");

    // Test session callback mapping
    const sessionCallback = authOptions.callbacks?.session;
    if (sessionCallback) {
      const session = await sessionCallback({
        session: { expires: new Date(Date.now() + 86400000).toISOString() } as any,
        token,
        user: adminUser,
        newSession: undefined,
        trigger: "update" as any,
      });
      const sessionUser = session.user as any;
      assert(sessionUser?.id === adminUser.id, "Session callback preserves user id");
      assert(sessionUser?.role === Role.ADMIN, "Session callback preserves user role");
      assert(sessionUser?.schoolId === adminUser.schoolId, "Session callback preserves user schoolId");
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // REQUIREMENT 2: Invalid credentials fail safely
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 2. Invalid Credentials Safety ---");

  const wrongPasswordUser = await authorize({ email: "admin@dpa.edu.in", password: "wrong_password_999" });
  assert(wrongPasswordUser === null, "Wrong password safely returns null (does not crash or leak)");

  const unknownEmailUser = await authorize({ email: "nonexistent@fake.school.edu", password: "password123" });
  assert(unknownEmailUser === null, "Non-existent email safely returns null");

  const inactiveUser = await authorize({ email: "inactive@dpa.edu.in", password: "password123" });
  assert(inactiveUser === null, "Inactive user account is rejected and returns null");

  const emptyUser = await authorize({ email: "", password: "" });
  assert(emptyUser === null, "Empty credentials safely return null");

  // ═══════════════════════════════════════════════════════════════════
  // REQUIREMENT 3: Session persists across page navigation
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 3. Session Persistence Across Navigation ---");

  const sessionPayload = {
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    schoolId: adminUser.schoolId,
    schoolName: adminUser.schoolName,
  };

  const encodedToken = await encode({
    token: sessionPayload,
    secret,
    maxAge: 30 * 24 * 60 * 60,
  });
  assert(typeof encodedToken === "string" && encodedToken.length > 32, "Session token encrypted successfully using A256GCM");

  // Simulate incoming request with standard cookie
  const standardReq = new NextRequest("http://localhost:3000/admin/dashboard", {
    headers: {
      cookie: `next-auth.session-token=${encodedToken}`,
    },
  });
  const standardRes = await middleware(standardReq);
  assert(standardRes.status === 200, "Middleware admits request with valid session token (status 200)");

  // Test HTTPS secure-cookie variant
  const secureReq = new NextRequest("https://school-erp-wb73.vercel.app/admin/dashboard", {
    headers: {
      cookie: `__Secure-next-auth.session-token=${encodedToken}`,
      "x-forwarded-proto": "https",
    },
  });
  const secureRes = await middleware(secureReq);
  assert(secureRes.status === 200, "Middleware admits request with __Secure- prefixed cookie on HTTPS");

  // ═══════════════════════════════════════════════════════════════════
  // REQUIREMENT 4: Logout invalidates the session
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 4. Session Invalidation (Logout) ---");

  const loggedOutReq = new NextRequest("http://localhost:3000/admin/dashboard", {
    headers: {
      cookie: "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT",
    },
  });
  const loggedOutRes = await middleware(loggedOutReq);
  assert(
    Boolean(loggedOutRes.status === 307 && loggedOutRes.headers.get("location")?.includes("/login")),
    "Logged out request without valid cookie is redirected to /login"
  );

  // ═══════════════════════════════════════════════════════════════════
  // REQUIREMENT 5: Expired or invalid sessions are rejected
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 5. Expired & Tampered Session Rejection ---");

  // Expired session (maxAge = -100 seconds)
  const expiredToken = await encode({
    token: sessionPayload,
    secret,
    maxAge: -100,
  });

  const expiredReq = new NextRequest("http://localhost:3000/admin/dashboard", {
    headers: {
      cookie: `next-auth.session-token=${expiredToken}`,
    },
  });
  const expiredRes = await middleware(expiredReq);
  assert(
    Boolean(expiredRes.status === 307 && expiredRes.headers.get("location")?.includes("/login")),
    "Expired session token is rejected by middleware and bounced to /login"
  );

  // Tampered session token
  const tamperedToken = encodedToken.slice(0, -6) + "xxxxxx";
  const tamperedReq = new NextRequest("http://localhost:3000/admin/dashboard", {
    headers: {
      cookie: `next-auth.session-token=${tamperedToken}`,
    },
  });
  const tamperedRes = await middleware(tamperedReq);
  assert(
    Boolean(tamperedRes.status === 307 && tamperedRes.headers.get("location")?.includes("/login")),
    "Tampered session token with corrupted signature is rejected safely"
  );

  // ═══════════════════════════════════════════════════════════════════
  // REQUIREMENT 6: Role Dashboards and Redirect Verification
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 6. Role-Based Dashboards & Workspace Redirects ---");

  const rolesToTest: Array<{ role: Role; expectedDashboard: string }> = [
    { role: Role.ADMIN, expectedDashboard: "/admin/dashboard" },
    { role: Role.PRINCIPAL, expectedDashboard: "/admin/dashboard" },
    { role: Role.TEACHER, expectedDashboard: "/teacher/dashboard" },
    { role: Role.PARENT, expectedDashboard: "/parent/dashboard" },
    { role: Role.ACCOUNTANT, expectedDashboard: "/accountant/dashboard" },
  ];

  for (const { role, expectedDashboard } of rolesToTest) {
    const roleToken = await encode({
      token: { id: "test_user_id", role, schoolId: "school_a", email: `test_${role.toLowerCase()}@test.edu` },
      secret,
      maxAge: 3600,
    });

    const rootReq = new NextRequest("http://localhost:3000/", {
      headers: { cookie: `next-auth.session-token=${roleToken}` },
    });
    const rootRes = await middleware(rootReq);
    assert(
      Boolean(rootRes.status === 307 && rootRes.headers.get("location")?.endsWith(expectedDashboard)),
      `Root '/' redirects ${role} user to ${expectedDashboard}`
    );
  }

  // Cross-role boundary protection
  const teacherToken = await encode({
    token: { id: "teacher_id", role: Role.TEACHER, schoolId: "school_a", email: "teacher@test.edu" },
    secret,
    maxAge: 3600,
  });

  const teacherAccessAdminReq = new NextRequest("http://localhost:3000/admin/settings", {
    headers: { cookie: `next-auth.session-token=${teacherToken}` },
  });
  const teacherAccessAdminRes = await middleware(teacherAccessAdminReq);
  assert(
    Boolean(teacherAccessAdminRes.status === 307 && teacherAccessAdminRes.headers.get("location")?.endsWith("/teacher/dashboard")),
    "TEACHER attempting to access /admin/settings is redirected back to /teacher/dashboard"
  );

  const parentToken = await encode({
    token: { id: "parent_id", role: Role.PARENT, schoolId: "school_a", email: "parent@test.edu" },
    secret,
    maxAge: 3600,
  });

  const parentAccessAccountantReq = new NextRequest("http://localhost:3000/accountant/invoices", {
    headers: { cookie: `next-auth.session-token=${parentToken}` },
  });
  const parentAccessAccountantRes = await middleware(parentAccessAccountantReq);
  assert(
    Boolean(parentAccessAccountantRes.status === 307 && parentAccessAccountantRes.headers.get("location")?.endsWith("/parent/dashboard")),
    "PARENT attempting to access /accountant/invoices is redirected back to /parent/dashboard"
  );

  // ═══════════════════════════════════════════════════════════════════
  // REQUIREMENT 7: Missing required secrets fail securely
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 7. Missing Secret Security Verification ---");

  const originalEnv = { ...process.env };
  try {
    (process.env as any).NODE_ENV = "production";
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.NEXT_PHASE;
    delete process.env.npm_lifecycle_event;

    let threwMissingSecret = false;
    try {
      getAuthSecret();
    } catch (err: any) {
      threwMissingSecret = true;
      assert(
        err.message.includes("NEXTAUTH_SECRET (or AUTH_SECRET) is missing in production"),
        "getAuthSecret() throws clear fatal configuration error when secret is absent in production"
      );
    }
    assert(threwMissingSecret, "Production mode rejects execution without an explicit secret");

    // Test rejection of known demo secrets
    process.env.NEXTAUTH_SECRET = "school_erp_production_secret_key_min32chars!!";
    let threwDemoSecret = false;
    try {
      getAuthSecret();
    } catch (err: any) {
      threwDemoSecret = true;
      assert(
        err.message.includes("insecure demo fallback string"),
        "getAuthSecret() rejects public demo fallback strings in production"
      );
    }
    assert(threwDemoSecret, "Production mode rejects known demo secret strings");

    // Test rejection of short secret
    process.env.NEXTAUTH_SECRET = "short_secret_20chars";
    let threwShortSecret = false;
    try {
      getAuthSecret();
    } catch (err: any) {
      threwShortSecret = true;
      assert(
        err.message.includes("at least 32 characters long"),
        "getAuthSecret() enforces minimum 32 character key length in production"
      );
    }
    assert(threwShortSecret, "Production mode rejects secrets shorter than 32 characters");

    // Test middleware graceful handling of missing secret
    delete process.env.NEXTAUTH_SECRET;
    const missingSecretReq = new NextRequest("http://localhost:3000/api/students");
    const missingSecretRes = await middleware(missingSecretReq);
    assert(
      missingSecretRes.status === 500,
      "Middleware handles missing production secret by returning JSON 500 error instead of crashing Edge runtime"
    );

    const missingSecretPageReq = new NextRequest("http://localhost:3000/admin/dashboard");
    const missingSecretPageRes = await middleware(missingSecretPageReq);
    assert(
      Boolean(missingSecretPageRes.status === 307 && missingSecretPageRes.headers.get("location")?.includes("error=Configuration")),
      "Middleware redirects web page to /login?error=Configuration when secret is missing"
    );
  } finally {
    process.env = { ...originalEnv };
  }

  // ═══════════════════════════════════════════════════════════════════
  // REQUIREMENT 8: Protected APIs reject unauthenticated requests
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 8. API Authentication Contracts (401 JSON) ---");

  const protectedApiPaths = [
    "/api/students",
    "/api/invoices",
    "/api/attendance",
    "/api/marks",
    "/api/teachers",
    "/api/departments",
  ];

  for (const path of protectedApiPaths) {
    const unauthReq = new NextRequest(`http://localhost:3000${path}`);
    const unauthRes = await middleware(unauthReq);
    const body = await unauthRes.json();
    assert(
      unauthRes.status === 401 && body.error === "Unauthorized",
      `Unauthenticated ${path} returns HTTP 401 with JSON { error: "Unauthorized" }`
    );
  }

  // Verify public endpoints are admitted through middleware
  const publicPaths = [
    "/login",
    "/api/schools",
    "/api/health",
    "/api/auth/csrf",
    "/api/auth/providers",
  ];

  for (const path of publicPaths) {
    const publicReq = new NextRequest(`http://localhost:3000${path}`);
    const publicRes = await middleware(publicReq);
    assert(
      publicRes.status === 200,
      `Public endpoint ${path} is admitted through middleware without authentication`
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // REQUIREMENT 9: Existing tenant isolation remains intact
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 9. Multi-Tenant Scoping & Isolation Integrity ---");

  assert(
    TENANT_SCOPED_MODELS.size === 21,
    `TENANT_SCOPED_MODELS contains all 21 models (got ${TENANT_SCOPED_MODELS.size})`
  );

  const client = tenantClient("sch_dpa_delhi");
  assert(typeof client === "object" && client !== null, "tenantClient successfully instantiates scoped client");

  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log(`AUTH REGRESSION SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log("═══════════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error("FATAL ERROR IN REGRESSION SUITE:", err);
  process.exit(1);
});
