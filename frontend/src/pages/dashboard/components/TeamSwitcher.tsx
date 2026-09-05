import React, { useState, useEffect } from "react";

export const TeamSwitcher: React.FC<{ apiUrl: string, currentTeamId: string | null, onSelectTeam: (id: string | null) => void }> = ({ apiUrl, currentTeamId, onSelectTeam }) => {
    const [teams, setTeams] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");

    const fetchTeams = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/teams`, { credentials: "include" });
            const data = await res.json();
            if (res.ok) setTeams(data.teams || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${apiUrl}/api/teams`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: newTeamName })
            });
            if (res.ok) {
                setNewTeamName("");
                setIsCreating(false);
                fetchTeams();
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex gap-2 items-center overflow-x-auto whitespace-nowrap p-1 bg-slate-100 rounded-xl max-w-fit">
            <button
                onClick={() => onSelectTeam(null)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex-shrink-0 ${currentTeamId === null ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
            >
                Personal Projects
            </button>

            {teams.map(t => (
                <button
                    key={t.id}
                    onClick={() => onSelectTeam(t.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex-shrink-0 ${currentTeamId === t.id ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                >
                    {t.name}
                </button>
            ))}

            <button onClick={() => setIsCreating(true)} className="ml-1 px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition flex-shrink-0">
                + New Team
            </button>

            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Create New Team</h3>
                        <form onSubmit={handleCreate}>
                            <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required placeholder="Team Name" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 mb-4 bg-slate-50 focus:bg-white" />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCreating(false)} className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                                <button type="submit" className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">Create Team</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
