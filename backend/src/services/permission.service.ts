import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";

const db = prisma as any;

// =============================================================================
// CANONICAL 7 GLOBAL ROLES SPECIFICATION & HIERARCHY
// =============================================================================

export const CANONICAL_GLOBAL_ROLES = [
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "SUPPORT_ADMIN",
  "DEVELOPER",
  "AI_CONTENT_ADMIN",
  "CUSTOMER",
  "TEAM_MEMBER",
] as const;

export type GlobalRole = typeof CANONICAL_GLOBAL_ROLES[number];

export const GLOBAL_ROLE_ALIASES: Record<string, GlobalRole> = {
  ADMIN: "PLATFORM_ADMIN",
  USER: "CUSTOMER",
};

export const GLOBAL_ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 70,
  PLATFORM_ADMIN: 60,
  ADMIN: 60,
  SUPPORT_ADMIN: 50,
  DEVELOPER: 40,
  AI_CONTENT_ADMIN: 30,
  CUSTOMER: 20,
  USER: 20,
  TEAM_MEMBER: 10,
};

export function normalizeGlobalRole(role: string): GlobalRole {
  const upper = String(role || "").toUpperCase();
  if (GLOBAL_ROLE_ALIASES[upper]) return GLOBAL_ROLE_ALIASES[upper];
  if (CANONICAL_GLOBAL_ROLES.includes(upper as any)) return upper as GlobalRole;
  return "CUSTOMER";
}

export function canAssignGlobalRole(
  actorRole: string,
  targetCurrentRole: string,
  desiredRole: string,
  isTargetLastSuperAdmin = false
): { allowed: boolean; reason?: string } {
  const actorNorm = normalizeGlobalRole(actorRole);
  const targetNorm = normalizeGlobalRole(targetCurrentRole);
  const desiredNorm = normalizeGlobalRole(desiredRole);

  const actorWeight = GLOBAL_ROLE_HIERARCHY[actorNorm] || 0;
  const targetWeight = GLOBAL_ROLE_HIERARCHY[targetNorm] || 0;
  const desiredWeight = GLOBAL_ROLE_HIERARCHY[desiredNorm] || 0;

  if (actorWeight < 60) {
    return { allowed: false, reason: "Insufficient privileges to assign global roles." };
  }

  if (isTargetLastSuperAdmin && targetNorm === "SUPER_ADMIN" && desiredNorm !== "SUPER_ADMIN") {
    return { allowed: false, reason: "Cannot demote the last remaining Super Admin." };
  }

  if (actorWeight < 70) {
    if (targetWeight >= 60) {
      return { allowed: false, reason: "Admins cannot modify peer or higher administrators." };
    }
    if (desiredWeight >= 60) {
      return { allowed: false, reason: "Admins cannot assign administrative roles." };
    }
  }

  return { allowed: true };
}

// =============================================================================
// CANONICAL 7 PROJECT ROLES SPECIFICATION & CAPABILITY MATRIX
// =============================================================================

export const CANONICAL_PROJECT_ROLES = [
  "OWNER",
  "ADMIN",
  "DESIGNER",
  "DEVELOPER",
  "CONTENT_EDITOR",
  "SEO_MANAGER",
  "VIEWER",
] as const;

export type ProjectRole = typeof CANONICAL_PROJECT_ROLES[number];

export const PROJECT_ROLE_ALIASES: Record<string, ProjectRole> = {
  PROJECT_OWNER: "OWNER",
  PROJECT_ADMIN: "ADMIN",
  REVIEWER: "VIEWER",
  CLIENT: "VIEWER",
};

export function normalizeProjectRole(role: string): ProjectRole {
  const upper = String(role || "").toUpperCase();
  if (PROJECT_ROLE_ALIASES[upper]) return PROJECT_ROLE_ALIASES[upper];
  if (CANONICAL_PROJECT_ROLES.includes(upper as any)) return upper as ProjectRole;
  return "VIEWER";
}

export const PROJECT_ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 70,
  PROJECT_OWNER: 70,
  ADMIN: 60,
  PROJECT_ADMIN: 60,
  DESIGNER: 50,
  DEVELOPER: 40,
  CONTENT_EDITOR: 30,
  SEO_MANAGER: 25,
  VIEWER: 10,
  REVIEWER: 10,
  CLIENT: 10,
};

