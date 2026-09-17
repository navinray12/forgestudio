import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";

const db = prisma as any;

/**
 * Standard Capability Matrix aligned with ForgeStudio Authority Architecture
 * Roles: OWNER, ADMIN, DESIGNER, CONTENT_EDITOR, REVIEWER
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
  ],
  DESIGNER: [
    "VIEW",
    "EDIT",
    "CREATE",
    "PUBLISH",
    "COMMENT",
    "EDIT_CONTENT",
    "EDIT_DESIGN",
  ],
  CONTENT_EDITOR: [
    "VIEW",
    "EDIT",
    "COMMENT",
    "EDIT_CONTENT",
  ],
  REVIEWER: [
    "VIEW",
    "COMMENT",
  ],
};

/**
 * Checks if a user has access to a specific resource or website capability.
 * Evaluation order:
 * 1. Project OWNER has full authority across all operations.
 * 2. Specific resource override (resourceId, capability) in GranularPermission.
 * 3. Wildcard resource override ("*", capability) in GranularPermission.
 * 4. Default role capabilities from DEFAULT_CAPABILITIES.
 */
export async function canUserAccessResource(
  userId: string,
  websiteId: string,
  resourceId: string,
  capability: string
): Promise<boolean> {
  // 1. Check basic ownership / team access via getWebsiteById
  let website: any;
  try {
    website = await getWebsiteById(websiteId, userId);
  } catch {
    return false;
  }
  const role = website.userPermission || "REVIEWER";

  if (role === "OWNER") return true;

  // 2. Check Granular Permission Overrides
  try {
    if (prisma.granularPermission) {
      // Check specific resource override first
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
          return specificOverride.effect === "ALLOW";
        }
      }

      // Check global wildcard override
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
        return globalOverride.effect === "ALLOW";
      }
    }
  } catch (error) {
    // If table is somehow missing, continue to role defaults safely
  }

  // 3. Check Role defaults (with capability aliasing for backwards compatibility)
  const roleCaps = DEFAULT_CAPABILITIES[role] || [];
  if (roleCaps.includes(capability)) return true;

  // Aliases for compatibility
  if (capability === "EDIT" && (roleCaps.includes("EDIT_CONTENT") || roleCaps.includes("EDIT_DESIGN"))) {
    return true;
  }
  if (capability === "MANAGE_TEAM" && roleCaps.includes("MANAGE_MEMBERS")) {
    return true;
  }

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
 * Authoritatively verifies access using server-side session and prevents IDOR / cross-tenant access.
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
  if (
    website.userPermission !== "OWNER" &&
    website.userPermission !== "ADMIN" &&
    !DEFAULT_CAPABILITIES[website.userPermission]?.includes("MANAGE_PERMISSIONS")
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
  if (
    website.userPermission !== "OWNER" &&
    website.userPermission !== "ADMIN" &&
    !DEFAULT_CAPABILITIES[website.userPermission]?.includes("MANAGE_PERMISSIONS")
  ) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  // Prevent changing owner permissions
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
