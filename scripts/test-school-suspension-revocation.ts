/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * School ERP — Existing JWT Session Revocation & School Suspension Regression Suite
 *
 * Verifies Part B requirements:
 * 1. An existing authenticated session of a user whose school is ACTIVE can access protected APIs.
 * 2. When the Super Admin suspends the school, that EXISTING session is IMMEDIATELY blocked.
 * 3. The server checks school status server-side on every protected request.
 * 4. Client-side claims cannot bypass suspension.
 * 5. Reinstating the school restores immediate access without requiring credential re-issuance.
 *
 * Run: npx ts-node scripts/test-school-suspension-revocation.ts
 */

import { validateActiveSchoolSession } from "../src/lib/utils";
import prisma from "../src/lib/prisma";

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

// Mock active session representing an already logged-in user with a valid JWT
const mockLiveSchool = {
  id: "sch_target_101",
  name: "Greenfield Academy",
  isActive: true,
  status: "APPROVED",
};

const mockExistingSession = {
  user: {
    id: "usr_active_teacher_1",
    email: "teacher@greenfield.edu",
    role: "TEACHER",
    schoolId: "sch_target_101",
    schoolName: "Greenfield Academy",
  },
};

// Mock prisma.school.findUnique
(prisma.school as any).findUnique = async ({ where }: any) => {
  if (where.id === mockLiveSchool.id) {
    return {
      isActive: mockLiveSchool.isActive,
      status: mockLiveSchool.status,
    };
  }
  return null;
};

async function runSuspensionRevocationSuite() {
  console.log("══════════════════════════════════════════════════════════════════════════");
  console.log("🔒 SCHOOL ERP — ACTIVE JWT SESSION SUSPENSION REVOCATION TEST SUITE");
  console.log("══════════════════════════════════════════════════════════════════════════\n");

  console.log("--- 1. Pre-Suspension: Active Session Access ---");
  // 1.1 When school is APPROVED and isActive
  mockLiveSchool.isActive = true;
  mockLiveSchool.status = "APPROVED";

  const preSession = await validateActiveSchoolSession(mockExistingSession);
  assert(
    preSession !== null && preSession.user?.schoolId === "sch_target_101",
    "Active session of an approved school successfully validates through validateActiveSchoolSession()"
  );

  console.log("\n--- 2. Instant Revocation: Super Admin Suspends School ---");
  // 2.1 Super Admin suspends the school
  mockLiveSchool.isActive = false;
  mockLiveSchool.status = "SUSPENDED";

  // 2.2 Same existing user sends request with their existing valid JWT token
  const suspendedSession = await validateActiveSchoolSession(mockExistingSession);
  assert(
    suspendedSession === null,
    "Existing active JWT session is IMMEDIATELY REVOKED when school is SUSPENDED (returns null -> 401)"
  );

  console.log("\n--- 3. Client Bypass Resistance ---");
  // 3.1 Client attempts to tamper with session claims or claim active status
  const tamperedSessionPayload = {
    ...mockExistingSession,
    user: {
      ...mockExistingSession.user,
      schoolStatus: "APPROVED", // client-side spoof attempt
      isActive: true,
    },
  };
  const tamperedSession = await validateActiveSchoolSession(tamperedSessionPayload);
  assert(
    tamperedSession === null,
    "Client-side status claim is ignored; server-side database status check strictly blocks access"
  );

  console.log("\n--- 4. Reinstatement: Super Admin Restores School ---");
  // 4.1 Super Admin reinstates the school
  mockLiveSchool.isActive = true;
  mockLiveSchool.status = "APPROVED";

  const reinstatedSession = await validateActiveSchoolSession(mockExistingSession);
  assert(
    reinstatedSession !== null && reinstatedSession.user?.schoolId === "sch_target_101",
    "Reinstated school session immediately regains access without requiring re-login"
  );

  console.log("\n══════════════════════════════════════════════════════════════════════════");
  console.log(`SUSPENSION REVOCATION TEST SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log("══════════════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSuspensionRevocationSuite().catch((err) => {
  console.error("Suspension revocation suite crashed:", err);
  process.exit(1);
});
