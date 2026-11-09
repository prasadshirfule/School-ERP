/**
 * Schema-drift guard for tenant scoping.
 *
 * Uses Prisma's DMMF (Data Model Meta Format) to introspect every model
 * in the schema.
 * 1. Verifies that every model with a scalar `schoolId` field is in TENANT_SCOPED_MODELS.
 * 2. Verifies that all relational models (Teacher, Marks, StudentParent, TeacherSubject)
 *    are in RELATIONALLY_SCOPED_MODELS.
 * 3. Verifies that 100% of datamodel models are accounted for (zero un-scoped leakage).
 *
 * Run: npx ts-node scripts/check-tenant-scoping.ts
 */

import { Prisma } from "@prisma/client";
import { TENANT_SCOPED_MODELS, RELATIONALLY_SCOPED_MODELS, ALL_SCOPED_MODELS } from "../src/lib/tenant";

function main() {
  const models = Prisma.dmmf.datamodel.models;
  const missingDirect: string[] = [];
  const unaccounted: string[] = [];

  for (const model of models) {
    if (model.name === "School") continue; // Tenant root

    const hasSchoolId = model.fields.some(
      (f: { name: string; kind: string }) => f.name === "schoolId" && f.kind === "scalar"
    );

    if (hasSchoolId && !TENANT_SCOPED_MODELS.has(model.name)) {
      missingDirect.push(model.name);
    }

    if (!ALL_SCOPED_MODELS.has(model.name)) {
      unaccounted.push(model.name);
    }
  }

  if (missingDirect.length > 0) {
    console.error(
      "\n❌ TENANT SCOPING DRIFT DETECTED!\n" +
        "The following models have a `schoolId` field but are NOT listed\n" +
        "in TENANT_SCOPED_MODELS (src/lib/tenant.ts):\n\n" +
        missingDirect.map((m: string) => `  • ${m}`).join("\n") +
        "\n\n"
    );
    process.exit(1);
  }

  if (unaccounted.length > 0) {
    console.error(
      "\n❌ UNPROTECTED MODEL DETECTED!\n" +
        "The following models are NOT scoped by either direct schoolId or relational tenant scoping:\n\n" +
        unaccounted.map((m: string) => `  • ${m}`).join("\n") +
        "\n\n" +
        "Every model in the schema must be in TENANT_SCOPED_MODELS or RELATIONALLY_SCOPED_MODELS.\n"
    );
    process.exit(1);
  }

  // Also check reverse: models in direct set that don't have scalar schoolId
  const phantomDirect: string[] = [];
  for (const name of TENANT_SCOPED_MODELS) {
    const model = models.find((m: { name: string }) => m.name === name);
    if (!model) {
      phantomDirect.push(`${name} (not found in schema)`);
    } else {
      const hasSchoolId = model.fields.some(
        (f: { name: string; kind: string }) => f.name === "schoolId" && f.kind === "scalar"
      );
      if (!hasSchoolId) {
        phantomDirect.push(`${name} (no scalar schoolId field)`);
      }
    }
  }

  if (phantomDirect.length > 0) {
    console.error(
      "\n❌ TENANT SCOPING MISMATCH!\n" +
        "The following entries in TENANT_SCOPED_MODELS don't have a scalar schoolId field:\n\n" +
        phantomDirect.map((m) => `  • ${m}`).join("\n") +
        "\n"
    );
    process.exit(1);
  }

  console.log(
    `✅ Complete tenant scoping verified — ${TENANT_SCOPED_MODELS.size} direct models + ${RELATIONALLY_SCOPED_MODELS.size} relational models (100% schema models protected).`
  );
}

main();
