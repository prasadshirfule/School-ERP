import assert from "assert";
import { prisma } from "../../src/lib/database/prisma";
import { withTenantContext } from "../../src/lib/tenant";

export async function runRlsTests() {
  console.log("  Running PostgreSQL Row-Level Security (RLS) Tests...");

  const school1 = await prisma.school.findFirst({ where: { name: "Aryabhata Vidyapeeth" } });
  const school2 = await prisma.school.findFirst({ where: { name: "Saraswati Vidya Mandir" } });

  assert.ok(school1, "School 1 must exist");
  assert.ok(school2, "School 2 must exist");

  // 1. Transaction-scoped RLS context for School 1
  const school1RlsStudents = await withTenantContext(school1.id, async (tx) => {
    return tx.$queryRaw<Array<{ id: string; schoolId: string }>>`
      SELECT id, "schoolId" FROM "Student"
    `;
  });

  assert.ok(school1RlsStudents.length > 0, "School 1 RLS transaction must return rows");
  for (const row of school1RlsStudents) {
    assert.strictEqual(row.schoolId, school1.id, "All rows under School 1 RLS context must match School 1 ID");
  }

  // 2. Transaction-scoped RLS context for School 2
  const school2RlsStudents = await withTenantContext(school2.id, async (tx) => {
    return tx.$queryRaw<Array<{ id: string; schoolId: string }>>`
      SELECT id, "schoolId" FROM "Student"
    `;
  });

  assert.ok(school2RlsStudents.length > 0, "School 2 RLS transaction must return rows");
  for (const row of school2RlsStudents) {
    assert.strictEqual(row.schoolId, school2.id, "All rows under School 2 RLS context must match School 2 ID");
  }

  // 3. Fail-Closed: Query with a non-existent or blank schoolId context
  const emptyContextStudents = await withTenantContext("00000000-0000-0000-0000-000000000000", async (tx) => {
    return tx.$queryRaw<Array<{ id: string; schoolId: string }>>`
      SELECT id, "schoolId" FROM "Student"
    `;
  });

  assert.strictEqual(
    emptyContextStudents.length,
    0,
    "RLS query with non-matching tenant context must return exactly 0 rows"
  );

  // 4. Missing tenant context in withTenantContext must reject before DB execution
  await assert.rejects(
    () => withTenantContext("", async (tx) => tx.$queryRaw`SELECT 1`),
    /Missing or empty schoolId context/
  );

  console.log("    ✓ PostgreSQL RLS transaction-local scoping verified for School 1");
  console.log("    ✓ PostgreSQL RLS transaction-local scoping verified for School 2");
  console.log("    ✓ PostgreSQL RLS fails closed when tenant context does not match any school");
  console.log("    ✓ Missing tenant context in withTenantContext fails closed");
}
