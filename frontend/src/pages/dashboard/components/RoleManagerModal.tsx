import React, { useState, useEffect } from "react";

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface Invitation {
    id: string;
    email: string;
    role: string;
    status: string;
}

interface GranularPerm {
    id: string;
    userId: string;
    resourceId: string;
    capability: string;
    effect: string;
}

interface RoleManagerModalProps {
    websiteId: string;
    websiteName: string;
    onClose: () => void;
    apiUrl: string;
}

const ROLE_DESC: Record<string, { desc: string, caps: string }> = {
    OWNER: { desc: "Full control.", caps: "App Config" },
    ADMIN: { desc: "Manage administration.", caps: "Members" },
    DESIGNER: { desc: "Build & modify design.", caps: "Design" },
    CONTENT_EDITOR: { desc: "Edit approved content.", caps: "Content" },
    REVIEWER: { desc: "View & review.", caps: "View Only" },
};

const CAPABILITIES = [
    { id: "VIEW", label: "View Project" },
    { id: "COMMENT", label: "Add Comments" },
    { id: "EDIT_CONTENT", label: "Edit Content text & media" },
    { id: "EDIT_DESIGN", label: "Edit Layout & Design" },
    { id: "PUBLISH", label: "Publish Website" },
    { id: "MANAGE_PERMISSIONS", label: "Manage Permissions" }
];

const DEFAULT_CAPABILITIES: Record<string, string[]> = {
    OWNER: ["VIEW", "COMMENT", "EDIT_CONTENT", "EDIT_DESIGN", "PUBLISH", "MANAGE_MEMBERS", "MANAGE_PERMISSIONS"],
    ADMIN: ["VIEW", "COMMENT", "EDIT_CONTENT", "EDIT_DESIGN", "PUBLISH", "MANAGE_MEMBERS", "MANAGE_PERMISSIONS"],
    DESIGNER: ["VIEW", "COMMENT", "EDIT_CONTENT", "EDIT_DESIGN", "PUBLISH"],
    CONTENT_EDITOR: ["VIEW", "COMMENT", "EDIT_CONTENT", "PUBLISH"],
    REVIEWER: ["VIEW", "COMMENT"]
};

