import React, { useState, useEffect } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

type Placement = "HEAD" | "BODY_START" | "BODY_END";
type Language = "JS" | "CSS" | "HTML";

interface CustomCodeEntry {
    id: string;
    websiteId: string;
    placement: Placement;
    language: Language;
    code: string;
    title: string;
    isActive: boolean;
    createdAt: string;
}

export default function CustomCodePanel() {
    const [entries, setEntries] = useState<CustomCodeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [websites, setWebsites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState<string>("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: "", placement: "HEAD" as Placement, language: "HTML" as Language, code: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchWebsites(); }, []);
    useEffect(() => { if (selectedSite) fetchEntries(); }, [selectedSite]);

    const fetchWebsites = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/websites`, { credentials: "include" });
            const data = await res.json();
            if (res.ok && data.websites) {
                setWebsites(data.websites);
                if (data.websites.length > 0) setSelectedSite(data.websites[0].id);
            }
        } catch { setError("Could not load websites."); }
    };

    const fetchEntries = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${apiUrl}/api/custom-code/website/${selectedSite}`, { credentials: "include" });
            const data = await res.json();
            if (res.ok) setEntries(data.snippets || []);
            else setError(data?.message || "Failed to load custom code.");
        } catch { setError("Network error loading custom code."); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code.trim()) return;
        setSaving(true);
        try {
            const payload = {
                title: form.title || "Untitled Snippet",
                placement: form.placement,
                language: form.language,
                code: form.code,
                status: "PUBLISHED",
                isActive: true,
            };

            const res = await fetch(`${apiUrl}/api/custom-code/website/${selectedSite}`, {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (res.ok) {
                setShowForm(false);
                setForm({ title: "", placement: "HEAD", language: "HTML", code: "" });
                fetchEntries();
            } else {
                setError(data?.message || "Failed to save.");
            }
        } catch { setError("Network error."); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this code snippet?")) return;
        try {
            const res = await fetch(`${apiUrl}/api/custom-code/${id}`, {
                method: "DELETE", credentials: "include",
            });
            if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
            else alert("Failed to delete snippet.");
        } catch { alert("Network error deleting snippet."); }
    };

    const PLACEMENTS: { value: Placement; label: string; color: string }[] = [
        { value: "HEAD", label: "<head>", color: "bg-violet-100 text-violet-700" },
        { value: "BODY_START", label: "<body> start", color: "bg-sky-100 text-sky-700" },
        { value: "BODY_END", label: "</body> end", color: "bg-amber-100 text-amber-700" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Custom Code Injector</h2>
                    <p className="text-sm text-slate-500 mt-1">Inject global scripts, styles, or HTML snippets into your sites.</p>
                </div>
                <div className="flex gap-2">
                    {websites.length > 1 && (
                        <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none">
                            {websites.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    )}
                    <button onClick={() => setShowForm(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow hover:bg-slate-700 transition">+ Add Snippet</button>
                </div>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}

            {showForm && (
                <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">New Code Snippet</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Title</label>
                            <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Google Analytics" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Language</label>
                            <select value={form.language} onChange={(e) => setForm((p) => ({ ...p, language: e.target.value as Language }))} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:outline-none">
                                <option value="HTML">HTML (Scripts, tags)</option>
                                <option value="JS">JavaScript</option>
                                <option value="CSS">CSS</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Location</label>
                            <select value={form.placement} onChange={(e) => setForm((p) => ({ ...p, placement: e.target.value as Placement }))} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:outline-none">
                                {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Code snippet</label>
                        <textarea value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} rows={6} placeholder="<script>...</script>" className="w-full rounded-xl border border-slate-200 bg-[#1E1E1E] text-slate-300 px-4 py-3 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowForm(false)} className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="h-9 px-5 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-700 transition disabled:opacity-50">{saving ? "Saving…" : "Save Snippet"}</button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="text-xs text-slate-400 font-semibold text-center py-12">Loading snippets…</div>
            ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                    <div className="text-3xl mb-3">⚡</div>
                    <p className="text-sm font-bold text-slate-700">No custom code yet</p>
                    <p className="text-xs text-slate-400 mt-1">Easily inject global scripts and styles into your site.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {entries.map((entry) => {
                        const placeMeta = PLACEMENTS.find(p => p.value === entry.placement) || PLACEMENTS[0];
                        return (
                            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-start justify-between gap-4 transition-all">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-bold text-slate-800 truncate">{entry.title}</span>
                                        <span className="rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">{entry.language}</span>
                                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${placeMeta.color}`}>{placeMeta.label}</span>
                                    </div>
                                    <pre className="text-[11px] font-mono text-slate-500 truncate max-w-full overflow-hidden">{entry.code.slice(0, 150)}{entry.code.length > 150 ? "…" : ""}</pre>
                                </div>
                                <button onClick={() => handleDelete(entry.id)} className="shrink-0 h-7 px-3 rounded-lg border border-red-200 text-[11px] font-bold text-red-500 hover:bg-red-50 transition">Delete</button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
