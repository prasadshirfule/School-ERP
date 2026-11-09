import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { runOtpTests } from "./otp.test";
import { runLoginTests } from "./login.test";
import { runRbacTests } from "./rbac.test";
import { runRegistrationTests } from "./registration.test";
import { runParentTests } from "./parent.test";
import { prisma } from "../../src/lib/database/prisma";

async function main() {
  console.log("=== Vidyora Phase 2: Authentication, Authorization & User Security Test Suite ===");
  try {
    await runOtpTests();
    await runLoginTests();
    await runRbacTests();
    await runRegistrationTests();
    await runParentTests();
    console.log("\n>>> ALL PHASE 2 AUTHENTICATION & SECURITY TESTS PASSED SUCCESSFULLY <<<\n");
  } catch (err) {
    console.error("\n❌ Phase 2 Auth test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
