import { runSecurityTests } from "./security.test";
import { runValidationTests } from "./validation.test";

async function main() {
  console.log("=== Vidyora Phase 1B: Unit Test Suite ===");
  try {
    await runSecurityTests();
    await runValidationTests();
    console.log("\n>>> ALL UNIT TESTS PASSED SUCCESSFULLY <<<\n");
  } catch (err) {
    console.error("\n❌ Unit test failed:", err);
    process.exit(1);
  }
}

main();
