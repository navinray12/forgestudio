import { randomUUID } from "node:crypto";
import { AppError } from "../utils/app-error.js";
import { invitationEmail, invitationToken, invitationTokenHash, invitationLink, matchesInvitationToken } from "./workspace-invitation-token.js";

const lifetime = 7 * 24 * 60 * 60_000;
const safeInvitation = { id: true, workspaceId: true, recipientUserId: true, invitedEmail: true, role: true, status: true,
  version: true, expiresAt: true, createdAt: true, acceptedAt: true, emailStatus: true, emailQueuedAt: true, emailSentAt: true };
const userFields = { id: true, fullName: true, email: true, status: true, emailVerified: true };
export function createWorkspaceMembersService(db: any, assertDeliveryConfigured: () => void) {
  async function activeActor(tx: any, actorId: string, verified = false) {
    const user = await tx.user.findUnique({ where: { id: actorId }, select: userFields });
    if (!user || user.status !== "ACTIVE") throw new AppError("Account is not active", 403, "ACCOUNT_INACTIVE");
    if (verified && (!user.email || !user.emailVerified)) throw new AppError("Verify your email before continuing", 403, "VERIFIED_IDENTITY_REQUIRED");
    return user;
  }
  async function context(tx: any, actorId: string, workspaceId: string, manage = false, lock = false) {
    if (lock) await tx.$queryRaw`SELECT id FROM workspaces WHERE id=${workspaceId}::uuid FOR UPDATE`;
    await activeActor(tx, actorId);
    const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, include: { owner: { select: { id: true, fullName: true } } } });
    const membership = await tx.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: actorId } } });
    if (!workspace || !membership || !["OWNER", "ADMIN", "MEMBER"].includes(membership.role) || (membership.role === "OWNER" && workspace.ownerId !== actorId)) throw new AppError("Workspace not found or access denied", 404, "NOT_FOUND");
    if (manage && !["OWNER", "ADMIN"].includes(membership.role)) throw new AppError("Only owners and admins can manage invitations", 403, "FORBIDDEN");
    return { workspace, membership };
  }
  function writable(workspace: any) {
    if (workspace.lifecycleStatus !== "ACTIVE") throw new AppError("Workspace is archived or read only", 409, "WORKSPACE_READ_ONLY");
  }
  function ownerOnlyRole(context: any, role: string) {
    if (role === "ADMIN" && context.workspace.ownerId !== context.membership.userId)
      throw new AppError("Only the workspace owner can invite an admin", 403, "FORBIDDEN");
  }
  async function audit(tx: any, actorId: string, workspaceId: string, action: string, details: Record<string, unknown>) {
    await tx.auditLog.create({ data: { userId: actorId, action, targetResource: `workspace:${workspaceId}`, details } });
  }
  async function list(actorId: string) {
    await activeActor(db, actorId);
    const rows = await db.workspace.findMany({ where: { members: { some: { userId: actorId } } }, include: {
      members: { where: { userId: actorId }, select: { role: true } }, owner: { select: { id: true, fullName: true } },
    }, orderBy: { createdAt: "asc" } });
    return rows.map((row: any) => ({ id: row.id, name: row.name, slug: row.slug, ownerId: row.ownerId, owner: row.owner,
      organizationId: row.organizationId, version: row.membersVersion, lifecycleStatus: row.lifecycleStatus, userRole: row.members[0].role }));
  }
  async function read(actorId: string, workspaceId: string) {
    return db.$transaction(async (tx: any) => {
      const { workspace, membership } = await context(tx, actorId, workspaceId);
      const members = await tx.workspaceMember.findMany({ where: { workspaceId }, include: { user: { select: userFields } }, orderBy: { createdAt: "asc" }, take: 200 });
      return { ...workspace, version: workspace.membersVersion, lifecycleStatus: workspace.lifecycleStatus, userRole: membership.role,
        members: members.map((member: any) => ({ ...member, membershipStatus: member.user.status === "ACTIVE" ? "ACTIVE" : member.user.status })), websites: [], hasMoreWebsites: false };
    });
  }
  async function invitations(actorId: string, workspaceId: string) {
    return db.$transaction(async (tx: any) => {
      await context(tx, actorId, workspaceId, true);
      return tx.workspaceEmailInvitation.findMany({ where: { workspaceId }, select: safeInvitation, orderBy: { createdAt: "desc" }, take: 200 });
    });
  }
  async function invite(actorId: string, workspaceId: string, emailInput: string, role: "ADMIN" | "MEMBER", key: string) {
    const email = invitationEmail(emailInput);
    return db.$transaction(async (tx: any) => {
      const ctx = await context(tx, actorId, workspaceId, true, true); writable(ctx.workspace); ownerOnlyRole(ctx, role);
      const replay = await tx.workspaceEmailInvitation.findUnique({ where: { workspaceId_createRequestKey: { workspaceId, createRequestKey: key } } });
      if (replay) {
        if (replay.invitedBy !== actorId || replay.invitedEmail !== email || replay.role !== role) throw new AppError("Request key was already used", 409, "IDEMPOTENCY_CONFLICT");
        return { success: true, invitation: await tx.workspaceEmailInvitation.findUnique({ where: { id: replay.id }, select: safeInvitation }) };
      }
      assertDeliveryConfigured();
      const users = await tx.user.findMany({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true }, take: 2 });
      if (users.length > 1) throw new AppError("Recipient identity requires review", 409, "RECIPIENT_AMBIGUOUS");
      const recipientUserId = users[0]?.id || null;
      if (recipientUserId && await tx.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: recipientUserId } } }))
        throw new AppError("This user is already a member", 409, "MEMBERSHIP_EXISTS");
      if (await tx.workspaceEmailInvitation.findFirst({ where: { workspaceId, invitedEmail: email, status: "PENDING" } }))
        throw new AppError("Resend or revoke the existing invitation", 409, "INVITATION_EXISTS");
      if (await tx.workspaceEmailInvitation.count({ where: { workspaceId, status: "PENDING" } }) >= 200) throw new AppError("Pending invitation limit reached", 429, "INVITATION_LIMIT_EXCEEDED");
      if (await tx.workspaceEmailInvitation.count({ where: { invitedBy: actorId, createdAt: { gt: new Date(Date.now() - 3600_000) } } }) >= 100)
        throw new AppError("Invitation limit reached; try later", 429, "INVITATION_EMAIL_LIMIT");
      const id = randomUUID(); const token = invitationToken(id, 1); invitationLink(id, token);
      const invitation = await tx.workspaceEmailInvitation.create({ data: { id, workspaceId, invitedBy: actorId, recipientUserId, invitedEmail: email,
        role, createRequestKey: key, tokenHash: invitationTokenHash(token), expiresAt: new Date(Date.now() + lifetime) }, select: safeInvitation });
      await audit(tx, actorId, workspaceId, "WORKSPACE_INVITATION_CREATED", { invitationId: id, role });
      return { success: true, invitation };
    });
  }
  async function changeInvitation(actorId: string, workspaceId: string, id: string, action: "RENEW" | "REVOKE", version: number, key: string) {
    return db.$transaction(async (tx: any) => {
      const ctx = await context(tx, actorId, workspaceId, true, true);
      const invitation = await tx.workspaceEmailInvitation.findFirst({ where: { id, workspaceId } });
      if (!invitation) throw new AppError("Invitation not found", 404, "NOT_FOUND");
      if (invitation.lastCommandKey === key && invitation.lastCommandAction === action)
        return { success: true, invitation: await tx.workspaceEmailInvitation.findUnique({ where: { id }, select: safeInvitation }) };
      if (invitation.version !== version) throw new AppError("Invitation changed; refresh and try again", 412, "VERSION_CONFLICT");
      if (invitation.status !== "PENDING") throw new AppError("Invitation is no longer pending", 409, "INVITATION_UNAVAILABLE");
      if (action === "RENEW") {
        writable(ctx.workspace); ownerOnlyRole(ctx, invitation.role); assertDeliveryConfigured();
        if (Date.now() - invitation.emailQueuedAt.getTime() < 60_000) throw new AppError("Wait one minute before resending", 429, "INVITATION_RESEND_LIMIT");
      }
      const token = action === "RENEW" ? invitationToken(id, version + 1) : null;
      const updated = await tx.workspaceEmailInvitation.update({ where: { id }, data: { version: { increment: 1 },
        status: action === "REVOKE" ? "REVOKED" : "PENDING", lastCommandKey: key, lastCommandAction: action,
        leaseUntil: null, leaseToken: null,
        ...(token ? { tokenHash: invitationTokenHash(token), expiresAt: new Date(Date.now() + lifetime), invitedBy: actorId,
          emailStatus: "QUEUED", emailQueuedAt: new Date(), emailSentAt: null, emailAttempts: 0, nextAttemptAt: new Date() } : {}),
      }, select: safeInvitation });
      await audit(tx, actorId, workspaceId, `WORKSPACE_INVITATION_${action}`, { invitationId: id });
      return { success: true, invitation: updated };
    });
  }
  async function recipient(tx: any, actorId: string, id: string, token: string, workspaceId?: string) {
    const user = await activeActor(tx, actorId, true);
    const invitation = await tx.workspaceEmailInvitation.findUnique({ where: { id } });
    if (!invitation || (workspaceId && invitation.workspaceId !== workspaceId) || invitation.invitedEmail !== invitationEmail(user.email) ||
        (invitation.recipientUserId && invitation.recipientUserId !== actorId) || !matchesInvitationToken(token, invitation.tokenHash))
      throw new AppError("Invitation not available for this account", 404, "NOT_FOUND");
    return invitation;
  }
  async function resolve(actorId: string, id: string, token: string) {
    return db.$transaction(async (tx: any) => {
      const invitation = await recipient(tx, actorId, id, token);
      if (invitation.status !== "PENDING" || invitation.expiresAt.getTime() <= Date.now()) throw new AppError("Invitation expired or unavailable", 409, "INVITATION_UNAVAILABLE");
      const workspace = await tx.workspace.findUnique({ where: { id: invitation.workspaceId } });
      if (!workspace || workspace.lifecycleStatus !== "ACTIVE") throw new AppError("Workspace unavailable", 409, "INVITATION_UNAVAILABLE");
      return { invitation: { id, workspaceId: invitation.workspaceId, workspaceName: workspace.name, role: invitation.role, expiresAt: invitation.expiresAt } };
    });
  }
  async function accept(actorId: string, workspaceId: string, id: string, token: string) {
    return db.$transaction(async (tx: any) => {
      // Serialize acceptance with renew/revoke/role commands for this workspace.
      await tx.$queryRaw`SELECT id FROM workspaces WHERE id=${workspaceId}::uuid FOR UPDATE`;
      const invitation = await recipient(tx, actorId, id, token, workspaceId);
      const existing = await tx.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: actorId } } });
      if (invitation.status === "ACCEPTED" && invitation.recipientUserId === actorId && existing)
        return { accepted: true, resourceId: workspaceId, invitationId: id };
      if (invitation.status !== "PENDING" || invitation.expiresAt.getTime() <= Date.now()) throw new AppError("Invitation expired or unavailable", 409, "INVITATION_UNAVAILABLE");
      const ctx = await context(tx, invitation.invitedBy, workspaceId, true); writable(ctx.workspace); ownerOnlyRole(ctx, invitation.role);
      if (!existing) await tx.workspaceMember.create({ data: { workspaceId, userId: actorId, role: invitation.role } });
      // Existing membership is preserved; accepting an old invitation never changes an existing role.
      await tx.workspaceEmailInvitation.update({ where: { id }, data: { status: "ACCEPTED", recipientUserId: actorId, acceptedAt: new Date(), version: { increment: 1 }, leaseToken: null, leaseUntil: null } });
      await tx.workspace.update({ where: { id: workspaceId }, data: { membersVersion: { increment: 1 } } });
      await audit(tx, actorId, workspaceId, "WORKSPACE_INVITATION_ACCEPTED", { invitationId: id });
      return { accepted: true, resourceId: workspaceId, invitationId: id };
    });
  }
  async function changeRole(actorId: string, workspaceId: string, userId: string, role: "ADMIN" | "MEMBER", version: number) {
    return db.$transaction(async (tx: any) => {
      const { workspace } = await context(tx, actorId, workspaceId, true, true);
      writable(workspace);
      if (workspace.ownerId !== actorId) throw new AppError("Only the owner can change member roles", 403, "FORBIDDEN");
      const target = await tx.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
      if (!target) throw new AppError("Member not found", 404, "NOT_FOUND");
      if (userId === workspace.ownerId || target.role === "OWNER") throw new AppError("The owner's role cannot be changed", 403, "FORBIDDEN");
      await activeActor(tx, userId);
      if (target.role === role) return { success: true };
      if (workspace.membersVersion !== version) throw new AppError("Members changed; refresh and try again", 412, "VERSION_CONFLICT");
      await tx.workspaceMember.update({ where: { workspaceId_userId: { workspaceId, userId } }, data: { role } });
      await tx.workspace.update({ where: { id: workspaceId }, data: { membersVersion: { increment: 1 } } });
      await audit(tx, actorId, workspaceId, "WORKSPACE_MEMBER_ROLE_CHANGED", { userId, role });
      return { success: true };
    });
  }
  return { list, read, invitations, invite, changeInvitation, resolve, accept, changeRole };
}
