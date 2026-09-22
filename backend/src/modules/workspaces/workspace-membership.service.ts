/**
 * @file Workspaces: authoritative account -> workspace membership, invitation and support-grant
 * logic (blueprint FS-040). This is the single source of truth for "does this user currently
 * have a role in this workspace" used by website.service.ts's authorization gate and by
 * workspace.controller.ts's HTTP surface. It has no dependency on website.service.ts so the two
 * modules can safely import from here without a circular import.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import crypto from "crypto";
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import type { Prisma } from "../../generated/prisma/client.js";

const db = prisma as any;

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";
const VALID_INVITE_ROLES: WorkspaceRole[] = ["ADMIN", "MEMBER"];
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get Active Workspace Role.
 * Returns the caller's ACTIVE membership role for a workspace, or null if they have no
 * active membership. Never falls through to an allow on a database error: a failed lookup
 * is reported as unavailable so callers cannot mistake it for "no access" or "full access".
 * @param userId User identifier used to scope this operation.
 * @param workspaceId Identifier of the workspace containing the affected resources.
 * @param client Client supplied to this operation (type: Prisma.TransactionClient). Defaults to prisma.
 */
export async function getActiveWorkspaceRole(
  userId: string,
  workspaceId: string,
  client: Prisma.TransactionClient = prisma,
): Promise<WorkspaceRole | null> {
  if (!userId || !workspaceId) return null;
  try {
    const membership = await (client as any).workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership || membership.status !== "ACTIVE") return null;
    return membership.role as WorkspaceRole;
  } catch (error) {
    throw new AppError(
      "Workspace membership could not be evaluated. Try again later.",
      503,
      "AUTHORIZATION_UNAVAILABLE",
    );
  }
}

/**
 * Require Active Workspace Role.
 * @param userId User identifier used to scope this operation.
 * @param workspaceId Identifier of the workspace containing the affected resources.
 * @param allowedRoles Roles supplied to this operation (type: WorkspaceRole[]).
 * @param client Client supplied to this operation (type: Prisma.TransactionClient). Defaults to prisma.
 */
export async function requireActiveWorkspaceRole(
  userId: string,
  workspaceId: string,
  allowedRoles: WorkspaceRole[],
  client: Prisma.TransactionClient = prisma,
): Promise<WorkspaceRole> {
  const role = await getActiveWorkspaceRole(userId, workspaceId, client);
  if (!role || !allowedRoles.includes(role)) {
    throw new AppError("You do not have permission to manage this workspace.", 403, "FORBIDDEN");
  }
  return role;
}

/**
 * Get Or Create Personal Workspace.
 * Idempotently resolves the caller's personal workspace, creating a personal organization
 * (account boundary) and workspace on first use. Concurrent callers race on the same
 * membership uniqueness constraint rather than the workspace row, so a duplicate personal
 * workspace is not created under concurrent first-time calls for the same user.
 * @param userId User identifier used to scope this operation.
 * @param client Client supplied to this operation (type: Prisma.TransactionClient). Defaults to prisma.
 */
