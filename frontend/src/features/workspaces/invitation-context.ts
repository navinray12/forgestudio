const storageKey = "forge.workspace.pending-invitation";
const lifetimeMs = 60 * 60_000;
export const workspaceIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export interface PendingInvitation {
  id: string;
  token: string;
  savedAt: number;
  awaitingAuth: boolean;
  managedAuth?: boolean;
  attempt?: { actorId: string; workspaceId: string; key: string };
}
let memoryContext: PendingInvitation | null = null;

function validContext(value: PendingInvitation | null): value is PendingInvitation {
  return !!value && typeof value.id === "string" && workspaceIdPattern.test(value.id) && typeof value.token === "string" && /^[\w-]{43}$/.test(value.token) &&
    typeof value.savedAt === "number" && value.savedAt <= Date.now() && Date.now() - value.savedAt <= lifetimeMs &&
    typeof value.awaitingAuth === "boolean" && (value.managedAuth === undefined || typeof value.managedAuth === "boolean") && (!value.attempt || (typeof value.attempt.actorId === "string" && workspaceIdPattern.test(value.attempt.actorId) &&
      typeof value.attempt.workspaceId === "string" && workspaceIdPattern.test(value.attempt.workspaceId) && typeof value.attempt.key === "string" && workspaceIdPattern.test(value.attempt.key)));
}

export function readPendingInvitation(): PendingInvitation | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(storageKey) || "null");
    if (!validContext(value)) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }
    return value;
  } catch { return validContext(memoryContext) ? memoryContext : null; }
}

export function savePendingInvitation(value: PendingInvitation): boolean {
  try { window.sessionStorage.setItem(storageKey, JSON.stringify(value)); memoryContext = null; return true; }
  catch { memoryContext = value; return false; }
}

export function clearPendingInvitation(id: string) {
  if (memoryContext?.id === id) memoryContext = null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(storageKey) || "null");
    if (value?.id === id) window.sessionStorage.removeItem(storageKey);
  } catch { /* Storage can be disabled. Never clear unrelated browser data. */ }
}

/** Capture before rendering or sending requests. Proofs never enter query strings,
 * localStorage, navigation state, logs, or identity-provider requests. */
export function captureInvitation(id: string): PendingInvitation | null {
  const { hash, pathname, search } = window.location;
  if (hash) window.history.replaceState(window.history.state, "", pathname + search);
  if (!workspaceIdPattern.test(id)) return null;
  const previous = readPendingInvitation();
  if (!hash) {
    if (previous?.id !== id) return null;
    const resumed = { ...previous, awaitingAuth: false, managedAuth: false };
    savePendingInvitation(resumed);
    return resumed;
  }
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get("token");
  if (params.size !== 1 || !token || !/^[\w-]{43}$/.test(token)) {
    clearPendingInvitation(id);
    return null;
  }
  const invitation: PendingInvitation = previous?.id === id && previous.token === token
    ? { ...previous, awaitingAuth: false, managedAuth: false }
    : { id, token, savedAt: Date.now(), awaitingAuth: false };
  savePendingInvitation(invitation);
  return invitation;
}

export function beginInvitationAuthentication(invitation: PendingInvitation, mode: "login" | "signup"): string | null {
  if (!savePendingInvitation({ ...invitation, awaitingAuth: true, managedAuth: false })) {
    savePendingInvitation({ ...invitation, awaitingAuth: false, managedAuth: false });
    return null;
  }
  return `/${mode}?workspaceInvite=${invitation.id}`;
}

export function invitationReturnFromAuth(search: string): string | null {
  const params = new URLSearchParams(search);
  const id = params.get("workspaceInvite");
  const invitation = readPendingInvitation();
  return params.getAll("workspaceInvite").length === 1 && invitation?.awaitingAuth && id === invitation.id
    ? `/workspace-invitations/${invitation.id}` : null;
}

/** The existing managed-login callback returns here. Resume only an explicitly
 * started invitation login; ordinary dashboard visits retain their behavior. */
export function invitationReturnFromDashboard(): string | null {
  const invitation = readPendingInvitation();
  return invitation?.awaitingAuth && invitation.managedAuth ? `/workspace-invitations/${invitation.id}` : null;
}

export function markInvitationManagedAuthentication(search: string): boolean {
  const invitation = readPendingInvitation();
  return !!invitation && !!invitationReturnFromAuth(search) && savePendingInvitation({ ...invitation, managedAuth: true });
}

export function cancelInvitationManagedAuthentication() {
  const invitation = readPendingInvitation();
  if (invitation?.managedAuth) savePendingInvitation({ ...invitation, managedAuth: false });
}

export function invitationAuthLink(mode: "login" | "signup", search: string): string {
  const invitation = readPendingInvitation();
  return invitation && invitationReturnFromAuth(search) ? `/${mode}?workspaceInvite=${invitation.id}` : `/${mode}`;
}

export function acceptanceAttempt(invitation: PendingInvitation, actorId: string, workspaceId: string): PendingInvitation {
  const attempt = invitation.attempt?.actorId === actorId && invitation.attempt.workspaceId === workspaceId
    ? invitation.attempt : { actorId, workspaceId, key: crypto.randomUUID() };
  const value = { ...invitation, attempt };
  savePendingInvitation(value);
  return value;
}
