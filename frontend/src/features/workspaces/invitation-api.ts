import { workspaceRequest, WorkspaceRequestError } from "./workspace-api";
import { workspaceIdPattern } from "./invitation-context";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
export interface ResolvedInvitation {
  id: string; workspaceId: string; workspaceName: string; role: "ADMIN" | "MEMBER"; expiresAt: string;
}
export async function resolveInvitation(id: string, token: string, signal: AbortSignal): Promise<ResolvedInvitation> {
  const result = await workspaceRequest<{ invitation: ResolvedInvitation }>(apiUrl, `/invitations/${id}/resolve`, {
    method: "POST", payload: { token }, signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  });
  const invitation = result.invitation;
  if (!invitation || invitation.id !== id || !workspaceIdPattern.test(invitation.workspaceId) ||
      typeof invitation.workspaceName !== "string" || !["ADMIN", "MEMBER"].includes(invitation.role) || !Number.isFinite(Date.parse(invitation.expiresAt)))
    throw new Error("Invalid invitation response");
  return invitation;
}
export async function acceptInvitation(id: string, token: string, workspaceId: string, key: string, signal: AbortSignal) {
  const result = await workspaceRequest<{ accepted: boolean; resourceId: string; invitationId: string }>(apiUrl,
    `/${workspaceId}/invitations/${id}/accept`, { method: "POST", payload: { token }, key,
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  if (!result.accepted || result.resourceId !== workspaceId || result.invitationId !== id) throw new Error("Invalid acceptance response");
}

export type InvitationFailure = "sign-in" | "unverified" | "wrong-account" | "unavailable" | "mfa" | "inactive" | "already-member" | "error";
export function invitationFailure(error: unknown): InvitationFailure {
  if (!(error instanceof WorkspaceRequestError)) return "error";
  if (error.status === 401) return "sign-in";
  if (error.code === "VERIFIED_IDENTITY_REQUIRED") return "unverified";
  if (["MFA_REQUIRED", "STRONG_MFA_REQUIRED"].includes(error.code)) return "mfa";
  if (error.code === "ACCOUNT_INACTIVE") return "inactive";
  if (error.status === 404) return "wrong-account";
  if (error.code === "MEMBERSHIP_EXISTS") return "already-member";
  if (["INVITATION_UNAVAILABLE", "WORKSPACE_READ_ONLY"].includes(error.code)) return "unavailable";
  return "error";
}
