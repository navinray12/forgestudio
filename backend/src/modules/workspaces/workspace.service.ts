/**
 * @file Workspaces: business operations and coordination with persistence or external services. File responsibility: workspace service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import { getWebsiteById } from "../websites/website.service.js";
import { revokeWorkspaceMember as revokeWorkspaceMembership } from "./workspace-membership.service.js";

const db = prisma as any;

/**
 * Generate Slug.
 * @param name Name supplied to this operation (type: string).
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .concat("-", Math.random().toString(36).substring(2, 7));
}

/**
 * Create Workspace.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 * @param name Name supplied to this operation (type: string).
 * @param slug Slug supplied to this operation (type: string). Optional; callers may omit it.
 * @param organizationId Identifier of the organization containing the affected resources. Optional; callers may omit it.
 * @param settings Settings supplied to this operation (type: Record<string, any>). Defaults to {}.
 */
export async function createWorkspace(
  userId: string,
  name: string,
  slug?: string,
  organizationId?: string,
  settings: Record<string, any> = {}
) {
  if (!name || !name.trim()) {
    throw new AppError("Workspace name is required", 400, "BAD_REQUEST");
  }

  const finalSlug = slug?.trim() || generateSlug(name);

  // If organizationId provided, verify membership
  if (organizationId) {
    const orgMembership = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!orgMembership) {
      throw new AppError("You are not a member of this organization", 403, "FORBIDDEN");
    }
  }

  const workspace = await db.workspace.create({
    data: {
      name: name.trim(),
      slug: finalSlug,
      ownerId: userId,
      organizationId: organizationId || null,
      settings,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
    },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: "WORKSPACE_CREATED",
        targetResource: `workspace:${workspace.id}`,
        details: { name: workspace.name, slug: workspace.slug, organizationId },
      },
    });
  } catch (_) {}

  return workspace;
}

/**
 * Get Workspace.
 * @param workspaceId Identifier of the workspace containing the affected resources.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
export async function getWorkspace(workspaceId: string, userId: string) {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new AppError("Workspace not found or access denied", 404, "NOT_FOUND");
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
      websites: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          updatedAt: true,
        },
      },
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!workspace) {
    throw new AppError("Workspace not found", 404, "NOT_FOUND");
  }

  return { ...workspace, userRole: membership.role };
}

/**
 * Get User Workspaces.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
export async function getUserWorkspaces(userId: string) {
  return await db.workspace.findMany({
    where: {
      members: { some: { userId, status: "ACTIVE" } },
    },
    include: {
      _count: { select: { members: true, websites: true } },
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
}

/**
 * Add Workspace Member.
 * @param workspaceId Identifier of the workspace containing the affected resources.
 * @param requesterId Requester Id supplied to this operation (type: string).
 * @param targetUserId Target User Id supplied to this operation (type: string).
 * @param role Role supplied to this operation (type: "ADMIN" | "MEMBER"). Defaults to "MEMBER".
 */
export async function addWorkspaceMember(
  workspaceId: string,
  requesterId: string,
  targetUserId: string,
  role: "ADMIN" | "MEMBER" = "MEMBER"
) {
  const requesterMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: requesterId } },
  });

  if (
    !requesterMembership ||
    requesterMembership.status !== "ACTIVE" ||
    (requesterMembership.role !== "OWNER" && requesterMembership.role !== "ADMIN")
  ) {
    throw new AppError("Only workspace owners and admins can add members", 403, "FORBIDDEN");
  }

  const existing = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });

  if (existing?.status === "ACTIVE") {
    throw new AppError("User is already a member of this workspace", 400, "BAD_REQUEST");
  }
  if (existing) {
    // Re-activate a previously revoked membership rather than violating the unique constraint.
    const reactivated = await db.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      data: { role, status: "ACTIVE", policyVersion: { increment: 1 } },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    return reactivated;
  }

  const member = await db.workspaceMember.create({
    data: {
      workspaceId,
      userId: targetUserId,
      role,
    },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId: requesterId,
        action: "WORKSPACE_MEMBER_ADDED",
        targetResource: `workspace:${workspaceId}`,
        details: { targetUserId, role },
      },
    });
  } catch (_) {}

  return member;
}

/**
 * Remove Workspace Member.
 * @param workspaceId Identifier of the workspace containing the affected resources.
 * @param requesterId Requester Id supplied to this operation (type: string).
 * @param targetUserId Target User Id supplied to this operation (type: string).
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  requesterId: string,
  targetUserId: string
) {
  // Soft-revoke (status -> REVOKED) rather than delete, so history and any in-flight
  // authorization decision can distinguish "revoked" from "never a member" (FS-040).
  return await revokeWorkspaceMembership(workspaceId, requesterId, targetUserId);
}

/**
 * Assign Website To Workspace.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param workspaceId Identifier of the workspace containing the affected resources.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
export async function assignWebsiteToWorkspace(
  websiteId: string,
  workspaceId: string,
  userId: string
) {
  const website = await getWebsiteById(websiteId, userId);
  if (website.userPermission !== "OWNER" && website.userPermission !== "ADMIN") {
    throw new AppError("You do not have permission to move this website", 403, "FORBIDDEN");
  }

  const workspaceMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!workspaceMembership || workspaceMembership.status !== "ACTIVE") {
    throw new AppError("You are not a member of the target workspace", 403, "FORBIDDEN");
  }

  const updated = await db.website.update({
    where: { id: websiteId },
    data: { workspaceId },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: "WEBSITE_ASSIGNED_WORKSPACE",
        targetResource: `website:${websiteId}`,
        details: { workspaceId },
      },
    });
  } catch (_) {}

  return updated;
}
