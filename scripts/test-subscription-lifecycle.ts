/**
 * Unit Test Suite for SaaS Subscription & Trial Lifecycle
 * Run: npx ts-node scripts/test-subscription-lifecycle.ts
 */

import {
  DEFAULT_PLANS,
  assertSubscriptionAllowsWrite,
} from "../src/lib/subscription";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function main() {
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("💳 SAAS SUBSCRIPTION & TRIAL LIFECYCLE TEST SUITE");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // 1. Default Plans Definition Verification
  console.log("--- 1. Default Plans Integrity ---");
  assert(DEFAULT_PLANS.length === 3, "Exactly 3 standard SaaS plans defined (Starter, Pro, Enterprise)");
  
  const starter = DEFAULT_PLANS.find((p) => p.code === "STARTER");
  const pro = DEFAULT_PLANS.find((p) => p.code === "PROFESSIONAL");
  const enterprise = DEFAULT_PLANS.find((p) => p.code === "ENTERPRISE");

  assert(Boolean(starter && pro && enterprise), "All 3 tier codes exist");
  assert(starter!.maxStudents === 300, "Starter plan capped at 300 students");
  assert(pro!.maxStudents === 1000, "Professional plan capped at 1000 students");
  assert(enterprise!.maxStudents === null, "Enterprise plan supports unlimited students");
  assert(starter!.pricePerStudentMonth > 0, "Starter plan has valid price per student");
  assert(pro!.pricePerStudentYear < pro!.pricePerStudentMonth * 12, "Professional plan annual price includes discount");

  // 2. Active Trial Subscription Allows Write
  console.log("\n--- 2. Active Trial Allows Writes ---");
  const activeTrialSub = {
    status: "TRIALING",
    trialEndsAt: new Date(Date.now() + 15 * 86400000), // 15 days in future
    currentPeriodEnd: new Date(Date.now() + 15 * 86400000),
  };

  let writeBlocked = false;
  try {
    await assertSubscriptionAllowsWrite(activeTrialSub);
  } catch {
    writeBlocked = true;
  }
  assert(!writeBlocked, "Active trial subscription allows write operations");

  // 3. Active Paid Subscription Allows Write
  console.log("\n--- 3. Active Paid Subscription Allows Writes ---");
  const activePaidSub = {
    status: "ACTIVE",
    trialEndsAt: new Date(Date.now() - 30 * 86400000), // trial was 30 days ago
    currentPeriodEnd: new Date(Date.now() + 180 * 86400000), // paid until 6 months later
  };

  writeBlocked = false;
  try {
    await assertSubscriptionAllowsWrite(activePaidSub);
  } catch {
    writeBlocked = true;
  }
  assert(!writeBlocked, "Active paid subscription allows write operations");

  // 4. Expired Trial Blocks Write
  console.log("\n--- 4. Expired Trial Read-Only Enforcement ---");
  const expiredTrialSub = {
    status: "TRIALING",
    trialEndsAt: new Date(Date.now() - 2 * 86400000), // expired 2 days ago
    currentPeriodEnd: new Date(Date.now() - 2 * 86400000),
  };

  let errorThrown = false;
  let errorCode = "";
  try {
    await assertSubscriptionAllowsWrite(expiredTrialSub);
  } catch (err: any) {
    errorThrown = true;
    errorCode = err.code || err.message;
  }
  assert(errorThrown, "Expired trial subscription strictly throws error on write");
  assert(errorCode === "SUBSCRIPTION_EXPIRED", "Error code is SUBSCRIPTION_EXPIRED");

  // 5. Explicitly EXPIRED Status Blocks Write
  console.log("\n--- 5. Explicit EXPIRED Status Read-Only Enforcement ---");
  const explicitlyExpiredSub = {
    status: "EXPIRED",
    trialEndsAt: new Date(Date.now() - 10 * 86400000),
    currentPeriodEnd: new Date(Date.now() - 10 * 86400000),
  };

  errorThrown = false;
  try {
    await assertSubscriptionAllowsWrite(explicitlyExpiredSub);
  } catch (err: any) {
    errorThrown = true;
    errorCode = err.code || err.message;
  }
  assert(errorThrown, "Explicitly EXPIRED subscription blocks write");
  assert(errorCode === "SUBSCRIPTION_EXPIRED", "Error code is SUBSCRIPTION_EXPIRED");

  // 6. Suspended Subscription Blocks Write
  console.log("\n--- 6. Suspended Status Blocks Write ---");
  const suspendedSub = {
    status: "SUSPENDED",
    trialEndsAt: new Date(Date.now() + 10 * 86400000),
    currentPeriodEnd: new Date(Date.now() + 10 * 86400000),
  };

  errorThrown = false;
  try {
    await assertSubscriptionAllowsWrite(suspendedSub);
  } catch (err: any) {
    errorThrown = true;
    errorCode = err.code || err.message;
  }
  assert(errorThrown, "Suspended subscription blocks write");

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("SUBSCRIPTION LIFECYCLE SUMMARY: 13 passed, 0 failed.");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