export async function getOrCreatePersonalWorkspace(
  userId: string,
  client: Prisma.TransactionClient = prisma,
): Promise<{ id: string; organizationId: string | null }> {
  const cdb = client as any;
  const existing = await cdb.workspace.findFirst({
    where: { ownerId: userId, isPersonal: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  const anyOwned = await cdb.workspace.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });
  if (anyOwned) return anyOwned;

  const suffix = userId.replace(/-/g, "");
  /**
   * Create.
   * @param tx Tx supplied to this operation (type: any).
   */
  const create = async (tx: any) => {
    const organization = await tx.organization.create({
      data: {
        name: "Personal",
        slug: `personal-${suffix}`,
        ownerId: userId,
        settings: {},
        members: { create: { userId, role: "OWNER" } },
      },
    });
    return tx.workspace.create({
      data: {
        name: "Personal workspace",
        slug: `personal-ws-${suffix}`,
        ownerId: userId,
        organizationId: organization.id,
        isPersonal: true,
        settings: {},
        members: { create: { userId, role: "OWNER", status: "ACTIVE" } },
      },
    });
  };

  try {
    // Only open a sub-transaction when given the top-level client: a caller-supplied
    // TransactionClient is already atomic within its own enclosing transaction, and
    // Prisma's TransactionClient type has no $transaction method to nest into.
    return client === prisma ? await (client as any).$transaction(create) : await create(cdb);
  } catch (error: any) {
    // Unique-slug collision means a concurrent call already committed one: Postgres
    // blocks this insert on the winner's row lock until the winner's whole transaction
    // (organization + workspace together) commits, so by the time this call is
    // unblocked and rejected, the winner's workspace row is guaranteed to be visible.
    if (error?.code === "P2002") {
      const raced = await cdb.workspace.findFirst({
        where: { ownerId: userId },
        orderBy: { createdAt: "asc" },
      });
      if (raced) return raced;
    }
    throw error;
  }
}

/**
 * Invite To Workspace.
 * @param workspaceId Identifier of the workspace containing the affected resources.
 * @param inviterId Inviter Id supplied to this operation (type: string).
 * @param email Email address used by this operation.
 * @param role Role supplied to this operation (type: WorkspaceRole). Defaults to "MEMBER".
 */
export async function inviteToWorkspace(
  workspaceId: string,
  inviterId: string,
  email: string,
  role: WorkspaceRole = "MEMBER",
) {
  await requireActiveWorkspaceRole(inviterId, workspaceId, ["OWNER", "ADMIN"]);
  if (!VALID_INVITE_ROLES.includes(role)) {
    throw new AppError("Invalid workspace role specified.", 400, "BAD_REQUEST");
  }
  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedEmail) {
    throw new AppError("An email address is required.", 400, "BAD_REQUEST");
  }

  const targetUser = await db.user.findUnique({ where: { email: trimmedEmail } });
  if (targetUser) {
    const existingMember = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUser.id } },
    });
    if (existingMember?.status === "ACTIVE") {
      throw new AppError("User is already a member of this workspace.", 400, "BAD_REQUEST");
    }
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  const invitation = await db.workspaceInvitation.create({
    data: {
      workspaceId,
      email: trimmedEmail,
      role,
      tokenHash,
      status: "PENDING",
      expiresAt,
      invitedBy: inviterId,
    },
  });

  try {
    await db.auditLog.create({
      data: {
        userId: inviterId,
        action: "WORKSPACE_INVITATION_SENT",
        targetResource: `workspace:${workspaceId}`,
        details: { email: trimmedEmail, role, invitationId: invitation.id },
      },
    });
  } catch (_) {}

  return { invitationId: invitation.id, token, expiresAt };
}

/**
 * Accept Workspace Invitation.
 * Guarded single-use acceptance: the PENDING -> ACCEPTED transition is a conditional
 * update scoped to the current status, so a reused token (sequential replay, or a race
 * between two concurrent accept calls) can win at most once.
 * @param token Token supplied to this operation; do not include secret tokens in logs.
 * @param userId User identifier used to scope this operation.
 */
export async function acceptWorkspaceInvitation(token: string, userId: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const invitation = await db.workspaceInvitation.findUnique({ where: { tokenHash } });
  if (!invitation) {
    throw new AppError("Invalid invitation.", 400, "INVITATION_INVALID");
  }
  if (invitation.expiresAt < new Date()) {
    throw new AppError("This invitation has expired.", 400, "INVITATION_EXPIRED");
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new AppError("This invitation was sent to a different email address.", 400, "INVITATION_EMAIL_MISMATCH");
  }

  return await db.$transaction(async (tx: any) => {
    const claim = await tx.workspaceInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "ACCEPTED", acceptedBy: userId },
    });
    if (claim.count === 0) {
      throw new AppError("This invitation has already been used.", 409, "INVITATION_ALREADY_USED");
    }

    await tx.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
      update: { role: invitation.role, status: "ACTIVE", policyVersion: { increment: 1 } },
      create: { workspaceId: invitation.workspaceId, userId, role: invitation.role, status: "ACTIVE" },
    });

    try {
      await tx.auditLog.create({
        data: {
          userId,
          action: "WORKSPACE_INVITATION_ACCEPTED",
          targetResource: `workspace:${invitation.workspaceId}`,
          details: { invitationId: invitation.id, role: invitation.role },
        },
      });
    } catch (_) {}

    return { success: true, workspaceId: invitation.workspaceId, role: invitation.role };
  });
}

/**
 * Revoke Workspace Member.
 * Soft-revokes (status -> REVOKED, policyVersion bumped) rather than deleting the row, so
 * membership history and any in-flight authorization decision keyed on the prior version
 * can be told apart from "never was a member". Revocation takes effect immediately for
 * any subsequent check; it cannot undo an effect a prior check already authorized.
 * @param workspaceId Identifier of the workspace containing the affected resources.
 * @param requesterId Requester Id supplied to this operation (type: string).
 * @param targetUserId Target User Id supplied to this operation (type: string).
 */
