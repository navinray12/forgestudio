import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";

const db = prisma as any;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .concat("-", Math.random().toString(36).substring(2, 7));
}

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

export async function getWorkspace(workspaceId: string, userId: string) {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!membership) {
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

export async function getUserWorkspaces(userId: string) {
  return await db.workspace.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      _count: { select: { members: true, websites: true } },
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function addWorkspaceMember(
  workspaceId: string,
  requesterId: string,
  targetUserId: string,
  role: "ADMIN" | "MEMBER" = "MEMBER"
) {
  const requesterMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: requesterId } },
  });

  if (!requesterMembership || (requesterMembership.role !== "OWNER" && requesterMembership.role !== "ADMIN")) {
    throw new AppError("Only workspace owners and admins can add members", 403, "FORBIDDEN");
  }

  const existing = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });

  if (existing) {
    throw new AppError("User is already a member of this workspace", 400, "BAD_REQUEST");
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

export async function removeWorkspaceMember(
  workspaceId: string,
  requesterId: string,
  targetUserId: string
) {
  const requesterMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: requesterId } },
  });

  if (!requesterMembership || (requesterMembership.role !== "OWNER" && requesterMembership.role !== "ADMIN")) {
    throw new AppError("Only workspace owners and admins can remove members", 403, "FORBIDDEN");
  }

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (workspace?.ownerId === targetUserId) {
    throw new AppError("Cannot remove the workspace owner", 403, "FORBIDDEN");
  }

  await db.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId: requesterId,
        action: "WORKSPACE_MEMBER_REMOVED",
        targetResource: `workspace:${workspaceId}`,
        details: { targetUserId },
      },
    });
  } catch (_) {}

  return { success: true };
}

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
  if (!workspaceMembership) {
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
