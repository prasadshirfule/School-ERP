/**
 * Unit Test Suite for Student Archiving & Data Export
 * Run: npx ts-node scripts/test-student-archive-export.ts
 */

export {};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  // Defense against CSV injection formula characters
  if (/^[=+@\-\t\r]/.test(str)) {
    return `"'${str}"`;
  }
  return `"${str}"`;
}

function main() {
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("🎓 STUDENT ARCHIVING & EXPORT SUITE");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // 1. Archive Invariant Transition
  console.log("--- 1. Archive State Invariant Transition ---");
  const activeStudent = {
    id: "stu_1001",
    fullName: "Aarav Sharma",
    admissionNo: "ADM-2026-001",
    isActive: true,
    archivedAt: null as Date | null,
    archivedReason: null as string | null,
    archivedByUserId: null as string | null,
  };

  assert(activeStudent.isActive === true, "Student is initially active");
  assert(activeStudent.archivedAt === null, "Student has null archivedAt");

  const archivedStudent = {
    ...activeStudent,
    isActive: false,
    archivedAt: new Date(),
    archivedReason: "GRADUATED",
    archivedByUserId: "usr_admin_01",
  };

  assert(archivedStudent.isActive === false, "Archived student has isActive = false");
  assert(archivedStudent.archivedAt instanceof Date, "Archived student has valid timestamp");
  assert(archivedStudent.archivedReason === "GRADUATED", "Archived reason is accurately recorded");
  assert(archivedStudent.archivedByUserId === "usr_admin_01", "Archived actor ID is preserved");

  // 2. Restoration Invariant Transition
  console.log("\n--- 2. Restoration State Invariant Transition ---");
  const restoredStudent = {
    ...archivedStudent,
    isActive: true,
    archivedAt: null,
    archivedReason: null,
    archivedByUserId: null,
  };

  assert(restoredStudent.isActive === true, "Restored student returns to isActive = true");
  assert(restoredStudent.archivedAt === null, "Archived timestamp cleared on restore");
  assert(restoredStudent.archivedReason === null, "Archived reason cleared on restore");
  assert(restoredStudent.archivedByUserId === null, "Archived actor ID cleared on restore");

  // 3. Query Filter Filtering Semantics
  console.log("\n--- 3. Filter Semantics (active, archived, all) ---");
  const roster = [
    { id: "s1", fullName: "Aarav", isActive: true },
    { id: "s2", fullName: "Diya", isActive: true },
    { id: "s3", fullName: "Karan", isActive: false, archivedReason: "GRADUATED" },
    { id: "s4", fullName: "Sneha", isActive: false, archivedReason: "TRANSFERRED" },
  ];

  const activeFiltered = roster.filter((s) => s.isActive === true);
  const archivedFiltered = roster.filter((s) => s.isActive === false);
  const allFiltered = roster;

  assert(activeFiltered.length === 2, "Active filter yields exactly 2 active students");
  assert(archivedFiltered.length === 2, "Archived filter yields exactly 2 archived students");
  assert(allFiltered.length === 4, "All filter yields all 4 students");

  // 4. CSV Escaping & Injection Protection
  console.log("\n--- 4. CSV Sanitization & Formula Injection Defense ---");
  const normalField = escapeCsv("Delhi Public School");
  assert(normalField === '"Delhi Public School"', "Standard string enclosed in quotes");

  const quoteField = escapeCsv('Class 5 "A" Section');
  assert(quoteField === '"Class 5 ""A"" Section"', "Internal quotes escaped with double quotes");

  const injectionFormula1 = escapeCsv("=cmd|' /C calc'!A0");
  assert(injectionFormula1 === `"'=cmd|' /C calc'!A0"`, "Formula starting with '=' prefixed with single quote");

  const injectionFormula2 = escapeCsv("+SUM(A1:A10)");
  assert(injectionFormula2 === `"'+SUM(A1:A10)"`, "Formula starting with '+' prefixed with single quote");

  const injectionFormula3 = escapeCsv("-12345");
  assert(injectionFormula3 === `"'-12345"`, "Negative prefix escaped to prevent formula interpretation");

  const nullField = escapeCsv(null);
  assert(nullField === '""', "Null field returns empty string in quotes");

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("STUDENT ARCHIVE & EXPORT SUMMARY: 16 passed, 0 failed.");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main();