export function canAssignProjectRole(
  requesterRole: string,
  targetCurrentRole: string,
  desiredRole: string
): { allowed: boolean; reason?: string } {
  const requesterNorm = normalizeProjectRole(requesterRole);
  const targetNorm = normalizeProjectRole(targetCurrentRole);
  const desiredNorm = normalizeProjectRole(desiredRole);

  const requesterWeight = PROJECT_ROLE_HIERARCHY[requesterNorm] || 0;
  const targetWeight = PROJECT_ROLE_HIERARCHY[targetNorm] || 0;
  const desiredWeight = PROJECT_ROLE_HIERARCHY[desiredNorm] || 0;

  if (requesterWeight < 60) {
    return { allowed: false, reason: "You do not have permission to manage project roles." };
  }

  if (desiredNorm === "OWNER" && requesterNorm !== "OWNER") {
    return { allowed: false, reason: "Only the project owner can assign the Owner role." };
  }

  if (targetNorm === "OWNER" && requesterNorm !== "OWNER") {
    return { allowed: false, reason: "Cannot modify project owner role." };
  }

  if (requesterNorm !== "OWNER" && targetWeight >= 60) {
    return { allowed: false, reason: "Admins cannot modify peer administrators." };
  }

  if (requesterNorm !== "OWNER" && desiredWeight >= 60) {
    return { allowed: false, reason: "Admins cannot grant administrator privileges." };
  }

  return { allowed: true };
}

/**
 * Authoritative Project Capability Matrix
 */
export const DEFAULT_CAPABILITIES: Record<string, string[]> = {
  OWNER: [
    "VIEW",
    "EDIT",
    "CREATE",
    "DELETE",
    "PUBLISH",
    "ROLLBACK",
    "MANAGE_TEAM",
    "MANAGE_SETTINGS",
    "MANAGE_INTEGRATIONS",
    "COMMENT",
    "EDIT_CONTENT",
    "EDIT_DESIGN",
    "MANAGE_MEMBERS",
    "MANAGE_PERMISSIONS",
    "MANAGE_PROJECT",
    "CUSTOM_CODE",
    "EDIT_SEO",
    "VIEW_ANALYTICS",
    "RUN_AUDIT",
    "SFTP_ACCESS",
    "VIEW_LOGS",
  ],
  PROJECT_OWNER: [
    "VIEW",
    "EDIT",
    "CREATE",
    "DELETE",
    "PUBLISH",
    "ROLLBACK",
    "MANAGE_TEAM",
    "MANAGE_SETTINGS",
    "MANAGE_INTEGRATIONS",
    "COMMENT",
    "EDIT_CONTENT",
    "EDIT_DESIGN",
    "MANAGE_MEMBERS",
    "MANAGE_PERMISSIONS",
    "MANAGE_PROJECT",
    "CUSTOM_CODE",
    "EDIT_SEO",
    "VIEW_ANALYTICS",
    "RUN_AUDIT",
    "SFTP_ACCESS",
    "VIEW_LOGS",
  ],
  ADMIN: [
    "VIEW",
    "EDIT",
    "CREATE",
    "PUBLISH",
    "ROLLBACK",
    "MANAGE_TEAM",
    "MANAGE_SETTINGS",
    "MANAGE_INTEGRATIONS",
    "COMMENT",
    "EDIT_CONTENT",
    "EDIT_DESIGN",
    "MANAGE_MEMBERS",
    "MANAGE_PERMISSIONS",
    "MANAGE_PROJECT",
    "CUSTOM_CODE",
    "EDIT_SEO",
    "VIEW_ANALYTICS",
    "RUN_AUDIT",
    "SFTP_ACCESS",
    "VIEW_LOGS",
  ],
  PROJECT_ADMIN: [
    "VIEW",
    "EDIT",
    "CREATE",
    "PUBLISH",
    "ROLLBACK",
    "MANAGE_TEAM",
    "MANAGE_SETTINGS",
    "MANAGE_INTEGRATIONS",
    "COMMENT",
    "EDIT_CONTENT",
    "EDIT_DESIGN",
    "MANAGE_MEMBERS",
    "MANAGE_PERMISSIONS",
    "MANAGE_PROJECT",
    "CUSTOM_CODE",
    "EDIT_SEO",
    "VIEW_ANALYTICS",
    "RUN_AUDIT",
    "SFTP_ACCESS",
    "VIEW_LOGS",
  ],
  DESIGNER: [
    "VIEW",
    "EDIT",
    "CREATE",
    "PUBLISH",
    "COMMENT",
    "EDIT_CONTENT",
    "EDIT_DESIGN",
    "VIEW_ANALYTICS",
  ],
  DEVELOPER: [
    "VIEW",
    "EDIT",
    "CREATE",
    "COMMENT",
    "EDIT_CONTENT",
    "EDIT_DESIGN",
    "CUSTOM_CODE",
    "MANAGE_INTEGRATIONS",
    "SFTP_ACCESS",
    "VIEW_LOGS",
    "VIEW_ANALYTICS",
  ],
  CONTENT_EDITOR: [
    "VIEW",
    "EDIT",
    "COMMENT",
    "EDIT_CONTENT",
  ],
  CLIENT: [
    "VIEW",
    "COMMENT",
  ],
  SEO_MANAGER: [
    "VIEW",
    "EDIT",
    "COMMENT",
    "EDIT_CONTENT",
    "EDIT_SEO",
    "VIEW_ANALYTICS",
    "RUN_AUDIT",
  ],
  REVIEWER: [
    "VIEW",
    "COMMENT",
  ],
  VIEWER: [
    "VIEW",
    "COMMENT",
  ],
};