export const RoleManagerModal: React.FC<RoleManagerModalProps> = ({ websiteId, websiteName, onClose, apiUrl }) => {
    const [view, setView] = useState<"MEMBERS" | "PERMISSIONS">("MEMBERS");

    // Core data
    const [members, setMembers] = useState<Member[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [granular, setGranular] = useState<GranularPerm[]>([]);

    // Status UI
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Invite UI
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("DESIGNER");
    const [inviting, setInviting] = useState(false);

    const [confirmRole, setConfirmRole] = useState<{ userId: string, name: string, oldRole: string, newRole: string } | null>(null);
    const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

    // Permissions UI
    const [selectedMember, setSelectedMember] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/websites/${websiteId}/roles`, { credentials: "include" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to fetch");

            if (data.roles) {
                setMembers(data.roles);
                setInvitations(data.invitations || []);
            } else if (data.members) {
                setMembers(data.members);
                setInvitations(data.invitations || []);
            }

            if (view === "PERMISSIONS") {
                const pRes = await fetch(`${apiUrl}/api/websites/${websiteId}/permissions`, { credentials: "include" });
                const pData = await pRes.json();
                if (pRes.ok) {
                    setGranular(pData.permissions || []);
                }

                // Select first valid member by default
                if (!selectedMember && members.length > 0) {
                    const nonOwner = members.find(m => m.role !== "OWNER");
                    if (nonOwner) setSelectedMember(nonOwner.id);
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const executeRoleChange = async () => {
        if (!confirmRole) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${apiUrl}/api/websites/${websiteId}/roles/${confirmRole.userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ role: confirmRole.newRole }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to change role");
            await fetchData();
            setConfirmRole(null);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const executeRemove = async () => {
        if (!removeMemberId) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${apiUrl}/api/websites/${websiteId}/members/${removeMemberId}`, {
                method: "DELETE",
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to remove member");
            await fetchData();
            setRemoveMemberId(null);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const triggerInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        setError("");
        try {
            const res = await fetch(`${apiUrl}/api/websites/${websiteId}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to invite member");
            setInviteEmail("");
            await fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setInviting(false);
        }
    };

    const togglePermission = async (capId: string, currentEffect: string | null) => {
        if (!selectedMember) return;

        // Determine the next state. 
        // If current is null (inherited), user clicks it -> Explicit ALLOW or Explicit DENY (lets invert default)
        const memberObj = members.find(m => m.id === selectedMember);
        if (!memberObj) return;

        const isDefaultAllowed = DEFAULT_CAPABILITIES[memberObj.role]?.includes(capId);

        let newEffect = "INHERIT";
        if (currentEffect === null) {
            newEffect = isDefaultAllowed ? "DENY" : "ALLOW";
        } else if (currentEffect === "ALLOW") {
            newEffect = "DENY";
        } else if (currentEffect === "DENY") {
            newEffect = "INHERIT";
        }

        try {
            const res = await fetch(`${apiUrl}/api/websites/${websiteId}/permissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    targetUserId: selectedMember,
                    resourceId: "*",
                    capability: capId,
                    effect: newEffect
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message);
            }
            await fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const getPermEffect = (userId: string, capId: string) => {
        const p = granular.find(g => g.userId === userId && g.capability === capId && g.resourceId === "*");
        return p ? p.effect : null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-4xl rounded-2xl bg-white p-0 shadow-2xl flex flex-col h-[85vh] max-h-[800px] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Manage Access</h2>
                        <p className="text-xs text-slate-500 font-mono mt-1">{websiteName}</p>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setView("MEMBERS")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${view === "MEMBERS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                        >
                            Members
                        </button>
                        <button
                            onClick={() => setView("PERMISSIONS")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${view === "PERMISSIONS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                        >
                            Granular Permissions
                        </button>
                    </div>

                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-2xl flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 transition-colors">&times;</button>
                </div>

                {error && (
                    <div className="m-6 mb-0 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                    {view === "MEMBERS" && (
                        <div className="flex-1 overflow-y-auto p-6">
                            <form onSubmit={triggerInvite} className="mb-8 flex gap-3 items-end max-w-2xl bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Invite Member</label>
                                    <input type="email" required placeholder="name@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:border-blue-500 outline-none transition-colors" />
                                </div>
                                <div className="w-48">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Role</label>
                                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:border-blue-500 outline-none bg-white cursor-pointer transition-colors font-semibold text-slate-700">
                                        <option value="ADMIN">Admin</option>
                                        <option value="DESIGNER">Designer</option>
                                        <option value="CONTENT_EDITOR">Content Editor</option>
                                        <option value="REVIEWER">Reviewer</option>
                                    </select>
                                </div>
                                <button disabled={inviting} type="submit" className="h-10 px-5 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                                    {inviting ? "Sending..." : "Send Invite"}
                                </button>
                            </form>

                            {loading && members.length === 0 ? (
                                <div className="flex items-center justify-center text-xs font-mono text-slate-500 py-12">Loading members...</div>
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                                            <tr>
                                                <th className="px-5 py-3 font-semibold w-2/5">Member</th>
                                                <th className="px-5 py-3 font-semibold w-1/4">Role</th>
                                                <th className="px-5 py-3 font-semibold w-1/5">Status</th>
                                                <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {members.map(m => (
                                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <div className="font-bold text-slate-800">{m.name}</div>
                                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{m.email}</div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <select
                                                            value={m.role}
                                                            disabled={m.role === "OWNER"}
                                                            onChange={e => setConfirmRole({ userId: m.id, name: m.name, oldRole: m.role, newRole: e.target.value })}
                                                            className="w-full max-w-[140px] text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded p-1 focus:border-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50 cursor-pointer"
                                                        >
                                                            <option value="OWNER" disabled>Owner</option>
                                                            <option value="ADMIN">Admin</option>
                                                            <option value="DESIGNER">Designer</option>
                                                            <option value="CONTENT_EDITOR">Content Editor</option>
                                                            <option value="REVIEWER">Reviewer</option>
                                                        </select>
                                                        <div className="text-[9px] text-slate-400 mt-1">{ROLE_DESC[m.role]?.desc}</div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">Active</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        {m.role !== "OWNER" && (
                                                            <button onClick={() => setRemoveMemberId(m.id)} className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-100 rounded-lg bg-red-50 hover:bg-red-100 transition">Remove</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {invitations.map(inv => (
                                                <tr key={inv.id} className="bg-slate-50/50">
                                                    <td className="px-5 py-4">
                                                        <div className="font-bold text-slate-600 font-mono text-xs">{inv.email}</div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px] uppercase">{inv.role}</span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="text-[11px] text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded uppercase tracking-wider">Pending</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Awaiting Accept</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {view === "PERMISSIONS" && (
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left sidebar - Members */}
                            <div className="w-1/3 border-r border-slate-200 bg-white overflow-y-auto">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/80 sticky top-0">
                                    <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Select Member</h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {members.filter(m => m.role !== "OWNER").length === 0 ? (
                                        <div className="p-6 text-center text-xs text-slate-400 italic">No customizable members found. (Owners cannot be restricted)</div>
                                    ) : members.map(m => {
                                        if (m.role === "OWNER") return null;
                                        const isSelected = selectedMember === m.id;
                                        return (
                                            <div
                                                key={m.id}
                                                onClick={() => setSelectedMember(m.id)}
                                                className={`p-4 cursor-pointer transition-colors ${isSelected ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-slate-50 border-l-4 border-transparent"}`}
                                            >
                                                <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{m.role}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono truncate">{m.email}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Right panel - Permissions */}
                            <div className="w-2/3 p-6 overflow-y-auto bg-slate-50/50 relative">
                                {selectedMember ? (() => {
                                    const m = members.find(x => x.id === selectedMember);
                                    if (!m) return null;

                                    return (
                                        <div className="max-w-xl">
                                            <div className="mb-6 pb-6 border-b border-slate-200">
                                                <h3 className="text-lg font-bold text-slate-900">Project Permissions for {m.name}</h3>
                                                <p className="text-xs text-slate-500 mt-1">Capabilities inherit from the <strong>{m.role}</strong> role but can be explicitly overridden for this project.</p>
                                            </div>

                                            <div className="space-y-4">
                                                {CAPABILITIES.map(cap => {
                                                    const effect = getPermEffect(m.id, cap.id);
                                                    const isDefault = DEFAULT_CAPABILITIES[m.role]?.includes(cap.id);

                                                    const isCurrentlyAllowed = effect === "ALLOW" || (effect === null && isDefault);

                                                    return (
                                                        <div key={cap.id} className="bg-white border text-sm border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                                            <div>
                                                                <div className="font-bold text-slate-800">{cap.label}</div>
                                                                <div className="text-xs mt-1 font-mono flex items-center gap-2">
                                                                    {effect === null ? (
                                                                        <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Inherited from {m.role}</span>
                                                                    ) : (
                                                                        <span className="text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded font-bold">Custom Override</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => togglePermission(cap.id, effect)}
                                                                className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-colors w-28 ${isCurrentlyAllowed
                                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                                                    : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                                                    }`}
                                                            >
                                                                <span className={isCurrentlyAllowed ? "text-emerald-500" : "text-red-500"}>
                                                                    {isCurrentlyAllowed ? "✓" : "✕"}
                                                                </span>
                                                                {isCurrentlyAllowed ? "Allowed" : "Denied"}
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })() : (
                                    <div className="flex h-full items-center justify-center text-slate-400 text-sm font-semibold">
                                        Select a member to manage their granular permissions
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {confirmRole && (
                <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center rounded-2xl backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white border border-slate-200 shadow-2xl rounded-xl p-6 max-w-sm w-full relative">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Change role?</h3>
                        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                            <span className="font-semibold text-slate-800">{confirmRole.name}</span> will change from <strong className="bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">{confirmRole.oldRole}</strong> to <strong className="bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">{confirmRole.newRole}</strong>.
                            <br /><br /> Note: Granular permissions inherit from the new role.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmRole(null)} className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition" disabled={loading}>Cancel</button>
                            <button onClick={executeRoleChange} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50" disabled={loading}>{loading ? "Saving..." : "Confirm"}</button>
                        </div>
                    </div>
                </div>
            )}

            {removeMemberId && (
                <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center rounded-2xl backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white border border-slate-200 shadow-2xl rounded-xl p-6 max-w-sm w-full relative">
                        <h3 className="text-lg font-bold text-slate-900 mb-2 text-red-600">Remove Member?</h3>
                        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                            This user will lose access to this project immediately.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setRemoveMemberId(null)} className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition" disabled={loading}>Cancel</button>
                            <button onClick={executeRemove} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50" disabled={loading}>{loading ? "Removing..." : "Remove"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
