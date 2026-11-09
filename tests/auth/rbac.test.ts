import assert from "assert";
import { Role, ALL_ROLES, isValidRole } from "../../src/lib/authorization/roles";
import { Permission, hasPermission, getRolePermissions } from "../../src/lib/authorization/permissions";
import {
  requireRole,
  requirePermission,
  requireSchoolMembership,
  AuthenticatedUserContext,
  AuthorizationError,
} from "../../src/lib/authorization/session";
import { assertNotSoleAdmin, LifecycleError } from "../../src/lib/authorization/lifecycle";
import { prisma } from "../../src/lib/database/prisma";

export async function runRbacTests() {
  console.log("  Running Role-Based Access Control (RBAC) & Boundary Tests...");

  // 1. Role system integrity: Exactly 5 roles, no SUPER_ADMIN
  assert.strictEqual(ALL_ROLES.length, 5, "Vidyora must have exactly 5 roles");
  assert.strictEqual(isValidRole("ADMIN"), true);
  assert.strictEqual(isValidRole("PRINCIPAL"), true);
  assert.strictEqual(isValidRole("ACCOUNTANT"), true);
  assert.strictEqual(isValidRole("TEACHER"), true);
  assert.strictEqual(isValidRole("PARENT"), true);
  assert.strictEqual(isValidRole("SUPER_ADMIN"), false, "SUPER_ADMIN role must be strictly rejected");
  assert.strictEqual(isValidRole("CUSTOM_ROLE"), false);
  console.log("    ✓ Strict 5-role system verified (zero SUPER_ADMIN or custom roles)");

  // 2. Permission boundary checks across all 5 roles
  // ADMIN
  assert.strictEqual(hasPermission(Role.ADMIN, Permission.SCHOOL_MANAGE_SETTINGS), true);
  assert.strictEqual(hasPermission(Role.ADMIN, Permission.FEES_MANAGE_STRUCTURES), true);
  assert.strictEqual(hasPermission(Role.ADMIN, Permission.STUDENTS_CREATE), true);

  // PRINCIPAL
  assert.strictEqual(hasPermission(Role.PRINCIPAL, Permission.EXAMS_PUBLISH_RESULTS), true);
  assert.strictEqual(hasPermission(Role.PRINCIPAL, Permission.ATTENDANCE_VIEW_ALL), true);
  assert.strictEqual(
    hasPermission(Role.PRINCIPAL, Permission.FEES_MANAGE_STRUCTURES),
    false,
    "Principal cannot manage fee financial structures"
  );

  // ACCOUNTANT
  assert.strictEqual(hasPermission(Role.ACCOUNTANT, Permission.FEES_COLLECT_OFFLINE), true);
  assert.strictEqual(hasPermission(Role.ACCOUNTANT, Permission.FEES_MANAGE_STRUCTURES), true);
  assert.strictEqual(
    hasPermission(Role.ACCOUNTANT, Permission.ATTENDANCE_MARK),
    false,
    "Accountant cannot mark attendance"
  );
  assert.strictEqual(
    hasPermission(Role.ACCOUNTANT, Permission.EXAMS_ENTER_MARKS),
    false,
    "Accountant cannot enter exam marks"
  );

  // TEACHER
  assert.strictEqual(hasPermission(Role.TEACHER, Permission.ATTENDANCE_MARK), true);
  assert.strictEqual(hasPermission(Role.TEACHER, Permission.EXAMS_ENTER_MARKS), true);
  assert.strictEqual(
    hasPermission(Role.TEACHER, Permission.EXAMS_PUBLISH_RESULTS),
    false,
    "Teacher cannot publish examination results"
  );
  assert.strictEqual(
    hasPermission(Role.TEACHER, Permission.SCHOOL_MANAGE_SETTINGS),
    false,
    "Teacher cannot manage school settings"
  );

  // PARENT
  assert.strictEqual(hasPermission(Role.PARENT, Permission.STUDENTS_VIEW_CHILD), true);
  assert.strictEqual(hasPermission(Role.PARENT, Permission.ATTENDANCE_VIEW_CHILD), true);
  assert.strictEqual(
    hasPermission(Role.PARENT, Permission.STUDENTS_VIEW_ALL),
    false,
    "Parent cannot view all school students"
  );
  assert.strictEqual(
    hasPermission(Role.PARENT, Permission.STAFF_VIEW_ALL),
    false,
    "Parent cannot access internal staff directories"
  );
  console.log("    ✓ Multi-role permission matrix boundaries verified");

  // 3. Helper requireRole & requirePermission server-side checks
  const mockTeacher: AuthenticatedUserContext = {
    id: "user-teacher-1",
    email: "teacher@school.edu.in",
    name: "Teacher One",
    role: Role.TEACHER,
    schoolId: "school-1",
    sessionVersion: 1,
  };

  assert.doesNotThrow(() => requireRole(mockTeacher, [Role.TEACHER, Role.PRINCIPAL]));
  assert.throws(
    () => requireRole(mockTeacher, [Role.ADMIN]),
    AuthorizationError,
    "requireRole must fail closed on missing role"
  );

  assert.doesNotThrow(() => requirePermission(mockTeacher, Permission.ATTENDANCE_MARK));
  assert.throws(
    () => requirePermission(mockTeacher, Permission.FEES_MANAGE_STRUCTURES),
    AuthorizationError,
    "requirePermission must fail closed on missing permission"
  );
  console.log("    ✓ Server-side requireRole & requirePermission fail-closed verified");

  // 4. Cross-school membership enforcement
  await assert.doesNotReject(() => requireSchoolMembership(mockTeacher, "school-1"));
  await assert.rejects(
    () => requireSchoolMembership(mockTeacher, "school-2"),
    AuthorizationError,
    "Cross-school access must be rejected"
  );
  console.log("    ✓ Cross-school access enforcement verified");

  // 5. Last active Administrator protection test
  const testSchool = await prisma.school.findFirst({
    include: {
      memberships: {
        where: { role: Role.ADMIN, isActive: true },
      },
    },
  });
  assert.ok(testSchool, "Test school must exist");

  const soleAdminMembership = testSchool.memberships[0];
  if (testSchool.memberships.length === 1 && soleAdminMembership) {
    let soleAdminBlocked = false;
    try {
      await assertNotSoleAdmin(testSchool.id, soleAdminMembership.userId);
    } catch (err: unknown) {
      soleAdminBlocked = true;
      assert.ok(err instanceof LifecycleError);
      assert.match((err as Error).message, /sole active Administrator/i);
    }
    assert.strictEqual(soleAdminBlocked, true, "Sole admin suspension/removal must be blocked");
    console.log("    ✓ Protection of sole active school Administrator verified");
  }
}