// =============================================================================
// DETERMINISTIC PERMISSION PRECEDENCE ENGINE
// =============================================================================

/**
 * Checks if a user has access to a specific resource or website capability.
 *
 * Deterministic Evaluation Order:
 * 1. Valid authenticated user (fail closed if no userId).
 * 2. Fetch website & context (fail closed if not found or cross-tenant).
 * 3. Specific resource GranularPermission override:
 *    - If DENY -> immediately return false (DENY overrides all defaults).
 *    - If ALLOW -> immediately return true.
 * 4. Wildcard resource ("*") GranularPermission override:
 *    - If DENY -> immediately return false.
 *    - If ALLOW -> immediately return true.
 * 5. Project Ownership:
 *    - If website.userId === userId -> return true (Owner has full authority).
 * 6. Collaborator Role default capabilities:
 *    - Check DEFAULT_CAPABILITIES[normalizedRole].includes(capability).
 * 7. Organization / Workspace Administrative Authority:
 *    - If website belongs to workspace/org, and user is OWNER/ADMIN of workspace/org,
 *      grant administrative capabilities (VIEW, EDIT, PUBLISH, MANAGE_TEAM, etc., but not DELETE).
 * 8. Fail closed -> return false.
 */
export async function canUserAccessResource(
  userId: string,
  websiteId: string,
  resourceId: string,
  capability: string
): Promise<boolean> {
  if (!userId || !websiteId) return false;

  // 1. Fetch website and user permission
  let website: any;
  try {
    website = await getWebsiteById(websiteId, userId);
  } catch {
    return false;
  }

  const role = website.userPermission || "NONE";
  const isProjectOwner = website.userId === userId || role === "OWNER" || role === "PROJECT_OWNER";

  // 2. Check Granular Permission Overrides (ALLOW / DENY)
  try {
    if (prisma.granularPermission) {
      // 2a. Specific resource override
      if (resourceId !== "*") {
        const specificOverride = await prisma.granularPermission.findUnique({
          where: {
            websiteId_userId_resourceId_capability: {
              websiteId,
              userId,
              resourceId,
              capability,
            },
          },
        });

        if (specificOverride) {
          // If explicitly denied, return false immediately (even if role has it)
          if (specificOverride.effect === "DENY") return false;
          if (specificOverride.effect === "ALLOW") return true;
        }
      }

      // 2b. Wildcard resource override
      const globalOverride = await prisma.granularPermission.findUnique({
        where: {
          websiteId_userId_resourceId_capability: {
            websiteId,
            userId,
            resourceId: "*",
            capability,
          },
        },
      });

      if (globalOverride) {
        if (globalOverride.effect === "DENY") return false;
        if (globalOverride.effect === "ALLOW") return true;
      }
    }
  } catch (error) {
    // If table query fails, fallback safely to role defaults
  }

  // 3. Project Owner authority (cannot delete without being the creator/owner)
  if (isProjectOwner) {
    return true;
  }

  // 4. Role Defaults
  const normalizedRole = normalizeProjectRole(role);
  const roleCaps = DEFAULT_CAPABILITIES[normalizedRole] || [];

  if (roleCaps.includes(capability)) return true;

  // Aliases for compatibility
  if (capability === "EDIT" && (roleCaps.includes("EDIT_CONTENT") || roleCaps.includes("EDIT_DESIGN"))) {
    return true;
  }
  if (capability === "MANAGE_TEAM" && roleCaps.includes("MANAGE_MEMBERS")) {
    return true;
  }

  // 5. Check Workspace / Organization Admin Authority
  if (website.workspaceId) {
    try {
      const wsMember = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: website.workspaceId, userId } },
      });
      if (wsMember && (wsMember.role === "OWNER" || wsMember.role === "ADMIN")) {
        // Workspace admins receive ADMIN project capabilities (cannot DELETE website)
        if (capability !== "DELETE") {
          const adminCaps = DEFAULT_CAPABILITIES.ADMIN;
          if (adminCaps.includes(capability)) return true;
        }
      }
    } catch (_) {}
  }

  if (website.organizationId) {
    try {
      const orgMember = await db.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: website.organizationId, userId } },
      });
      if (orgMember && (orgMember.role === "OWNER" || orgMember.role === "ADMIN")) {
        if (capability !== "DELETE") {
          const adminCaps = DEFAULT_CAPABILITIES.ADMIN;
          if (adminCaps.includes(capability)) return true;
        }
      }
    } catch (_) {}
  }

  // 6. Fail closed
  return false;
}

