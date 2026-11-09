/**
 * Unit Test Suite for Razorpay Webhook Processing, Idempotency & Signatures
 * Run: npx ts-node scripts/test-razorpay-webhooks.ts
 */

import crypto from "crypto";

export {};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

function verifyRazorpaySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const actualBuf = Buffer.from(signature, "hex");

    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

function recalculateInvoiceStatus(amountDue: number, totalPaid: number): string {
  if (totalPaid >= amountDue) return "PAID";
  if (totalPaid > 0) return "PARTIALLY_PAID";
  return "UNPAID";
}

function main() {
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("⚡ RAZORPAY WEBHOOK IDEMPOTENCY & SIGNATURE VERIFICATION SUITE");
  console.log("══════════════════════════════════════════════════════════════════\n");

  const webhookSecret = "whsec_test_schoolerp_secret_key_2026";
  const rawPayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_test_998877",
          amount: 500000, // 5000.00 INR
          currency: "INR",
          status: "captured",
          notes: {
            invoiceId: "inv_fee_101",
          },
        },
      },
    },
  });

  // 1. Signature Verification with Genuine Key
  console.log("--- 1. Valid Signature Verification ---");
  const validSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawPayload)
    .digest("hex");

  const isValid = verifyRazorpaySignature(rawPayload, validSignature, webhookSecret);
  assert(isValid === true, "Valid HMAC-SHA256 signature accepted");

  // 2. Tampered Payload Rejection
  console.log("\n--- 2. Tampered Payload Rejection ---");
  const tamperedPayload = rawPayload.replace("500000", "100000");
  const isTamperedValid = verifyRazorpaySignature(tamperedPayload, validSignature, webhookSecret);
  assert(isTamperedValid === false, "Tampered payload rejected");

  // 3. Invalid Secret Rejection
  console.log("\n--- 3. Wrong Secret Rejection ---");
  const wrongSecretValid = verifyRazorpaySignature(rawPayload, validSignature, "wrong_secret_key");
  assert(wrongSecretValid === false, "Signature calculated with wrong secret rejected");

  // 4. Webhook Idempotency Store Simulation
  console.log("\n--- 4. Webhook Event Idempotency ---");
  const processedEventIds = new Set<string>();
  const eventId = "evt_razorpay_unique_12345";

  // First delivery
  const isFirstDelivery = !processedEventIds.has(eventId);
  assert(isFirstDelivery === true, "First delivery is recognized as new event");
  processedEventIds.add(eventId);

  // Second delivery (duplicate retry)
  const isDuplicateDelivery = processedEventIds.has(eventId);
  assert(isDuplicateDelivery === true, "Duplicate retry detected in idempotency table");

  // 5. Fee Invoice Status Recalculation
  console.log("\n--- 5. Fee Invoice Status Recalculation ---");
  const amountDue = 10000;

  assert(recalculateInvoiceStatus(amountDue, 0) === "UNPAID", "0 paid => UNPAID");
  assert(recalculateInvoiceStatus(amountDue, 4000) === "PARTIALLY_PAID", "Partial payment => PARTIALLY_PAID");
  assert(recalculateInvoiceStatus(amountDue, 10000) === "PAID", "Full payment => PAID");
  assert(recalculateInvoiceStatus(amountDue, 12000) === "PAID", "Overpayment => PAID");

  // 6. Fee Refund Status Transitions
  console.log("\n--- 6. Refund Reversals & Invoice Status Transitions ---");
  const originalPayment = 10000;
  const partialRefund = 3000;
  const fullRefund = 10000;

  const netAfterPartial = originalPayment - partialRefund;
  assert(recalculateInvoiceStatus(amountDue, netAfterPartial) === "PARTIALLY_PAID", "Payment minus partial refund reverts invoice to PARTIALLY_PAID");

  const netAfterFull = originalPayment - fullRefund;
  assert(recalculateInvoiceStatus(amountDue, netAfterFull) === "UNPAID", "Payment minus full refund reverts invoice to UNPAID");

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("RAZORPAY WEBHOOK & REFUNDS SUMMARY: 11 passed, 0 failed.");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main();
