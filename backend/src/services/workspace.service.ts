import crypto from "crypto";
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
    throw new AppError("Workspace not found or access denied", 404, "NOT_FOUND");
  }

  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!membership && workspace.ownerId !== userId) {
    throw new AppError("Workspace not found or access denied", 404, "NOT_FOUND");
  }

  return { ...workspace, userRole: membership?.role || (workspace.ownerId === userId ? "OWNER" : "MEMBER") };
}

export async function getUserWorkspaces(userId: string) {
  return await db.workspace.findMany({
    where: {
      OR: [
        { members: { some: { userId } } },
        { ownerId: userId },
      ],
    },
    include: {
      _count: { select: { members: true, websites: true } },
      organization: { select: { id: true, name: true, slug: true } },
      members: {
        where: { userId },
        select: { role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}


export async function addWorkspaceMember(
  workspaceId: string,
  requesterId: string,
  targetUserId: string,
  role: "ADMIN" | "MEMBER" = "MEMBER"
) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw new AppError("Workspace not found", 404, "NOT_FOUND");
  }

  const requesterMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: requesterId } },
  });

  const isOwner = workspace.ownerId === requesterId;
  const isAdmin = requesterMembership?.role === "OWNER" || requesterMembership?.role === "ADMIN";

  if (!isOwner && !isAdmin) {
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
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw new AppError("Workspace not found", 404, "NOT_FOUND");
  }

  const requesterMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: requesterId } },
  });

  const isOwner = workspace.ownerId === requesterId;
  const isAdmin = requesterMembership?.role === "OWNER" || requesterMembership?.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError("Only workspace owners and admins can remove members", 403, "FORBIDDEN");
  }

  if (workspace.ownerId === targetUserId) {
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

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  requesterId: string,
  targetUserId: string,
  newRole: string
) {
  // 1. Role validation: Accept only ADMIN or MEMBER
  const normalizedRole = typeof newRole === "string" ? newRole.trim().toUpperCase() : "";
  if (normalizedRole !== "ADMIN" && normalizedRole !== "MEMBER") {
    throw new AppError("Role must be ADMIN or MEMBER", 400, "BAD_REQUEST");
  }

  // 2. Verify workspace exists
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } }).catch(() => null);
  if (!workspace) {
    throw new AppError("Workspace not found", 404, "NOT_FOUND");
  }

  // 3. Authorization check: Requester must be workspace owner or workspace admin
  const requesterMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: requesterId } },
  });

  const isOwner = workspace.ownerId === requesterId;
  const isAdmin = requesterMembership?.role === "OWNER" || requesterMembership?.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError("Only workspace owners and admins can update member roles", 403, "FORBIDDEN");
  }

  // 4. Owner protection: Workspace owner cannot have their role changed through this endpoint
  if (workspace.ownerId === targetUserId) {
    throw new AppError("Cannot change the role of the workspace owner", 403, "FORBIDDEN");
  }

  // 5. Target member existence check
  const targetMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });

  if (!targetMembership) {
    throw new AppError("Member not found in this workspace", 404, "NOT_FOUND");
  }

  // If already at desired role, return existing record idempotently
  if (targetMembership.role === normalizedRole) {
    return await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  }

  // 6. Update role safely
  const updated = await db.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    data: { role: normalizedRole },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  // 7. Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId: requesterId,
        action: "WORKSPACE_MEMBER_ROLE_UPDATED",
        targetResource: `workspace:${workspaceId}`,
        details: { targetUserId, oldRole: targetMembership.role, newRole: normalizedRole },
      },
    });
  } catch (_) {}

  return updated;
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

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
  if (!workspace) {
    throw new AppError("Target workspace not found", 404, "NOT_FOUND");
  }

  const workspaceMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!workspaceMembership && workspace.ownerId !== userId) {
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

// ---------------------------------------------------------------------------
// Feature 19: Workspace Invitation Services
// ---------------------------------------------------------------------------

export async function initWorkspaceTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS workspace_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspaceId" UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
        "tokenHash" VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "invitedBy" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS workspace_invitations_workspaceId_idx ON workspace_invitations("workspaceId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS workspace_invitations_email_idx ON workspace_invitations("email");
    `);
  } catch (_) {
    // Non-blocking initialization
  }
}

// Auto-run table initialization
initWorkspaceTables();

function sanitizeInvitation(inv: any) {
  if (!inv) return null;
  const { tokenHash: _omit, ...rest } = inv;
  return rest;
}

export async function inviteWorkspaceMember(
  workspaceId: string,
  inviterUserId: string,
  email: string,
  role: "MEMBER" | "ADMIN" = "MEMBER"
) {
  if (!email || typeof email !== "string" || !email.trim()) {
    throw new AppError("Email is required", 400, "BAD_REQUEST");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new AppError("A valid email address is required", 400, "BAD_REQUEST");
  }

  const targetRole = role === "ADMIN" ? "ADMIN" : "MEMBER";

  // 1. Verify workspace existence
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: true },
  });
  if (!workspace) {
    throw new AppError("Workspace not found", 404, "NOT_FOUND");
  }

  // 2. Authorization: Requester must be workspace OWNER or ADMIN
  const requesterMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: inviterUserId } },
  });
  const isOwner = workspace.ownerId === inviterUserId;
  const isAdmin = requesterMembership?.role === "OWNER" || requesterMembership?.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError("Only workspace owners and admins can invite members", 403, "FORBIDDEN");
  }

  // 3. Registered user verification (must invite an existing registered user)
  const targetUser = await db.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });
  if (!targetUser) {
    throw new AppError("User with this email is not registered", 404, "USER_NOT_FOUND");
  }

  // 4. Check if already a member or owner
  if (workspace.ownerId === targetUser.id) {
    throw new AppError("User is already the owner of this workspace", 400, "BAD_REQUEST");
  }

  const existingMember = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUser.id } },
  });
  if (existingMember) {
    throw new AppError("User is already a member of this workspace", 400, "BAD_REQUEST");
  }

  // 5. Check duplicate active pending invitation
  const existingPending = await db.workspaceInvitation.findFirst({
    where: {
      workspaceId,
      email: { equals: normalizedEmail, mode: "insensitive" },
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });
  if (existingPending) {
    throw new AppError("An active invitation already exists for this email", 400, "BAD_REQUEST");
  }

  // 6. Generate cryptographic token and hash
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await db.workspaceInvitation.create({
    data: {
      workspaceId,
      email: normalizedEmail,
      role: targetRole,
      tokenHash,
      status: "PENDING",
      expiresAt,
      invitedBy: inviterUserId,
    },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
      inviter: { select: { id: true, fullName: true, email: true } },
    },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId: inviterUserId,
        action: "WORKSPACE_INVITATION_CREATED",
        targetResource: `workspace:${workspaceId}`,
        details: { invitationId: invitation.id, email: normalizedEmail, role: targetRole },
      },
    });
  } catch (_) {}

  return {
    success: true,
    invitation: sanitizeInvitation(invitation),
    token, // Provided for testing and notifications
  };
}

export async function getWorkspaceInvitations(workspaceId: string, requesterUserId: string) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw new AppError("Workspace not found", 404, "NOT_FOUND");
  }

  const requesterMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: requesterUserId } },
  });
  const isOwner = workspace.ownerId === requesterUserId;
  const isAdmin = requesterMembership?.role === "OWNER" || requesterMembership?.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError("Only workspace owners and admins can view invitations", 403, "FORBIDDEN");
  }

  const invitations = await db.workspaceInvitation.findMany({
    where: { workspaceId },
    include: {
      inviter: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations.map(sanitizeInvitation);
}

export async function getMyPendingWorkspaceInvitations(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    return [];
  }

  const invitations = await db.workspaceInvitation.findMany({
    where: {
      email: { equals: user.email.toLowerCase(), mode: "insensitive" },
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: {
      workspace: { select: { id: true, name: true, slug: true, ownerId: true } },
      inviter: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations.map(sanitizeInvitation);
}

export async function acceptWorkspaceInvitation(
  invitationIdOrToken: string,
  userId: string
) {
  if (!invitationIdOrToken || !invitationIdOrToken.trim()) {
    throw new AppError("Invitation ID or token is required", 400, "BAD_REQUEST");
  }

  const identifier = invitationIdOrToken.trim();

  // Try finding by ID first, then by token hash
  let invite = await db.workspaceInvitation.findUnique({
    where: { id: identifier },
    include: { workspace: true },
  }).catch(() => null);

  if (!invite) {
    const tokenHash = crypto.createHash("sha256").update(identifier).digest("hex");
    invite = await db.workspaceInvitation.findUnique({
      where: { tokenHash },
      include: { workspace: true },
    }).catch(() => null);
  }

  if (!invite) {
    throw new AppError("Invitation not found", 404, "NOT_FOUND");
  }

  // Check state and validity
  if (invite.status === "ACCEPTED") {
    throw new AppError("Invitation has already been accepted", 400, "BAD_REQUEST");
  }
  if (invite.status === "CANCELLED") {
    throw new AppError("Invitation has been cancelled", 400, "BAD_REQUEST");
  }
  if (invite.status === "DECLINED") {
    throw new AppError("Invitation has been declined", 400, "BAD_REQUEST");
  }
  if (invite.status !== "PENDING") {
    throw new AppError("Invitation is no longer valid", 400, "BAD_REQUEST");
  }

  if (new Date(invite.expiresAt) <= new Date()) {
    try {
      await db.workspaceInvitation.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    } catch (_) {}
    throw new AppError("Invitation has expired", 400, "BAD_REQUEST");
  }

  // Verify identity: only the intended invitee can accept
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.email || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new AppError("This invitation was sent to a different email address", 403, "FORBIDDEN");
  }

  // Safe idempotent membership check: if already member, mark accepted
  const existingMember = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
  });

  if (existingMember) {
    await db.workspaceInvitation.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });
    return {
      success: true,
      workspaceId: invite.workspaceId,
      role: existingMember.role,
      message: "Already a member of this workspace",
    };
  }

  // Execute atomic membership creation and invitation status update
  await db.$transaction(async (tx: any) => {
    // Re-verify inside transaction to prevent race conditions
    const concurrentCheck = await tx.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
    });
    if (!concurrentCheck) {
      await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role || "MEMBER",
        },
      });
    }

    await tx.workspaceInvitation.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: "WORKSPACE_INVITATION_ACCEPTED",
        targetResource: `workspace:${invite.workspaceId}`,
        details: { invitationId: invite.id, role: invite.role },
      },
    });
  } catch (_) {}

  return {
    success: true,
    workspaceId: invite.workspaceId,
    role: invite.role,
  };
}

export async function declineWorkspaceInvitation(
  invitationIdOrToken: string,
  userId: string
) {
  if (!invitationIdOrToken || !invitationIdOrToken.trim()) {
    throw new AppError("Invitation ID or token is required", 400, "BAD_REQUEST");
  }

  const identifier = invitationIdOrToken.trim();

  let invite = await db.workspaceInvitation.findUnique({
    where: { id: identifier },
  }).catch(() => null);

  if (!invite) {
    const tokenHash = crypto.createHash("sha256").update(identifier).digest("hex");
    invite = await db.workspaceInvitation.findUnique({
      where: { tokenHash },
    }).catch(() => null);
  }

  if (!invite) {
    throw new AppError("Invitation not found", 404, "NOT_FOUND");
  }

  if (invite.status !== "PENDING") {
    throw new AppError("Invitation is no longer pending", 400, "BAD_REQUEST");
  }

  if (new Date(invite.expiresAt) <= new Date()) {
    throw new AppError("Invitation has expired", 400, "BAD_REQUEST");
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.email || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new AppError("This invitation was sent to a different email address", 403, "FORBIDDEN");
  }

  await db.workspaceInvitation.update({
    where: { id: invite.id },
    data: { status: "DECLINED" },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: "WORKSPACE_INVITATION_DECLINED",
        targetResource: `workspace:${invite.workspaceId}`,
        details: { invitationId: invite.id },
      },
    });
  } catch (_) {}

  return { success: true };
}

export async function cancelWorkspaceInvitation(
  invitationId: string,
  requesterUserId: string
) {
  const invite = await db.workspaceInvitation.findUnique({
    where: { id: invitationId },
  });
  if (!invite) {
    throw new AppError("Invitation not found", 404, "NOT_FOUND");
  }

  const workspace = await db.workspace.findUnique({
    where: { id: invite.workspaceId },
  });
  if (!workspace) {
    throw new AppError("Workspace not found", 404, "NOT_FOUND");
  }

  const requesterMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: requesterUserId } },
  });
  const isOwner = workspace.ownerId === requesterUserId;
  const isAdmin = requesterMembership?.role === "OWNER" || requesterMembership?.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError("Only workspace owners and admins can cancel invitations", 403, "FORBIDDEN");
  }

  if (invite.status === "ACCEPTED") {
    throw new AppError("Cannot cancel an already accepted invitation", 400, "BAD_REQUEST");
  }

  await db.workspaceInvitation.update({
    where: { id: invitationId },
    data: { status: "CANCELLED" },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId: requesterUserId,
        action: "WORKSPACE_INVITATION_CANCELLED",
        targetResource: `workspace:${invite.workspaceId}`,
        details: { invitationId: invite.id, email: invite.email },
      },
    });
  } catch (_) {}

  return { success: true };
}