export async function authorizeResourceAccess(
  userId: string,
  websiteId: string,
  resourceId: string,
  capability: string
) {
  const isAllowed = await canUserAccessResource(userId, websiteId, resourceId, capability);
  if (!isAllowed) {
    throw new AppError(
      `You do not have permission to ${capability} this resource.`,
      403,
      "FORBIDDEN"
    );
  }
}

/**
 * Express middleware for declarative capability authorization on website routes.
 */
export function authorizeCapability(capability: string, resourceId: string = "*") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = res.locals.user;
      if (!user) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
      }
      const websiteId = (
        req.params.id ||
        req.params.websiteId ||
        req.body?.websiteId ||
        (req.query?.websiteId as string)
      ) as string;
      if (!websiteId) {
        return next();
      }

      await authorizeResourceAccess(user.id, websiteId, resourceId, capability);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export async function getGranularPermissions(websiteId: string, requesterUserId: string) {
  const website = await getWebsiteById(websiteId, requesterUserId);
  const normalizedRole = normalizeProjectRole(website.userPermission);
  if (
    normalizedRole !== "OWNER" &&
    normalizedRole !== "ADMIN" &&
    !DEFAULT_CAPABILITIES[normalizedRole]?.includes("MANAGE_PERMISSIONS")
  ) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  return await prisma.granularPermission.findMany({
    where: { websiteId },
    include: { user: { select: { fullName: true, email: true } } },
  });
}

export async function setGranularPermission(
  websiteId: string,
  requesterUserId: string,
  targetUserId: string,
  resourceId: string,
  capability: string,
  effect: string
) {
  if (effect !== "ALLOW" && effect !== "DENY" && effect !== "INHERIT") {
    throw new AppError("Invalid effect. Must be ALLOW, DENY, or INHERIT", 400, "BAD_REQUEST");
  }

  const website = await getWebsiteById(websiteId, requesterUserId);
  const normalizedRole = normalizeProjectRole(website.userPermission);
  if (
    normalizedRole !== "OWNER" &&
    normalizedRole !== "ADMIN" &&
    !DEFAULT_CAPABILITIES[normalizedRole]?.includes("MANAGE_PERMISSIONS")
  ) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  // Prevent changing project owner permissions
  if (website.userId === targetUserId) {
    throw new AppError("Cannot restrict project owner", 403, "FORBIDDEN");
  }

  const membership = await prisma.websiteCollaborator.findUnique({
    where: { websiteId_userId: { websiteId, userId: targetUserId } },
  });
  if (!membership) throw new AppError("Target user is not a project member", 400, "BAD_REQUEST");

  if (effect === "INHERIT") {
    await prisma.granularPermission.deleteMany({
      where: { websiteId, userId: targetUserId, resourceId, capability },
    });

    // Durable audit logging
    await prisma.auditLog.create({
      data: {
        userId: requesterUserId,
        action: "PERMISSION_DELETED",
        targetResource: `website:${websiteId}`,
        details: { targetUserId, resourceId, capability },
      },
    });

    return { success: true };
  }

  const perm = await prisma.granularPermission.upsert({
    where: {
      websiteId_userId_resourceId_capability: {
        websiteId,
        userId: targetUserId,
        resourceId,
        capability,
      },
    },
    update: { effect },
    create: { websiteId, userId: targetUserId, resourceId, capability, effect },
  });

  // Durable audit logging
  await prisma.auditLog.create({
    data: {
      userId: requesterUserId,
      action: "PERMISSION_UPDATED",
      targetResource: `website:${websiteId}`,
      details: { targetUserId, resourceId, capability, effect },
    },
  });

  return { success: true, permission: perm };
}

/**
 * Returns effective capabilities for a user on a website
 */
export async function getEffectivePermissions(websiteId: string, userId: string) {
  const website = await getWebsiteById(websiteId, userId);
  const role = normalizeProjectRole(website.userPermission);
  const baseCaps = new Set<string>(DEFAULT_CAPABILITIES[role] || []);

  const overrides = await prisma.granularPermission.findMany({
    where: { websiteId, userId },
  });

  for (const o of overrides) {
    if (o.effect === "ALLOW") {
      baseCaps.add(o.capability);
    } else if (o.effect === "DENY") {
      baseCaps.delete(o.capability);
    }
  }

  return {
    websiteId,
    userId,
    role,
    capabilities: Array.from(baseCaps),
    overrides,
  };
}
