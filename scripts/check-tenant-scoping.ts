/**
 * Schema-drift guard for tenant scoping.
 *
 * Uses Prisma's DMMF (Data Model Meta Format) to introspect every model
 * in the schema. If any model has a `schoolId` field but is NOT in the
 * TENANT_SCOPED_MODELS set in lib/tenant.ts, this script exits with
 * code 1 — failing CI and blocking `npm run dev` via the `predev` hook.
 *
 * Run: npx ts-node scripts/check-tenant-scoping.ts
 */

import { Prisma } from "@prisma/client";
import { TENANT_SCOPED_MODELS } from "../src/lib/tenant";

function main() {
  const models = Prisma.dmmf.datamodel.models;
  const missing: string[] = [];

  for (const model of models) {
    const hasSchoolId = model.fields.some(
      (f: { name: string; kind: string }) => f.name === "schoolId" && f.kind === "scalar"
    );

    if (hasSchoolId && model.name !== "School" && !TENANT_SCOPED_MODELS.has(model.name)) {
      missing.push(model.name);
    }
  }

  if (missing.length > 0) {
    console.error(
      "\n❌ TENANT SCOPING DRIFT DETECTED!\n" +
        "The following models have a `schoolId` field but are NOT listed\n" +
        "in TENANT_SCOPED_MODELS (src/lib/tenant.ts):\n\n" +
        missing.map((m: string) => `  • ${m}`).join("\n") +
        "\n\n" +
        "Every model with schoolId MUST be added to TENANT_SCOPED_MODELS,\n" +
        "otherwise queries on that model will bypass tenant isolation.\n"
    );
    process.exit(1);
  }

  // Also check the reverse: models in the set that DON'T have schoolId
  const schemaModelNames = new Set(models.map((m: { name: string }) => m.name));
  const phantom: string[] = [];

  for (const name of TENANT_SCOPED_MODELS) {
    const model = models.find((m: { name: string }) => m.name === name);
    if (!model) {
      phantom.push(`${name} (not found in schema)`);
    } else {
      const hasSchoolId = model.fields.some(
        (f: { name: string; kind: string }) => f.name === "schoolId" && f.kind === "scalar"
      );
      if (!hasSchoolId) {
        phantom.push(`${name} (no schoolId field)`);
      }
    }
  }

  if (phantom.length > 0) {
    console.error(
      "\n❌ TENANT SCOPING MISMATCH!\n" +
        "The following entries in TENANT_SCOPED_MODELS don't match\n" +
        "any model with a schoolId field in the schema:\n\n" +
        phantom.map((m) => `  • ${m}`).join("\n") +
        "\n\n" +
        "Remove or fix these entries in src/lib/tenant.ts.\n"
    );
    process.exit(1);
  }

  console.log(
    `✅ Tenant scoping check passed — ${TENANT_SCOPED_MODELS.size} models verified.`
  );
}

main();
