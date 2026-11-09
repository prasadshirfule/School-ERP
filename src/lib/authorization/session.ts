import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { prisma } from "../database/prisma";
import { getTenantPrisma } from "../tenant";
import { Role } from "./roles";
import { Permission, hasPermission } from "./permissions";

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(`[UNAUTHORIZED] ${message}`);
    this.name = "AuthorizationError";
  }
}

export interface AuthenticatedUserContext {
  id: string;
  email: string;
  name: string;
  role: Role;
  schoolId: string;
  sessionVersion: number;
}

/**
 * 1. Require a fully authenticated user with an active, unrevoked session.
 * Always verifies user state and sessionVersion against the database.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUserContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthorizationError("Authentication required: Please sign in to access this resource.");
  }

  // Validate state against database
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
      suspendedAt: true,
      sessionVersion: true,
      memberships: {
        where: { isActive: true },
        select: { schoolId: true, role: true, isPrimary: true },
      },
    },
  });

  if (!dbUser || !dbUser.isActive || dbUser.suspendedAt) {
    throw new AuthorizationError("Account is inactive or suspended.");
  }

  if (dbUser.sessionVersion !== session.user.sessionVersion) {
    throw new AuthorizationError("Session has been revoked. Please sign in again.");
  }

  const activeMembership =
    dbUser.memberships.find((m) => m.schoolId === session.user.schoolId) ||
    dbUser.memberships.find((m) => m.isPrimary) ||
    dbUser.memberships[0];

  if (!activeMembership) {
    throw new AuthorizationError("No active school membership found for this account.");
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.fullName,
    role: activeMembership.role as Role,
    schoolId: activeMembership.schoolId,
    sessionVersion: dbUser.sessionVersion,
  };
}

/**
 * 2. Enforces that the authenticated user belongs to the specified school.
 */
export async function requireSchoolMembership(
  user: AuthenticatedUserContext,
  schoolId: string
): Promise<void> {
  if (user.schoolId !== schoolId) {
    throw new AuthorizationError(
      `Cross-school access blocked: You are not authorized to access institution '${schoolId}'.`
    );
  }
}

/**
 * 3. Enforces that the user possesses one of the permitted roles.
 */
export function requireRole(
  user: AuthenticatedUserContext,
  allowedRoles: Role[]
): void {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError(
      `Access denied: Required role [${allowedRoles.join(", ")}], but user holds role '${user.role}'.`
    );
  }
}

/**
 * 4. Enforces that the user holds a specific granular permission.
 */
export function requirePermission(
  user: AuthenticatedUserContext,
  permission: Permission
): void {
  if (!hasPermission(user.role, permission)) {
    throw new AuthorizationError(
      `Permission denied: User role '${user.role}' lacks permission '${permission}'.`
    );
  }
}

/**
 * 5. Returns a tenant-scoped Prisma client derived strictly from trusted server session.
 * Never allows client-supplied or URL-supplied school IDs to override the tenant boundary.
 */
export async function requireTenantContext(): Promise<{
  user: AuthenticatedUserContext;
  tenantDb: ReturnType<typeof getTenantPrisma>;
}> {
  const user = await requireAuthenticatedUser();
  const tenantDb = getTenantPrisma(user.schoolId);
  return { user, tenantDb };
}
