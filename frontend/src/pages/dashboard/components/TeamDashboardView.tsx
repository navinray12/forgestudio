import React, { useState, useEffect } from "react";

export const TeamDashboardView: React.FC<{ teamId: string; apiUrl: string, onNavigateEditor: (id: string) => void }> = ({ teamId, apiUrl, onNavigateEditor }) => {
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("DESIGNER");
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        fetchTeam();
    }, [teamId]);

    const fetchTeam = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${apiUrl}/api/teams/${teamId}`, { credentials: "include" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to fetch team details");
            setTeam(data.team);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        try {
            const res = await fetch(`${apiUrl}/api/teams/${teamId}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: inviteEmail, role: inviteRole })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to invite");

            alert(data.message || "Invitation sent successfully. Token: " + data.token); // For testing since no email service
            setInviteEmail("");
            fetchTeam();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = async (userId: string) => {
        if (!window.confirm("Remove member? This user will lose access to this team.")) return;
        try {
            const res = await fetch(`${apiUrl}/api/teams/${teamId}/members/${userId}`, {
                method: "DELETE",
                credentials: "include"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to remove");
            }
            fetchTeam();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) return <div className="text-sm font-medium p-12 text-slate-500">Loading team...</div>;
    if (error) return <div className="text-red-500 bg-red-50 p-4 rounded-xl border border-red-200 text-sm font-semibold">{error}</div>;
    if (!team) return <div>Team not found.</div>;

    return (
        <div className="space-y-10">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">{team.name}</h2>
                <p className="text-sm text-slate-500">{team.description || "No description provided."}</p>
                <span className="inline-block mt-2 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Your Role: {team.userRole}</span>
            </div>

            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Team Projects</h3>
                {team.websites.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500 bg-white">
                        No projects have been added to this team yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {team.websites.map((w: any) => (
                            <div key={w.id} className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{w.status}</span>
                                    </div>
                                    <h4 className="mt-3 font-bold text-slate-800 text-lg truncate">{w.name}</h4>
                                    <p className="text-xs text-slate-400 font-mono mt-1">/{w.slug}</p>
                                </div>
                                <button
                                    onClick={() => onNavigateEditor(w.id)}
                                    className="mt-6 w-full rounded-lg bg-slate-900 text-white font-semibold text-xs py-2 hover:bg-slate-800 transition"
                                >
                                    Open Editor →
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Team Members</h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-semibold w-1/3">Member</th>
                                <th className="px-4 py-3 font-semibold">Role</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {team.members.map((m: any) => (
                                <tr key={m.userId} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-800">{m.user?.fullName || m.user?.email || "Unknown User"}</div>
                                        {m.user?.fullName && <div className="text-xs text-slate-400 font-mono">{m.user.email}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                            {m.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {(team.userRole === "OWNER" || team.userRole === "ADMIN") && m.role !== "OWNER" && (
                                            <button onClick={() => handleRemove(m.userId)} className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-100 rounded-lg bg-red-50 hover:bg-red-100 transition">Remove</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {team.invitations.map((inv: any) => (
                                <tr key={inv.id} className="bg-slate-50/50">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-600 font-mono text-xs">{inv.email}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                            {inv.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">Pending</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Awaiting Accept</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {team.members.length === 0 && team.invitations.length === 0 && (
                        <div className="p-8 text-center text-sm text-slate-500">No team members yet.</div>
                    )}
                </div>
            </div>

            {(team.userRole === "OWNER" || team.userRole === "ADMIN") && (
                <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm max-w-xl">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Invite to Team</h3>
                    <form onSubmit={handleInvite} className="flex gap-3">
                        <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="Email Address" className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500" />
                        <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-36 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-semibold text-slate-700 relative bg-white cursor-pointer">
                            <optgroup label="Select Role">
                                <option value="ADMIN">Admin</option>
                                <option value="DESIGNER">Designer</option>
                                <option value="CONTENT_EDITOR">Content Editor</option>
                                <option value="REVIEWER">Reviewer</option>
                            </optgroup>
                        </select>
                        <button type="submit" disabled={inviting} className="bg-blue-600 text-white rounded-xl px-5 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition shadow-sm">
                            {inviting ? "Sending..." : "Send Invite"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
