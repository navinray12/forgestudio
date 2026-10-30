import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { acceptInvitation, resolveInvitation, invitationFailure } from "./invitation-api";
import type { InvitationFailure, ResolvedInvitation } from "./invitation-api";
import { acceptanceAttempt, beginInvitationAuthentication, captureInvitation, clearPendingInvitation } from "./invitation-context";
import { notifyMembersChanged } from "./members-sync";

type View = InvitationFailure | "loading" | "ready" | "recover";
const primary = "w-full rounded bg-blue-600 p-3 font-medium text-white disabled:opacity-50";
const secondary = "w-full rounded border border-slate-500 p-3 disabled:opacity-50";
const messages: Record<InvitationFailure | "recover", string> = {
  "sign-in": "Sign in or create an account using the email address that received this invitation. If your session expired, sign in again.",
  unverified: "Your email must be verified before you can accept. Sign in again to complete email verification, or verify it through your identity provider.",
  "wrong-account": "This invitation is not available for this account, or the link is invalid. Use the email address that received the invitation, or ask the workspace owner for a new link.",
  unavailable: "This invitation has expired, was revoked, or is no longer pending. Ask the workspace owner for a new invitation.",
  mfa: "Sign in again using the required multi-factor method, then return here to accept your invitation.",
  inactive: "This account is not active. Use another account or contact your workspace owner.",
  "already-member": "You already have access to this workspace.",
  error: "We could not complete the request. Check your connection and try again.",
  recover: "This invitation is no longer pending. If your previous acceptance succeeded, you can check its result safely.",
};

export default function WorkspaceInvitationPage() {
  const { invitationId = "" } = useParams();
  const location = useLocation();
  // Opening a renewed email in this tab can be fragment-only navigation. Remount
  // to capture its new proof rather than retaining the previous link's state.
  return <InvitationFlow key={`${invitationId}:${location.key}:${location.hash}`} invitationId={invitationId} />;
}

