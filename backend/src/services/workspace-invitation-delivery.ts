import { randomUUID } from "node:crypto";
import { invitationToken, invitationLink, matchesInvitationToken } from "./workspace-invitation-token.js";
export type InvitationMessage = { to: string; subject: string; text: string; messageId: string };
export function createInvitationDispatcher(db: any, send: (message: InvitationMessage) => Promise<void>) {
  return async function dispatch(): Promise<boolean> {
    const lease = randomUUID();
    const rows = await db.$queryRaw`
      WITH ready AS (
        SELECT id FROM workspace_email_invitations
        WHERE status='PENDING' AND "emailStatus"='QUEUED' AND "nextAttemptAt"<=now() AND "expiresAt">now()
          AND ("leaseUntil" IS NULL OR "leaseUntil"<now())
        ORDER BY "nextAttemptAt",id LIMIT 1 FOR UPDATE SKIP LOCKED
      ) UPDATE workspace_email_invitations i SET "leaseToken"=${lease}::uuid,"leaseUntil"=now()+interval '60 seconds',"emailAttempts"=i."emailAttempts"+1
        FROM ready WHERE i.id=ready.id RETURNING i.*`;
    const item = rows[0]; if (!item) return false;
    const where = { id: item.id, version: item.version, leaseToken: lease, leaseUntil: { gt: new Date() }, status: "PENDING" };
    try {
      const current = await db.workspaceEmailInvitation.findUnique({ where: { id: item.id }, include: { workspace: true, inviter: { select: { status: true } } } });
      const manager = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: item.workspaceId, userId: item.invitedBy } } });
      const token = invitationToken(item.id, item.version);
      if (!current || current.status !== "PENDING" || current.version !== item.version || current.leaseToken !== lease || current.expiresAt.getTime() <= Date.now() ||
          current.workspace.lifecycleStatus !== "ACTIVE" || current.inviter.status !== "ACTIVE" || !manager || !["OWNER", "ADMIN"].includes(manager.role) ||
          (item.role === "ADMIN" && current.workspace.ownerId !== item.invitedBy) || !matchesInvitationToken(token, current.tokenHash)) {
        await db.workspaceEmailInvitation.updateMany({ where, data: { emailStatus: "FAILED", leaseToken: null, leaseUntil: null } }); return true;
      }
      const link = invitationLink(item.id, token);
      await send({ to: item.invitedEmail, subject: `Invitation to ${current.workspace.name}`,
        messageId: `<workspace-invitation.${item.id}.${item.version}@${new URL(link).hostname}>`,
        text: `You are invited to join ${current.workspace.name} as ${item.role}.\n\nSign in or create an account using this email address, then accept:\n${link}\n\nExpires ${item.expiresAt.toISOString()}. Ignore this email if you did not expect it.` });
      await db.workspaceEmailInvitation.updateMany({ where, data: { emailStatus: "SENT", emailSentAt: new Date(), leaseToken: null, leaseUntil: null } });
    } catch {
      const terminal = item.emailAttempts >= 8;
      await db.workspaceEmailInvitation.updateMany({ where, data: { emailStatus: terminal ? "FAILED" : "QUEUED", leaseToken: null, leaseUntil: null,
        nextAttemptAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** Math.min(item.emailAttempts - 1, 7)) * 1000) } });
    }
    return true;
  };
}
export function startInvitationWorker(dispatch: () => Promise<boolean>): () => void {
  let busy = false;
  let reported = false;
  const tick = async () => {
    if (busy) return; busy = true;
    try { for (let count = 0; count < 10 && await dispatch(); count++) { /* Bounded batch with durable database leases. */ } reported = false; }
    catch { if (!reported) console.error("[Workspace invitations] Delivery queue unavailable; check database migration and email configuration."); reported = true; }
    finally { busy = false; }
  };
  const timer = setInterval(() => { void tick(); }, 5000); timer.unref(); void tick();
  return () => clearInterval(timer);
}
