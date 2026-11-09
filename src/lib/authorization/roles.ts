/**
 * Vidyora Role-Based Access Control Foundation
 * 
 * STRICT ARCHITECTURAL RULE:
 * Only 5 school roles are permitted in Vidyora:
 * - ADMIN: Full school administrative control (admissions, academic years, fee structures, settings)
 * - PRINCIPAL: Academic and administrative leadership (approvals, results, staff management, rosters)
 * - ACCOUNTANT: Financial operations (offline fee collection, payment receipts, fee statements)
 * - TEACHER: Academic delivery (attendance marking, marks entry, timetable view)
 * - PARENT: Guardian portal (viewing authorized student attendance, report cards, fee receipts)
 * 
 * There is NO school-level SUPER_ADMIN role.
 */

export const Role = {
  ADMIN: "ADMIN",
  PRINCIPAL: "PRINCIPAL",
  ACCOUNTANT: "ACCOUNTANT",
  TEACHER: "TEACHER",
  PARENT: "PARENT",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ALL_ROLES: readonly Role[] = [
  Role.ADMIN,
  Role.PRINCIPAL,
  Role.ACCOUNTANT,
  Role.TEACHER,
  Role.PARENT,
] as const;

export function isValidRole(role: string): role is Role {
  return ALL_ROLES.includes(role as Role);
}
