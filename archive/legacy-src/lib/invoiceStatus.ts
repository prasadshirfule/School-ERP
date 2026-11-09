import { Prisma, InvoiceStatus } from "@prisma/client";

/**
 * Shared Decimal-based invoice status calculator.
 * Used by both payments processing (POST /api/payments) and student admission enrollment (POST /api/students).
 *
 * Status rules:
 * - totalPaid >= amountDue -> PAID
 * - totalPaid > 0          -> PARTIALLY_PAID
 * - otherwise              -> UNPAID
 */
export function calculateInvoiceStatus(
  amountDue: Prisma.Decimal,
  totalPaid: Prisma.Decimal
): InvoiceStatus {
  if (totalPaid.greaterThanOrEqualTo(amountDue)) {
    return "PAID";
  } else if (totalPaid.greaterThan(0)) {
    return "PARTIALLY_PAID";
  } else {
    return "UNPAID";
  }
}
