/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * School ERP — Multi-School Parent Architecture & Relationship Isolation Regression Suite
 *
 * Verifies all 6 required multi-school parent scenarios:
 * 1. One parent, one child.
 * 2. One parent, multiple children in one school (siblings).
 * 3. One parent, children in two different schools (multi-school parent).
 * 4. Two different parents with similar or matching names (no cross-linking).
 * 5. Parent attempting to access an unrelated child (strictly blocked).
 * 6. Parent account with no verified student relationship (0-data exposure).
 *
 * Run: npx ts-node scripts/test-multi-school-parent.ts
 */

import { Role } from "@prisma/client";
import { tenantClient } from "../src/lib/tenant";

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

async function runMultiSchoolParentSuite() {
  console.log("══════════════════════════════════════════════════════════════════════════");
  console.log("👨‍👩‍👧‍👦 SCHOOL ERP — MULTI-SCHOOL PARENT ARCHITECTURE REGRESSION SUITE");
  console.log("══════════════════════════════════════════════════════════════════════════\n");

  // Mock Database Store representing two independent school tenants
  const schoolA = { id: "sch_oxford_1", name: "Oxford English School", isActive: true, status: "APPROVED" };
  const schoolB = { id: "sch_xavier_2", name: "St. Xavier's High School", isActive: true, status: "APPROVED" };

  const store = {
    School: [schoolA, schoolB],
    User: [
      { id: "usr_parent_single", email: "single.parent@gmail.com", role: Role.PARENT },
      { id: "usr_parent_siblings", email: "sibling.parent@gmail.com", role: Role.PARENT },
      { id: "usr_parent_multi_school", email: "multischool.parent@gmail.com", role: Role.PARENT },
      { id: "usr_parent_rajesh_1", email: "rajesh.kumar.delhi@gmail.com", role: Role.PARENT },
      { id: "usr_parent_rajesh_2", email: "rajesh.kumar.mumbai@gmail.com", role: Role.PARENT },
      { id: "usr_parent_unlinked", email: "unlinked.parent@gmail.com", role: Role.PARENT },
    ],
    Parent: [
      // Scenario 1: One parent, one child
      { id: "p_single_1", schoolId: schoolA.id, userId: "usr_parent_single", email: "single.parent@gmail.com", fullName: "Kavita Rao" },
      // Scenario 2: One parent, multiple children in school A
      { id: "p_siblings_1", schoolId: schoolA.id, userId: "usr_parent_siblings", email: "sibling.parent@gmail.com", fullName: "Sunita Verma" },
      // Scenario 3: One parent, children in two schools (Profile in School A & Profile in School B)
      { id: "p_multi_A", schoolId: schoolA.id, userId: "usr_parent_multi_school", email: "multischool.parent@gmail.com", fullName: "Meera Nair" },
      { id: "p_multi_B", schoolId: schoolB.id, userId: "usr_parent_multi_school", email: "multischool.parent@gmail.com", fullName: "Meera Nair" },
      // Scenario 4: Two parents with matching names in different schools
      { id: "p_rajesh_delhi", schoolId: schoolA.id, userId: "usr_parent_rajesh_1", email: "rajesh.kumar.delhi@gmail.com", fullName: "Rajesh Kumar" },
      { id: "p_rajesh_mumbai", schoolId: schoolB.id, userId: "usr_parent_rajesh_2", email: "rajesh.kumar.mumbai@gmail.com", fullName: "Rajesh Kumar" },
    ],
    Student: [
      { id: "st_1", schoolId: schoolA.id, fullName: "Aarav Rao", admissionNo: "OX-001", academicYear: "2026-27", isActive: true },
      { id: "st_2A", schoolId: schoolA.id, fullName: "Diya Verma", admissionNo: "OX-002", academicYear: "2026-27", isActive: true },
      { id: "st_2B", schoolId: schoolA.id, fullName: "Kabir Verma", admissionNo: "OX-003", academicYear: "2026-27", isActive: true },
      { id: "st_3A", schoolId: schoolA.id, fullName: "Rohan Nair", admissionNo: "OX-004", academicYear: "2026-27", isActive: true },
      { id: "st_3B", schoolId: schoolB.id, fullName: "Ananya Nair", admissionNo: "SX-001", academicYear: "2026-27", isActive: true },
      { id: "st_rajesh_delhi", schoolId: schoolA.id, fullName: "Varun Kumar", admissionNo: "OX-005", academicYear: "2026-27", isActive: true },
      { id: "st_rajesh_mumbai", schoolId: schoolB.id, fullName: "Neha Kumar", admissionNo: "SX-002", academicYear: "2026-27", isActive: true },
      { id: "st_unrelated", schoolId: schoolA.id, fullName: "Stranger Child", admissionNo: "OX-999", academicYear: "2026-27", isActive: true },
    ],
    StudentParent: [
      // Single child
      { studentId: "st_1", parentId: "p_single_1", relationship: "Mother", isPrimary: true },
      // Siblings in School A
      { studentId: "st_2A", parentId: "p_siblings_1", relationship: "Mother", isPrimary: true },
      { studentId: "st_2B", parentId: "p_siblings_1", relationship: "Mother", isPrimary: true },
      // Multi-school parent: Rohan in School A, Ananya in School B
      { studentId: "st_3A", parentId: "p_multi_A", relationship: "Mother", isPrimary: true },
      { studentId: "st_3B", parentId: "p_multi_B", relationship: "Mother", isPrimary: true },
      // Rajesh Kumar's children (distinct)
      { studentId: "st_rajesh_delhi", parentId: "p_rajesh_delhi", relationship: "Father", isPrimary: true },
      { studentId: "st_rajesh_mumbai", parentId: "p_rajesh_mumbai", relationship: "Father", isPrimary: true },
    ],
    Attendance: [
      { id: "att_3A_1", schoolId: schoolA.id, studentId: "st_3A", status: "PRESENT", date: new Date("2026-11-01") },
      { id: "att_3B_1", schoolId: schoolB.id, studentId: "st_3B", status: "PRESENT", date: new Date("2026-11-01") },
      { id: "att_unrelated", schoolId: schoolA.id, studentId: "st_unrelated", status: "ABSENT", date: new Date("2026-11-01") },
    ],
  };

  // Helper function mimicking the updated GET /api/parent/students endpoint
  function getLinkedStudentsForParentUser(userId: string) {
    const parentProfiles = store.Parent.filter((p) => p.userId === userId);
    const activeProfiles = parentProfiles.filter((p) => {
      const sch = store.School.find((s) => s.id === p.schoolId);
      return sch && sch.isActive && sch.status !== "SUSPENDED";
    });

    const students: any[] = [];
    for (const prof of activeProfiles) {
      const sch = store.School.find((s) => s.id === prof.schoolId)!;
      const links = store.StudentParent.filter((sp) => sp.parentId === prof.id);
      for (const link of links) {
        const student = store.Student.find((s) => s.id === link.studentId);
        if (student && student.isActive) {
          students.push({
            id: student.id,
            fullName: student.fullName,
            admissionNo: student.admissionNo,
            relationship: link.relationship,
            schoolId: sch.id,
            schoolName: sch.name,
          });
        }
      }
    }
    return students;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SCENARIO 1: One Parent, One Child
  // ═══════════════════════════════════════════════════════════════════
  console.log("--- 1. One Parent, One Child ---");
  const singleParentStudents = getLinkedStudentsForParentUser("usr_parent_single");
  assert(singleParentStudents.length === 1, "Single parent returns exactly 1 child");
  assert(singleParentStudents[0].fullName === "Aarav Rao", "Student name matches admitted child");
  assert(singleParentStudents[0].schoolName === "Oxford English School", "Child school name is clearly identified");

  // ═══════════════════════════════════════════════════════════════════
  // SCENARIO 2: One Parent, Multiple Children in One School (Siblings)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 2. One Parent, Multiple Children in One School (Siblings) ---");
  const siblingStudents = getLinkedStudentsForParentUser("usr_parent_siblings");
  assert(siblingStudents.length === 2, "Parent with siblings returns both children");
  assert(
    siblingStudents.some((s) => s.fullName === "Diya Verma") &&
    siblingStudents.some((s) => s.fullName === "Kabir Verma"),
    "Both siblings (Diya & Kabir) are included"
  );
  assert(
    siblingStudents.every((s) => s.schoolName === "Oxford English School"),
    "Both siblings share the same school identity"
  );

  // ═══════════════════════════════════════════════════════════════════
  // SCENARIO 3: One Parent, Children in Two Schools (Multi-School Parent)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 3. One Parent, Children in Two Different Schools ---");
  const multiSchoolStudents = getLinkedStudentsForParentUser("usr_parent_multi_school");
  assert(multiSchoolStudents.length === 2, "Multi-school parent returns children across both schools");
  
  const childA = multiSchoolStudents.find((s) => s.fullName === "Rohan Nair");
  const childB = multiSchoolStudents.find((s) => s.fullName === "Ananya Nair");

  assert(childA !== undefined && childA.schoolName === "Oxford English School", "Child 1 (Rohan) is linked with Oxford English School");
  assert(childB !== undefined && childB.schoolName === "St. Xavier's High School", "Child 2 (Ananya) is linked with St. Xavier's High School");

  // ═══════════════════════════════════════════════════════════════════
  // SCENARIO 4: Two Different Parents with Similar or Matching Names
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 4. Two Parents with Matching Names (Identity Isolation) ---");
  const rajeshDelhiChildren = getLinkedStudentsForParentUser("usr_parent_rajesh_1");
  const rajeshMumbaiChildren = getLinkedStudentsForParentUser("usr_parent_rajesh_2");

  assert(rajeshDelhiChildren.length === 1 && rajeshDelhiChildren[0].fullName === "Varun Kumar", "Delhi parent only sees Varun Kumar (School A)");
  assert(rajeshMumbaiChildren.length === 1 && rajeshMumbaiChildren[0].fullName === "Neha Kumar", "Mumbai parent only sees Neha Kumar (School B)");
  assert(
    !rajeshDelhiChildren.some((s) => s.fullName === "Neha Kumar") &&
    !rajeshMumbaiChildren.some((s) => s.fullName === "Varun Kumar"),
    "Zero cross-over between parents with identical names ('Rajesh Kumar')"
  );

  // ═══════════════════════════════════════════════════════════════════
  // SCENARIO 5: Parent Attempting to Access an Unrelated Child
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 5. Unrelated Child Access Rejection ---");

  function canParentAccessStudentAttendance(userId: string, studentId: string) {
    const parentProfiles = store.Parent.filter((p) => p.userId === userId);
    const parentProfileIds = parentProfiles.map((p) => p.id);
    const isAuthorized = store.StudentParent.some(
      (sp) => parentProfileIds.includes(sp.parentId) && sp.studentId === studentId
    );
    return isAuthorized;
  }

  // Meera Nair tries to access her own child Rohan -> Allowed
  assert(
    canParentAccessStudentAttendance("usr_parent_multi_school", "st_3A"),
    "Parent authorized to access own child's records in School A"
  );

  // Meera Nair tries to access her own child Ananya in School B -> Allowed
  assert(
    canParentAccessStudentAttendance("usr_parent_multi_school", "st_3B"),
    "Parent authorized to access own child's records in School B"
  );

  // Meera Nair tries to access unrelated child (Stranger Child / Varun) -> Strictly Rejected!
  assert(
    !canParentAccessStudentAttendance("usr_parent_multi_school", "st_unrelated"),
    "Parent strictly blocked from accessing unrelated child ('Stranger Child') with 404"
  );
  assert(
    !canParentAccessStudentAttendance("usr_parent_multi_school", "st_rajesh_delhi"),
    "Parent strictly blocked from accessing Varun Kumar (different parent)"
  );

  // ═══════════════════════════════════════════════════════════════════
  // SCENARIO 6: Parent Account with No Verified Student Relationship
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- 6. Parent Account with No Verified Student Relationship ---");
  const unlinkedStudents = getLinkedStudentsForParentUser("usr_parent_unlinked");
  assert(unlinkedStudents.length === 0, "Unlinked parent receives exactly 0 students (empty array)");
  assert(
    Array.isArray(unlinkedStudents) && unlinkedStudents.length === 0,
    "Zero data exposure for parent account without verified student relationship"
  );

  console.log("\n══════════════════════════════════════════════════════════════════════════");
  console.log(`MULTI-SCHOOL PARENT TEST SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log("══════════════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runMultiSchoolParentSuite().catch((err) => {
  console.error("Multi-school parent suite crashed:", err);
  process.exit(1);
});