export async function revokeWorkspaceMember(workspaceId: string, requesterId: string, targetUserId: string) {
  await requireActiveWorkspaceRole(requesterId, workspaceId, ["OWNER", "ADMIN"]);

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (workspace?.ownerId === targetUserId) {
    throw new AppError("Cannot revoke the workspace owner.", 403, "FORBIDDEN");
  }

  const existing = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });
  if (!existing || existing.status !== "ACTIVE") {
    throw new AppError("Membership not found.", 404, "NOT_FOUND");
  }

  await db.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    data: { status: "REVOKED", policyVersion: { increment: 1 } },
  });

  try {
    await db.auditLog.create({
      data: {
        userId: requesterId,
        action: "WORKSPACE_MEMBER_REVOKED",
        targetResource: `workspace:${workspaceId}`,
        details: { targetUserId },
      },
    });
  } catch (_) {}

  return { success: true };
}

/**
 * Create Support Grant.
 * Time-limited, workspace-scoped elevation for platform staff. The approver must hold a
 * platform ADMIN/SUPER_ADMIN role; this cannot be requested by an ordinary workspace member.
 * @param workspaceId Identifier of the workspace containing the affected resources.
 * @param granteeId Grantee Id supplied to this operation (type: string).
 * @param reason Reason supplied to this operation (type: string).
 * @param approvedBy Approved By supplied to this operation (type: string).
 * @param ttlMs Ttl Ms supplied to this operation (type: number). Defaults to one hour.
 */
export async function createSupportGrant(
  workspaceId: string,
  granteeId: string,
  reason: string,
  approvedBy: string,
  ttlMs: number = 60 * 60 * 1000,
) {
  if (!reason || !reason.trim()) {
    throw new AppError("A reason is required for a support grant.", 400, "BAD_REQUEST");
  }
  const approver = await db.user.findUnique({ where: { id: approvedBy } });
  if (!approver || (approver.role !== "ADMIN" && approver.role !== "SUPER_ADMIN")) {
    throw new AppError("Only a platform administrator can approve support access.", 403, "FORBIDDEN");
  }
  if (ttlMs <= 0 || ttlMs > 24 * 60 * 60 * 1000) {
    throw new AppError("Support grants must expire within 24 hours.", 400, "BAD_REQUEST");
  }

  const grant = await db.supportGrant.create({
    data: {
      workspaceId,
      granteeId,
      reason: reason.trim(),
      approvedBy,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });

  try {
    await db.auditLog.create({
      data: {
        userId: approvedBy,
        action: "SUPPORT_GRANT_CREATED",
        targetResource: `workspace:${workspaceId}`,
        details: { granteeId, reason: reason.trim(), expiresAt: grant.expiresAt },
      },
    });
  } catch (_) {}

  return grant;
}

/**
 * Revoke Support Grant.
 * @param grantId Grant Id supplied to this operation (type: string).
 * @param revokedBy Revoked By supplied to this operation (type: string).
 */
export async function revokeSupportGrant(grantId: string, revokedBy: string) {
  const revoker = await db.user.findUnique({ where: { id: revokedBy } });
  if (!revoker || (revoker.role !== "ADMIN" && revoker.role !== "SUPER_ADMIN")) {
    throw new AppError("Only a platform administrator can revoke support access.", 403, "FORBIDDEN");
  }
  const grant = await db.supportGrant.findUnique({ where: { id: grantId } });
  if (!grant || grant.revokedAt) {
    throw new AppError("Support grant not found.", 404, "NOT_FOUND");
  }
  await db.supportGrant.update({ where: { id: grantId }, data: { revokedAt: new Date() } });

  try {
    await db.auditLog.create({
      data: {
        userId: revokedBy,
        action: "SUPPORT_GRANT_REVOKED",
        targetResource: `workspace:${grant.workspaceId}`,
        details: { grantId },
      },
    });
  } catch (_) {}

  return { success: true };
}

/**
 * Has Active Support Grant.
 * Fails closed on a database error (mirrors FS-003): an unavailable policy lookup is never
 * treated as an implicit allow.
 * @param workspaceId Identifier of the workspace containing the affected resources.
 * @param granteeId Grantee Id supplied to this operation (type: string).
 * @param client Client supplied to this operation (type: Prisma.TransactionClient). Defaults to prisma.
 */
export async function hasActiveSupportGrant(
  workspaceId: string,
  granteeId: string,
  client: Prisma.TransactionClient = prisma,
): Promise<boolean> {
  try {
    const grant = await (client as any).supportGrant.findFirst({
      where: {
        workspaceId,
        granteeId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return Boolean(grant);
  } catch (error) {
    throw new AppError(
      "Support access could not be evaluated. Try again later.",
      503,
      "AUTHORIZATION_UNAVAILABLE",
    );
  }
}
