/**
 * Canonical 7 Global Roles defined by the ForgeStudio RBAC model
 */
export const CANONICAL_GLOBAL_ROLES = [
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "SUPPORT_ADMIN",
  "DEVELOPER",
  "AI_CONTENT_ADMIN",
  "CUSTOMER",
  "TEAM_MEMBER",
] as const;

export type CanonicalGlobalRole = typeof CANONICAL_GLOBAL_ROLES[number];

/**
 * Legacy role aliases mapped to canonical roles
 */
export const ROLE_ALIASES: Record<string, CanonicalGlobalRole> = {
  ADMIN: "PLATFORM_ADMIN",
  USER: "CUSTOMER",
};

/**
 * Normalizes any role string or alias to a canonical global role.
 * Fails closed to "UNKNOWN" for invalid, missing, or unrecognized roles.
 */
export function normalizeRole(role?: string | null): CanonicalGlobalRole | "UNKNOWN" {
  if (!role || typeof role !== "string") return "UNKNOWN";
  const upper = role.trim().toUpperCase();
  if (ROLE_ALIASES[upper]) return ROLE_ALIASES[upper];
  if ((CANONICAL_GLOBAL_ROLES as readonly string[]).includes(upper)) {
    return upper as CanonicalGlobalRole;
  }
  return "UNKNOWN";
}

/**
 * Resolves the authorized default landing dashboard route for a given user role.
 * Fails closed to "/login" for unknown or unauthenticated roles.
 */
export function getDefaultDashboardPath(role?: string | null): string {
  const norm = normalizeRole(role);
  switch (norm) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "PLATFORM_ADMIN":
      return "/admin";
    case "CUSTOMER":
    case "DEVELOPER":
    case "TEAM_MEMBER":
    case "SUPPORT_ADMIN":
    case "AI_CONTENT_ADMIN":
      return "/dashboard";
    default:
      // Unknown, invalid, or unassigned role fails closed to login
      return "/login";
  }
}

/**
 * Evaluates whether a user's role is permitted according to an allowedRoles specification.
 * Automatically normalizes both userRole and allowedRoles and handles legacy aliases.
 * Fails closed (false) for unknown, null, or invalid roles.
 */
export function hasRoleAccess(
  userRole?: string | null,
  allowedRoles?: readonly (string | null | undefined)[]
): boolean {
  if (!userRole || !allowedRoles || allowedRoles.length === 0) return false;
  const normalizedUserRole = normalizeRole(userRole);
  if (normalizedUserRole === "UNKNOWN") return false;

  return allowedRoles.some((allowed) => {
    if (!allowed) return false;
    const normalizedAllowed = normalizeRole(allowed);
    if (normalizedAllowed !== "UNKNOWN" && normalizedAllowed === normalizedUserRole) {
      return true;
    }
    return allowed.trim().toUpperCase() === userRole.trim().toUpperCase();
  });
}

/**
 * Standard role collections for route access control
 */
export const ALL_AUTHENTICATED_ROLES: string[] = [
  "CUSTOMER",
  "USER",
  "DEVELOPER",
  "TEAM_MEMBER",
  "ADMIN",
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
  "SUPPORT_ADMIN",
  "AI_CONTENT_ADMIN",
];

export const STANDARD_DASHBOARD_ROLES: string[] = [
  "CUSTOMER",
  "USER",
  "DEVELOPER",
  "TEAM_MEMBER",
  "SUPPORT_ADMIN",
  "AI_CONTENT_ADMIN",
];

export const ADMIN_ROLES: string[] = [
  "ADMIN",
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
];
