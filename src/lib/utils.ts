import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

/**
 * Standard 400 Bad Request response
 */
export function badRequest(message = "Bad request", details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

/**
 * Standard 401 Unauthorized response
 */
export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Standard 403 Forbidden response
 */
export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Standard 404 Not Found response
 */
export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Standard 500 Internal Server Error response
 */
export function internalError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Check if a session has one of the allowed roles
 */
export function hasRole(session: { user: { role: Role } } | null | undefined, allowedRoles: readonly Role[]): boolean {
  if (!session?.user?.role) return false;
  return allowedRoles.includes(session.user.role);
}

/**
 * Format Indian Currency (INR)
 */
export function formatCurrencyINR(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(num);
}

/**
 * Format Date to Indian standard (DD/MM/YYYY)
 */
export function formatDateIN(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Concatenate class names conditionally
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
