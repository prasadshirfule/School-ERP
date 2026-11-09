import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { runTenantIsolationTests } from "./tenant-isolation.test";
import { runRlsTests } from "./rls.test";
import { prisma } from "../../src/lib/database/prisma";

async function main() {
  console.log("=== Vidyora Phase 1B: Multi-Tenant & RLS Test Suite ===");
  try {
    await runTenantIsolationTests();
    await runRlsTests();
    console.log("\n>>> ALL TENANT & RLS TESTS PASSED SUCCESSFULLY <<<\n");
  } catch (err) {
    console.error("\n❌ Tenant test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