function InvitationFlow({ invitationId }: { invitationId: string }) {
  const [invitation] = useState(() => captureInvitation(invitationId));
  const pending = useRef(invitation);
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("loading");
  const [viewActor, setViewActor] = useState<string | null>(null);
  const [resolution, setResolution] = useState<{ actorId: string; invitation: ResolvedInvitation } | null>(null);
  const [revision, setRevision] = useState(0);
  const [busyActor, setBusyActor] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const mounted = useRef(false);
  const operation = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const details = resolution?.actorId === user?.id ? resolution?.invitation : null;
  const actorId = user?.id;
  const emailVerified = user?.emailVerified;
  const accountStatus = user?.status;
  const busy = busyActor === (actorId ?? "anonymous");
  const setBusy = (value: boolean) => setBusyActor(value ? actorId ?? "anonymous" : null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; operation.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!invitation || loading || !actorId || !emailVerified || accountStatus !== "ACTIVE") return;
    const controller = new AbortController();
    operation.current = controller;
    submitting.current = false;
    void resolveInvitation(invitation.id, invitation.token, controller.signal).then(result => {
      if (!controller.signal.aborted) {
        setBusyActor(null); setViewActor(actorId);
        setResolution({ actorId, invitation: result }); setView("ready");
      }
    }).catch(error => {
      if (controller.signal.aborted) return;
      setBusyActor(null); setViewActor(actorId); setResolution(null);
      const failure = invitationFailure(error);
      if (failure === "unavailable" && pending.current?.attempt?.actorId === actorId) setView("recover");
      else {
        if (failure === "unavailable") clearPendingInvitation(invitation.id);
        setView(failure);
      }
    });
    return () => controller.abort();
  }, [invitation, loading, actorId, emailVerified, accountStatus, revision]);

  async function authenticate(mode: "login" | "signup") {
    if (!pending.current || submitting.current) return;
    const destination = beginInvitationAuthentication(pending.current, mode);
    if (!destination) {
      setActionError("Your browser could not save this invitation. Allow session storage, or sign in separately and reopen the original email link.");
      return;
    }
    submitting.current = true; setBusy(true); setActionError("");
    try {
      // This also clears stale AuthContext state after a 401. Keep the invitation
      // until authentication completes; a failed logout must not lose the proof.
      if (user) await logout();
      if (mounted.current) window.location.assign(destination);
    } catch {
      if (mounted.current) setActionError("We could not sign you out. Check your connection and try again.");
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function openWorkspace(workspaceId: string) {
    clearPendingInvitation(invitationId);
    notifyMembersChanged(workspaceId);
    try { localStorage.setItem(`forgestudio.workspace.${user?.id}`, workspaceId); } catch { /* Optional storage. */ }
    navigate(`/dashboard/workspaces/${workspaceId}`, { replace: true });
  }

  async function accept() {
    if (!pending.current || !user?.emailVerified || user.status !== "ACTIVE" || submitting.current) return;
    const workspaceId = details?.workspaceId ?? (view === "recover" && pending.current.attempt?.actorId === user.id ? pending.current.attempt.workspaceId : null);
    if (!workspaceId) return;
    const controller = operation.current;
    if (!controller || controller.signal.aborted) return;
    pending.current = acceptanceAttempt(pending.current, user.id, workspaceId);
    submitting.current = true; setBusy(true); setActionError("");
    try {
      await acceptInvitation(pending.current.id, pending.current.token, workspaceId, pending.current.attempt!.key, controller.signal);
      if (!controller.signal.aborted && mounted.current) openWorkspace(workspaceId);
    } catch (error) {
      if (controller.signal.aborted || !mounted.current) return;
      const failure = invitationFailure(error);
      if (failure === "unavailable") clearPendingInvitation(invitationId);
      setView(failure);
    } finally {
      if (operation.current === controller) {
        submitting.current = false;
        if (!controller.signal.aborted && mounted.current) setBusy(false);
      }
    }
  }

  const current: View = loading ? "loading" : !user ? "sign-in" : user.status !== "ACTIVE" ? "inactive" : !user.emailVerified ? "unverified" : viewActor !== user.id ? "loading" : view;
  const authAction = ["sign-in", "wrong-account", "unverified", "mfa", "inactive"].includes(current);
  return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 space-y-5" aria-labelledby="invitation-title">
      <Mail size={28} aria-hidden="true" className="text-blue-400" />
      <p className="text-sm uppercase tracking-widest text-slate-400">Forge Studio</p>
      <h1 id="invitation-title" className="text-3xl font-semibold">Workspace invitation</h1>
      {!invitation ? <p role="alert">This invitation link is missing or invalid. Reopen the complete link from your email or ask the workspace owner for a new one.</p> : <>
        {user && <p className="text-sm text-slate-300">Signed in as {user.email || "your account"}</p>}
        {current === "loading" ? <p role="status">Checking your invitation…</p> : current === "ready" && details ? <>
          <div className="rounded border border-slate-600 p-4 space-y-2">
            <h2 className="text-xl font-semibold">Join {details.workspaceName}</h2>
            <p><ShieldCheck size={16} aria-hidden="true" className="inline" /> Role: {details.role === "ADMIN" ? "Admin" : "Member"}</p>
            <p className="text-sm text-slate-300">Expires {new Date(details.expiresAt).toLocaleString()}</p>
          </div>
          <button className={primary} disabled={busy} onClick={() => void accept()}>{busy ? "Accepting…" : "Accept invitation"}</button>
        </> : <>
          <p role={current === "sign-in" ? "status" : "alert"}>{messages[current as InvitationFailure | "recover"]}</p>
          {current === "error" && <button className={primary} disabled={busy} onClick={() => {
            if (details) void accept(); else { setView("loading"); setRevision(value => value + 1); }
          }}>
            {busy ? "Please wait…" : details ? "Try accepting again" : "Try again"}</button>}
          {current === "recover" && <button className={primary} disabled={busy} onClick={() => void accept()}>{busy ? "Checking…" : "Check acceptance"}</button>}
          {current === "already-member" && details && <button className={primary} onClick={() => openWorkspace(details.workspaceId)}>Open workspace dashboard</button>}
        </>}
        {authAction && <div className="space-y-3">
          <button className={primary} disabled={busy} onClick={() => void authenticate("login")}>
            {busy ? "Please wait…" : current === "wrong-account" || current === "inactive" ? "Use a different account" : user ? "Sign in again" : "Sign in"}</button>
          {current === "sign-in" && <button className={secondary} disabled={busy} onClick={() => void authenticate("signup")}>Create an account</button>}
        </div>}
      </>}
      {actionError && <p role="alert" className="text-red-300">{actionError}</p>}
    </section>
  </main>;
}
