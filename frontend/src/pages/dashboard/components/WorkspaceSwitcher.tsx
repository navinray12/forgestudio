import React, { useState, useEffect } from "react";

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  userRole?: string;
  _count?: {
    members?: number;
    websites?: number;
  };
}

export interface WorkspaceMemberInfo {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user?: {
    id: string;
    fullName?: string;
    email?: string;
  };
}

export interface WorkspaceInvitationInfo {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
  inviter?: {
    id: string;
    fullName?: string;
    email?: string;
  };
}

interface WorkspaceSwitcherProps {
  apiUrl: string;
  currentWorkspaceId: string | null;
  onSelectWorkspace: (id: string | null) => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  apiUrl,
  currentWorkspaceId,
  onSelectWorkspace,
}) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);

  // Pending user invitations
  const [pendingInvitations, setPendingInvitations] = useState<WorkspaceInvitationInfo[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  // Manage workspace members & invitations modal
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeWorkspaceMembers, setActiveWorkspaceMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [sentInvitations, setSentInvitations] = useState<WorkspaceInvitationInfo[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Role management state
  const [activeWorkspaceOwnerId, setActiveWorkspaceOwnerId] = useState<string | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{
    member: WorkspaceMemberInfo;
    targetRole: "ADMIN" | "MEMBER";
  } | null>(null);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);
  const [roleChangeError, setRoleChangeError] = useState("");
  const [roleChangeSuccess, setRoleChangeSuccess] = useState("");

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/workspaces`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const list = data.workspaces || [];
        setWorkspaces(list);
        if (currentWorkspaceId && currentWorkspaceId !== "all" && currentWorkspaceId !== "personal" && !list.some((w: WorkspaceItem) => w.id === currentWorkspaceId)) {
          onSelectWorkspace("all");
        }
      } else if (res.status === 401 || res.status === 403) {
        setWorkspaces([]);
        if (currentWorkspaceId && currentWorkspaceId !== "all") onSelectWorkspace("all");
      }
    } catch {
      // Fallback
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/workspaces/invitations/pending`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPendingInvitations(data.invitations || []);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchWorkspaces();
      fetchPendingInvitations();
    });
  }, [apiUrl]);

  const activeWs = workspaces.find((w) => w.id === currentWorkspaceId);
  const canManageWorkspace =
    Boolean(currentWorkspaceId) &&
    currentWorkspaceId !== "all" &&
    currentWorkspaceId !== "personal" &&
    (activeWs?.userRole === "OWNER" || activeWs?.userRole === "ADMIN");

  const openManageModal = async () => {
    if (!currentWorkspaceId) return;
    setIsManageModalOpen(true);
    setInviteError("");
    setInviteSuccess("");
    setModalLoading(true);
    try {
      const [wsRes, invRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/workspaces/${currentWorkspaceId}`, { credentials: "include" }),
        fetch(`${apiUrl}/api/v1/workspaces/${currentWorkspaceId}/invitations`, { credentials: "include" }),
      ]);
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setActiveWorkspaceMembers(wsData.workspace?.members || []);
        setActiveWorkspaceOwnerId(wsData.workspace?.ownerId || null);
      }
      if (invRes.ok) {
        const invData = await invRes.json();
        setSentInvitations(invData.invitations || []);
      }
    } catch {
      // Fallback
    } finally {
      setModalLoading(false);
    }
  };

  const handleExecuteRoleChange = async () => {
    if (!currentWorkspaceId || !confirmRoleChange) return;
    setRoleChangeLoading(true);
    setRoleChangeError("");
    setRoleChangeSuccess("");
    try {
      const res = await fetch(
        `${apiUrl}/api/v1/workspaces/${currentWorkspaceId}/members/${confirmRoleChange.member.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ role: confirmRoleChange.targetRole }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setRoleChangeError(data?.error?.message || data?.message || "Failed to update member role");
      } else {
        setRoleChangeSuccess(
          `Successfully updated role to ${confirmRoleChange.targetRole} for ${
            confirmRoleChange.member.user?.fullName || confirmRoleChange.member.user?.email || "member"
          }!`
        );
        setConfirmRoleChange(null);
        // Refresh members list
        const wsRes = await fetch(`${apiUrl}/api/v1/workspaces/${currentWorkspaceId}`, {
          credentials: "include",
        });
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setActiveWorkspaceMembers(wsData.workspace?.members || []);
          setActiveWorkspaceOwnerId(wsData.workspace?.ownerId || null);
        }
      }
    } catch {
      setRoleChangeError("Network error while updating member role.");
    } finally {
      setRoleChangeLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspaceId || !inviteEmail.trim()) return;
    setInviteSending(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const res = await fetch(`${apiUrl}/api/v1/workspaces/${currentWorkspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data?.error?.message || data?.message || "Failed to send invitation");
      } else {
        setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}!`);
        setInviteEmail("");
        // Refresh sent invitations
        const invRes = await fetch(`${apiUrl}/api/v1/workspaces/${currentWorkspaceId}/invitations`, {
          credentials: "include",
        });
        if (invRes.ok) {
          const invData = await invRes.json();
          setSentInvitations(invData.invitations || []);
        }
      }
    } catch {
      setInviteError("Network error while sending invitation.");
    } finally {
      setInviteSending(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!currentWorkspaceId) return;
    try {
      const res = await fetch(
        `${apiUrl}/api/v1/workspaces/${currentWorkspaceId}/invitations/${invitationId}/cancel`,
        { method: "POST", credentials: "include" }
      );
      if (res.ok) {
        setSentInvitations((prev) =>
          prev.map((inv) => (inv.id === invitationId ? { ...inv, status: "CANCELLED" } : inv))
        );
      }
    } catch {
      // Fallback
    }
  };

  const handleAcceptInvite = async (invitationId: string) => {
    setProcessingInviteId(invitationId);
    try {
      const res = await fetch(`${apiUrl}/api/v1/workspaces/invitations/${invitationId}/accept`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        await fetchWorkspaces();
        await fetchPendingInvitations();
        if (data.workspaceId) {
          onSelectWorkspace(data.workspaceId);
        }
        setIsReviewModalOpen(false);
      } else {
        alert(data?.error?.message || data?.message || "Failed to accept invitation.");
      }
    } catch {
      alert("Error accepting invitation.");
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleDeclineInvite = async (invitationId: string) => {
    setProcessingInviteId(invitationId);
    try {
      const res = await fetch(`${apiUrl}/api/v1/workspaces/invitations/${invitationId}/decline`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        await fetchPendingInvitations();
      } else {
        const data = await res.json();
        alert(data?.error?.message || data?.message || "Failed to decline invitation.");
      }
    } catch {
      alert("Error declining invitation.");
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewWorkspaceName("");
        setIsCreating(false);
        fetchWorkspaces();
        if (data.workspace?.id) {
          onSelectWorkspace(data.workspace.id);
        }
      }
    } catch (err) {
      console.error("Failed to create workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <div className="flex gap-2 items-center overflow-x-auto whitespace-nowrap p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl max-w-fit border border-slate-200/60 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => onSelectWorkspace("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
            currentWorkspaceId === "all" || currentWorkspaceId === null
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50"
          }`}
        >
          🌐 All Projects
        </button>

        {workspaces.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onSelectWorkspace(w.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
              currentWorkspaceId === w.id
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50"
            }`}
          >
            {w.name} {typeof w._count?.websites === "number" ? `(${w._count.websites})` : ""}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onSelectWorkspace("personal")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
            currentWorkspaceId === "personal"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50"
          }`}
        >
          🏢 Unassigned
        </button>

        {isCreating ? (
          <form onSubmit={handleCreate} className="flex items-center gap-1.5 ml-1">
            <input
              type="text"
              placeholder="Workspace name..."
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded font-bold cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="ml-1 px-2.5 py-1 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 rounded-lg transition flex-shrink-0 cursor-pointer"
          >
            + New Workspace
          </button>
        )}
      </div>

      {/* Workspace Management (Owner/Admin) */}
      {canManageWorkspace && (
        <button
          type="button"
          onClick={openManageModal}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>👥 Manage Team & Invites</span>
        </button>
      )}

      {/* Pending Invitations Notification Pill */}
      {pendingInvitations.length > 0 && (
        <button
          type="button"
          onClick={() => setIsReviewModalOpen(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/40 hover:bg-amber-500/20 transition flex items-center gap-1.5 shadow-sm cursor-pointer animate-pulse"
        >
          <span>✉️</span>
          <span>{pendingInvitations.length} Pending Workspace Invite{pendingInvitations.length > 1 ? "s" : ""}</span>
        </button>
      )}

      {/* Modal: Review Pending Invitations for Logged-In User */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>✉️</span> Pending Workspace Invitations
              </h3>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {pendingInvitations.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No pending invitations right now.
                </div>
              ) : (
                pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {inv.workspace?.name || "Workspace"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Invited by: {inv.inviter?.fullName || inv.inviter?.email || "Workspace Admin"}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                        {inv.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                      <button
                        type="button"
                        disabled={processingInviteId === inv.id}
                        onClick={() => handleDeclineInvite(inv.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 disabled:opacity-50 transition"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={processingInviteId === inv.id}
                        onClick={() => handleAcceptInvite(inv.id)}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 shadow-sm transition"
                      >
                        {processingInviteId === inv.id ? "Joining..." : "Accept & Join"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Workspace Team & Invites Management */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>👥</span> {activeWs?.name || "Workspace"} — Team & Invitations
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage active workspace members and invite colleagues by email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 overflow-y-auto space-y-6 flex-1 pr-1">
              {/* Send Invitation Form */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                  Invite New Member
                </h4>
                <form onSubmit={handleSendInvitation} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="Registered colleague email..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "MEMBER" | "ADMIN")}
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="MEMBER">Member (Reviewer)</option>
                    <option value="ADMIN">Admin (Full Access)</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviteSending}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition shadow-sm"
                  >
                    {inviteSending ? "Inviting..." : "Send Invite"}
                  </button>
                </form>

                {inviteError && (
                  <div className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
                    ⚠️ {inviteError}
                  </div>
                )}
                {inviteSuccess && (
                  <div className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    ✅ {inviteSuccess}
                  </div>
                )}
              </div>

              {/* Active Workspace Members List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Active Workspace Members ({activeWorkspaceMembers.length})
                  </h4>
                </div>

                {roleChangeError && (
                  <div className="mb-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400">
                    ⚠️ {roleChangeError}
                  </div>
                )}
                {roleChangeSuccess && (
                  <div className="mb-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    ✅ {roleChangeSuccess}
                  </div>
                )}

                {modalLoading ? (
                  <div className="py-4 text-center text-xs text-slate-400">Loading members...</div>
                ) : activeWorkspaceMembers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">No members found.</div>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {activeWorkspaceMembers.map((m) => {
                      const isOwner = m.userId === activeWorkspaceOwnerId || m.role === "OWNER";
                      return (
                        <div key={m.id || m.userId} className="p-3 flex items-center justify-between text-xs gap-3">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{m.user?.fullName || m.user?.email || "Workspace Member"}</span>
                              {isOwner && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">👑</span>
                              )}
                            </div>
                            {m.user?.fullName && (
                              <div className="text-[11px] text-slate-400 font-mono">{m.user.email}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isOwner
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                  : m.role === "ADMIN"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {isOwner ? "Owner" : m.role}
                            </span>
                            {canManageWorkspace && !isOwner && (
                              <button
                                type="button"
                                disabled={roleChangeLoading}
                                onClick={() => {
                                  setRoleChangeError("");
                                  setRoleChangeSuccess("");
                                  setConfirmRoleChange({
                                    member: m,
                                    targetRole: m.role === "ADMIN" ? "MEMBER" : "ADMIN",
                                  });
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-slate-600 dark:text-slate-300 disabled:opacity-50"
                              >
                                {m.role === "ADMIN" ? "Demote to Member" : "Promote to Admin"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sent Invitations List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Sent Invitations ({sentInvitations.length})
                </h4>
                {modalLoading ? (
                  <div className="py-4 text-center text-xs text-slate-400">Loading invitations...</div>
                ) : sentInvitations.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">No sent invitations.</div>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {sentInvitations.map((inv) => (
                      <div key={inv.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {inv.email}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Role: {inv.role} • Status: <span className="font-semibold uppercase">{inv.status}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              inv.status === "PENDING"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                : inv.status === "ACCEPTED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {inv.status}
                          </span>
                          {inv.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleCancelInvitation(inv.id)}
                              className="text-[11px] font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Role Change */}
      {confirmRoleChange && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>⚠️</span> Confirm Role Change
            </h3>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to change the role for{" "}
              <strong className="text-slate-900 dark:text-white">
                {confirmRoleChange.member.user?.fullName || confirmRoleChange.member.user?.email || "this member"}
              </strong>{" "}
              from <span className="font-bold uppercase text-slate-800 dark:text-slate-200">{confirmRoleChange.member.role}</span> to{" "}
              <span className="font-bold uppercase text-blue-600 dark:text-blue-400">{confirmRoleChange.targetRole}</span>?
            </p>
            {confirmRoleChange.targetRole === "ADMIN" ? (
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                Granting Admin privileges will allow this member to publish websites, initiate rollbacks, and manage team members.
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                Demoting to Member will restrict this user to Reviewer-level website permissions with no publishing or rollback access.
              </p>
            )}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={roleChangeLoading}
                onClick={() => setConfirmRoleChange(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={roleChangeLoading}
                onClick={handleExecuteRoleChange}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition shadow-sm cursor-pointer"
              >
                {roleChangeLoading ? "Updating..." : "Confirm Role Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
