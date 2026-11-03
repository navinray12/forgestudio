import type { WorkspaceDetails, WorkspaceSummary } from "./workspace-api";

export function workspaceDisplayName(workspace: WorkspaceSummary): string {
  const ownerName = workspace.owner?.id === workspace.ownerId ? workspace.owner?.fullName?.trim() : undefined;
  return ownerName ? `${ownerName}'s Workspace` : workspace.name;
}

export interface WorkspaceInvitation {
  id: string; recipientUserId: string | null; invitedEmail: string | null; role: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED"; version: number; expiresAt: string;
  emailStatus: "NONE" | "QUEUED" | "SENT" | "FAILED"; emailQueuedAt: string | null; emailSentAt: string | null;
}
export function invitationStatus(invitation: WorkspaceInvitation, now = Date.now()): string {
  return invitation.status === "PENDING" && Date.parse(invitation.expiresAt) <= now ? "EXPIRED" : invitation.status;
}
export function memberStatus(member: WorkspaceDetails["members"][number]): string {
  return member.membershipStatus?.trim() || (member.user.status !== "ACTIVE" ? member.user.status?.trim() : undefined) || "UNKNOWN";
}
export function memberDetails(member: WorkspaceDetails["members"][number]) {
  const email = member.user.email?.trim() || null;
  // Joined belongs to the membership, not the user's account creation date.
  const joined = member.createdAt && Number.isFinite(Date.parse(member.createdAt)) ? member.createdAt : null;
  return { name: member.user.fullName?.trim() || email || "Unnamed member", email, status: memberStatus(member), joined };
}
export function membersPermissions(workspace: WorkspaceDetails | null) {
  const manage = workspace?.userRole === "OWNER" || workspace?.userRole === "ADMIN";
  const writable = workspace?.lifecycleStatus === "ACTIVE";
  return { manage, invite: manage && writable, changeRoles: workspace?.userRole === "OWNER" && writable };
}
export function canResendInvitation(workspace: WorkspaceDetails | null, invitation: WorkspaceInvitation) {
  return membersPermissions(workspace).invite && invitation.status === "PENDING" &&
    (invitation.role !== "ADMIN" || workspace?.userRole === "OWNER");
}
export function resendWait(invitation: WorkspaceInvitation, now = Date.now()): number {
  return invitation.emailStatus !== "NONE" && invitation.emailQueuedAt
    ? Math.max(0, Math.ceil((Date.parse(invitation.emailQueuedAt) + 60_000 - now) / 1000)) : 0;
}
export function memberMatches(member: WorkspaceDetails["members"][number], query: string, role: string) {
  return `${member.user.fullName || ""} ${member.user.email || ""} ${member.role}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (role === "ALL" || member.role === role);
}
