import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Clock3, Mail, RefreshCw, Search, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import { workspaceRequest, WorkspaceRequestError } from "./workspace-api";
import type { useMembersData } from "./use-members-data";
import { canResendInvitation, invitationStatus, memberDetails, memberMatches, membersPermissions, memberStatus, resendWait, workspaceDisplayName } from "./members-model";
import type { WorkspaceInvitation } from "./members-model";
import "./MembersView.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const roleName = (role: string) => role === "OWNER" ? "Owner" : role === "ADMIN" ? "Admin" : "Member";
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?"; }
function date(value?: string | null) { return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString() : "—"; }
function deliveryName(invitation: WorkspaceInvitation) {
  return { NONE: "In-app invitation", QUEUED: "Email queued", SENT: "Email sent", FAILED: "Delivery failed" }[invitation.emailStatus] || "Delivery status unavailable";
}

type Command = { kind: "invite" | "resend" | "revoke" | "role"; path: string; method: string; payload: unknown; etag?: string;
  invitation?: WorkspaceInvitation; target?: { role: string; status: string }; success: string };

export default function MembersView({ data }: { data: ReturnType<typeof useMembersData> }) {
  const { workspace, invitations } = data;
  const permissions = membersPermissions(workspace);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [inviteWorkspace, setInviteWorkspace] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteError, setInviteError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const commandInFlight = useRef(false);
  const keys = useRef(new Map<string, string>());
  const mounted = useRef(false);
  const commandController = useRef<AbortController | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const inviteOpen = !!workspace && inviteWorkspace === workspace.id;
  const effectiveInviteRole = workspace?.userRole === "OWNER" ? inviteRole : "MEMBER";

  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => { mounted.current = false; window.clearInterval(timer); commandController.current?.abort(); };
  }, []);
  useEffect(() => { if (!inviteOpen) opener.current?.focus(); }, [inviteOpen]);

  const members = useMemo(() => (workspace?.members || []).filter(member => memberMatches(member, query, roleFilter)), [workspace?.members, query, roleFilter]);
  const pending = invitations.filter(item => item.status === "PENDING");
  const history = invitations.filter(item => item.status !== "PENDING");
  const activePending = pending.filter(item => invitationStatus(item, now) === "PENDING").length;
  const label = (item: WorkspaceInvitation) => item.invitedEmail || workspace?.members.find(member => member.userId === item.recipientUserId)?.user.email || "Organization member";

  function openInvite() {
    if (!workspace || !permissions.invite || busy) return;
    opener.current = document.activeElement as HTMLElement | null;
    setInviteError(""); setInviteWorkspace(workspace.id);
  }
  function closeInvite() { if (!commandInFlight.current) setInviteWorkspace(null); }
  function modalKeyboard(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") { event.preventDefault(); closeInvite(); }
    if (event.key !== "Tab") return;
    const controls = event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),select:not(:disabled)");
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  async function command(input: Command): Promise<boolean> {
    if (!workspace || data.sessionExpired || commandInFlight.current) return false;
    const allowed = input.kind === "invite" ? permissions.invite : input.kind === "role"
      ? permissions.changeRoles && input.target?.role !== "OWNER" && input.target?.status === "ACTIVE"
      : input.kind === "resend" ? !!input.invitation && canResendInvitation(workspace, input.invitation) && resendWait(input.invitation) === 0
      : permissions.manage && input.invitation?.status === "PENDING";
    const report = (message: string) => input.kind === "invite" ? setInviteError(message) : setActionError(message);
    if (!allowed) { report("You do not have permission to perform this action, or the invitation is not ready to resend."); return false; }
    const identity = JSON.stringify({ workspaceId: workspace.id, path: input.path, method: input.method, payload: input.payload, etag: input.etag });
    if (!keys.current.has(identity)) keys.current.set(identity, crypto.randomUUID());
    const controller = new AbortController(); commandController.current = controller;
    commandInFlight.current = true; data.setRefreshPaused(true);
    setBusy(true); setActionError(""); setInviteError(""); setNotice("");
    try {
      const result = await workspaceRequest<{ success?: boolean }>(apiUrl, `/${workspace.id}${input.path}`, { method: input.method,
        payload: input.payload, key: keys.current.get(identity), etag: input.etag,
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
      if (controller.signal.aborted || !mounted.current) return false;
      if (result.success === false) throw new Error("The request was not completed.");
      keys.current.delete(identity); setNotice(input.success);
      // A successful command remains successful if its subsequent read fails.
      // The page shows the refresh error instead of inviting a duplicate send.
      await data.refresh();
      return true;
    } catch (failure) {
      if (controller.signal.aborted || !mounted.current) return false;
      if (failure instanceof WorkspaceRequestError && failure.status === 401) data.expireSession(failure.message);
      else {
        report(failure instanceof Error ? failure.message : "The request failed. Try again.");
        if (failure instanceof WorkspaceRequestError && [403, 409, 412, 428].includes(failure.status)) await data.load();
      }
      return false;
    } finally {
      commandInFlight.current = false; data.setRefreshPaused(false);
      if (mounted.current) setBusy(false);
    }
  }
  async function invite(event: FormEvent) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !permissions.invite) return;
    const success = await command({ kind: "invite", path: "/invitations", method: "POST", payload: { email: normalized, role: effectiveInviteRole },
      success: `Invitation email queued for ${normalized}.` });
    if (success && mounted.current) { setInviteWorkspace(null); setEmail(""); setInviteRole("MEMBER"); }
  }
  async function invitationAction(item: WorkspaceInvitation, revoke: boolean) {
    await command({ kind: revoke ? "revoke" : "resend", path: `/invitations/${item.id}/${revoke ? "revoke" : "renew"}`,
      method: "POST", payload: {}, etag: `"${item.id}:${item.version}"`, invitation: item,
      success: revoke ? "Invitation revoked." : item.emailStatus === "NONE" ? "Invitation renewed." : "Invitation email queued again." });
  }

  if (data.sessionExpired) return <div className="members-page"><div className="members-alert" role="alert">{data.error}<a href="/login">Sign in again</a></div></div>;

  return <div className="members-page">
    {(data.error || actionError) && <div className="members-alert" role="alert">{actionError || data.error}<button disabled={busy} onClick={() => { setActionError(""); void data.refresh(); }}>Try again</button></div>}
    {notice && <div className="members-success" role="status">{notice}</div>}
    <div className="members-layout"><main>
      <div className="members-hero"><p className="members-kicker">WORKSPACE SETTINGS</p><div className="members-hero-row"><div>
        <h1>Members</h1><p>Invite team members to collaborate in your workspace and assign default roles across sites.</p>
        <p>Workspace roles control shared access. Manage site-specific permissions in Site settings &gt; Site access.</p>
        <a href="#permissions">Learn how to manage seats and assign roles</a>
      </div><Users size={35} /></div></div>
      <div className="members-toolbar">
        <label className="members-search"><Search size={16} /><input aria-label="Search members" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search members..." /></label>
        <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} aria-label="Filter members"><option value="ALL">All roles</option><option value="OWNER">Owner</option><option value="ADMIN">Admin</option><option value="MEMBER">Member</option></select>
        <button className="members-icon-button" disabled={busy || data.loading || data.refreshing} onClick={() => void data.refresh()} aria-label="Refresh members"><RefreshCw size={15} className={data.refreshing ? "members-spin" : ""} /></button>
        {permissions.invite && <button className="members-primary" disabled={busy} onClick={openInvite}><UserPlus size={15} /> Invite member</button>}
      </div>
      {data.loading && <div className="members-empty" role="status">Loading workspace members...</div>}
      {!workspace && !data.loading && !data.error && <div className="members-empty">No workspaces are available for this account.</div>}
      {workspace && <>
        <p className="members-workspace-name">{workspaceDisplayName(workspace)}{workspace.lifecycleStatus === "ARCHIVED" && " · Archived — invitations and role changes are disabled"}</p>
        <div className="members-table-card" role="table" aria-label="Workspace members">
          <div className="members-table-head" role="row"><span role="columnheader">Name</span><span role="columnheader">Role</span><span role="columnheader">Status</span><span role="columnheader">Joined</span></div>
          {members.length === 0 ? <div className="members-empty">{query || roleFilter !== "ALL" ? "No members match your filters." : "No members found."}</div> : members.map(member => {
            const { name, email: memberEmail, status, joined } = memberDetails(member);
            return <div className="member-row" role="row" key={member.id}>
              <div className="member-identity" role="cell"><span className="member-avatar">{initials(name)}</span><div><strong>{name}{member.role === "OWNER" && <em>Owner</em>}</strong>
                <small>{memberEmail || "Email unavailable"}</small>{member.user.emailVerified === false && <small>Email not verified</small>}</div></div>
              <div className="member-role" role="cell">{permissions.changeRoles && member.role !== "OWNER" && status === "ACTIVE" ? <select aria-label={`Role for ${name}`} value={member.role} disabled={busy}
                onChange={event => void command({ kind: "role", path: "/member-role", method: "PATCH", payload: { userId: member.userId, role: event.target.value },
                  etag: `"${workspace.id}:${workspace.version}"`, target: { role: member.role, status }, success: "Member role updated." })}><option value="ADMIN">Admin</option><option value="MEMBER">Member</option></select> : roleName(member.role)}</div>
              <div role="cell"><span className={`members-badge ${status.toLowerCase()}`}>{status === "UNKNOWN" ? "Status unavailable" : status.charAt(0) + status.slice(1).toLowerCase()}</span></div>
              <span className="member-joined" role="cell">{joined ? <time dateTime={joined}>{date(joined)}</time> : "—"}</span>
            </div>;
          })}
        </div>
        {workspace.members.length >= 200 && <p className="members-workspace-name">Showing the first 200 workspace members.</p>}
        <section className="guest-section"><div className="guest-heading"><div><h2>Guests &amp; collaborators</h2><p>Invite external collaborators by email. Their workspace access starts after they accept.</p></div>{permissions.invite && <button className="members-outline" disabled={busy} onClick={openInvite}>Invite guest</button>}</div>
          <div className="guest-grid"><div className="info-card"><div className="info-card-icon"><Users size={17} /></div><h3>External collaborators</h3><p>Guests use the same workspace roles and permissions as other members.</p>
            <div className="guest-avatars" aria-hidden="true">{workspace.members.slice(0, 4).map(member => <span key={member.id}>{initials(member.user.fullName || member.user.email || "Member")}</span>)}</div>
            <button className="members-primary full" disabled={busy || !permissions.invite} onClick={openInvite}>Invite guest</button></div>
            <div className="info-card" id="permissions"><div className="info-card-icon"><ShieldCheck size={17} /></div><h3>Access &amp; permissions</h3><p>Control what members can access across your workspace.</p>
              {["ADMIN", "MEMBER"].map(role => <div className="permission-row" key={role}><span className={`permission-dot ${role.toLowerCase()}`}><ShieldCheck size={13} /></span><div><strong>{roleName(role)}</strong><small>{role === "ADMIN" ? "Manage workspace members" : "Access assigned sites"}</small></div><b>{workspace.members.filter(member => member.role === role && memberStatus(member) === "ACTIVE").length}</b></div>)}
            </div></div>
        </section>
        {permissions.manage && <section className="pending-section" aria-label="Workspace invitations"><div><h2><Mail size={16} /> Pending invitations · {activePending}</h2>
          <p>Access is granted only after acceptance. Expired invitations can be renewed or revoked.</p></div>
          {pending.length === 0 && <p className="members-empty">No pending invitations.</p>}
          {pending.map(item => { const status = invitationStatus(item, now); const wait = resendWait(item, now); return <div className="pending-row" key={item.id}>
            <span className="member-avatar small">{initials(label(item))}</span><div><strong>{label(item)}</strong><small>{roleName(item.role)} · {status === "EXPIRED" ? "Expired" : "Expires"} {date(item.expiresAt)}</small>
              <div className="invitation-badges"><span className={`members-badge ${status.toLowerCase()}`}>{status === "EXPIRED" ? "Expired" : "Pending"}</span>
                <span className={`members-badge delivery-${item.emailStatus?.toLowerCase()}`} title={item.emailStatus === "SENT" ? "Accepted by the mail server; inbox delivery is not confirmed." : undefined}>{deliveryName(item)}</span></div></div>
            {canResendInvitation(workspace, item) && <button disabled={busy || wait > 0} onClick={() => void invitationAction(item, false)} title={wait > 0 ? `Available in ${wait} seconds` : undefined} aria-label={`${item.emailStatus === "NONE" ? "Renew" : "Resend"} invitation to ${label(item)}`}>{item.emailStatus === "NONE" ? "Renew" : "Resend"}{wait > 0 && ` (${wait}s)`}</button>}
            <button disabled={busy} onClick={() => void invitationAction(item, true)} aria-label={`Revoke invitation to ${label(item)}`}>Revoke</button>
          </div>; })}
          {history.length > 0 && <details className="invitation-history"><summary>Invitation history · {history.length}</summary>{history.map(item => <div className="pending-row" key={item.id}><div><strong>{label(item)}</strong><small>{roleName(item.role)}</small></div><span className={`members-badge ${item.status.toLowerCase()}`}>{item.status === "ACCEPTED" ? "Accepted" : "Revoked"}</span></div>)}</details>}
          {invitations.length >= 200 && <p className="members-workspace-name">Showing the latest 200 invitations.</p>}
        </section>}
      </>}
    </main><aside className="events-panel"><div className="events-title"><h2><Clock3 size={16} /> Upcoming events</h2><a href="#events">View all</a></div><div className="event-card"><span className="event-status">Live · Workspace</span><h3>Collaborate with your team</h3><p>Invite members to build and publish sites together.</p><button onClick={openInvite} disabled={busy || !permissions.invite}>Invite member</button></div></aside></div>
    {inviteOpen && <div className="members-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeInvite(); }}>
      <form className="members-modal" role="dialog" aria-modal="true" aria-labelledby="members-invite-title" onSubmit={invite} onKeyDown={modalKeyboard}>
        <button type="button" className="members-modal-close" disabled={busy} onClick={closeInvite} aria-label="Close invitation"><X size={17} /></button><UserPlus size={22} className="members-modal-icon" />
        <h2 id="members-invite-title">Invite a member</h2><p>Send an invitation to an email address. New users can create an account before accepting.</p>
        {inviteError && <div className="members-alert" role="alert">{inviteError}</div>}
        {!permissions.invite && <div className="members-alert" role="alert">You no longer have permission to invite members.</div>}
        <label>Email address<input aria-label="Email address" autoFocus type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} autoComplete="email" /></label>
        <label>Role<select aria-label="Role" value={effectiveInviteRole} onChange={event => setInviteRole(event.target.value)} disabled={busy || !permissions.invite}><option value="MEMBER">Member</option>{workspace.userRole === "OWNER" && <option value="ADMIN">Admin</option>}</select></label>
        <div className="members-modal-actions"><button type="button" className="members-outline" disabled={busy} onClick={closeInvite}>Cancel</button><button className="members-primary" disabled={busy || !email.trim() || !permissions.invite}>{busy ? "Sending..." : "Send invite"}</button></div>
      </form></div>}
  </div>;
}
