import React, { useState, useEffect } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Real backend field mapping (from customCode.controller.ts) ──────────
// Fields: title, language (JS|CSS|HTML), code, placement (HEAD|BODY_START|BODY_END)
//         scope (GLOBAL|PAGE), pageId, conditions, priority, status (DRAFT|PUBLISHED),
//         scheduledFor, isActive

type Language = "JS" | "CSS" | "HTML";
type Placement = "HEAD" | "BODY_START" | "BODY_END";
type Status = "DRAFT" | "PUBLISHED";

interface Snippet {
    id: string;
    title: string;
    language: Language;
    code: string;
    placement: Placement;
    scope: string;
    isActive: boolean;
    status: Status;
    conditions: string | null;
    priority: number;
    scheduledFor: string | null;
    createdAt: string;
}

const PLACEMENTS: { value: Placement; label: string; color: string }[] = [
    { value: "HEAD", label: "<head>", color: "bg-violet-100 text-violet-700" },
    { value: "BODY_START", label: "<body> start", color: "bg-sky-100 text-sky-700" },
    { value: "BODY_END", label: "</body> end", color: "bg-amber-100 text-amber-700" },
];

const LANGUAGES: { value: Language; label: string; color: string }[] = [
    { value: "JS", label: "JavaScript", color: "bg-yellow-100 text-yellow-700" },
    { value: "CSS", label: "CSS", color: "bg-blue-100 text-blue-700" },
    { value: "HTML", label: "HTML", color: "bg-orange-100 text-orange-700" },
];

// Client-side lint for quick feedback
function lintCode(code: string, lang: Language): string[] {
    const errs: string[] = [];
    if (!code.trim()) return errs;
    if (lang === "JS") {
        if (/\beval\s*\(/.test(code)) errs.push("eval() is a security risk — avoid it.");
        if (/document\.write\s*\(/.test(code)) errs.push("document.write() can break page rendering.");
        const open = (code.match(/<script/gi) || []).length;
        const close = (code.match(/<\/script>/gi) || []).length;
        if (open !== close) errs.push("Mismatched <script> tags.");
        if (code.length > 50000) errs.push("Snippet is very large (>50KB) — consider splitting.");
    }
    if (lang === "CSS") {
        const braceOpen = (code.match(/\{/g) || []).length;
        const braceClose = (code.match(/\}/g) || []).length;
        if (braceOpen !== braceClose) errs.push("Mismatched CSS braces { }");
        if (/<script/i.test(code)) errs.push("Do not embed <script> inside a CSS snippet.");
    }
    if (lang === "HTML") {
        if (/<script.*src=/i.test(code) && !/<script.*nonce=/i.test(code))
            errs.push("External script missing nonce/SRI — consider adding integrity attribute.");
    }
    return errs;
}

type View = "list" | "form";

export default function AdvancedCodePanel() {
    const [websites, setWebsites] = useState<any[]>([]);
    const [siteId, setSiteId] = useState("");
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<View>("list");
    const [editTarget, setEditTarget] = useState<Snippet | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [lang, setLang] = useState<Language>("JS");
    const [code, setCode] = useState("");
    const [placement, setPlacement] = useState<Placement>("HEAD");
    const [isDraft, setIsDraft] = useState(false);
    const [priority, setPriority] = useState(10);
    const [conditions, setConditions] = useState("");
    const [scheduledFor, setScheduledFor] = useState("");
    const [lintWarnings, setLintWarnings] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => { loadWebsites(); }, []);
    useEffect(() => { if (siteId) loadSnippets(); }, [siteId]);

    const loadWebsites = async () => {
        try {
            const r = await fetch(`${apiUrl}/api/websites`, { credentials: "include" });
            const d = await r.json();
            if (r.ok && d.websites) { setWebsites(d.websites); if (d.websites[0]) setSiteId(d.websites[0].id); }
        } catch { setGlobalError("Could not load websites."); }
    };

    const loadSnippets = async () => {
        setLoading(true); setGlobalError(null);
        try {
            const r = await fetch(`${apiUrl}/api/custom-code/website/${siteId}`, { credentials: "include" });
            const d = await r.json();
            if (r.ok) setSnippets(d.snippets ?? []);
            else setGlobalError(d.message || "Failed to load snippets.");
        } catch { setGlobalError("Network error."); }
        finally { setLoading(false); }
    };

    const openAdd = () => {
        setTitle(""); setLang("JS"); setCode(""); setPlacement("HEAD");
        setIsDraft(false); setPriority(10); setConditions(""); setScheduledFor("");
        setLintWarnings([]); setFormError(null); setEditTarget(null); setView("form");
    };

    const openEdit = (s: Snippet) => {
        setTitle(s.title); setLang(s.language); setCode(s.code);
        setPlacement(s.placement); setIsDraft(s.status === "DRAFT");
        setPriority(s.priority); setConditions(s.conditions ?? "");
        setScheduledFor(s.scheduledFor ? s.scheduledFor.slice(0, 16) : "");
        setLintWarnings([]); setFormError(null); setEditTarget(s); setView("form");
    };

    const runLinter = () => setLintWarnings(lintCode(code, lang));

    const handleSubmit = async (e: React.FormEvent, forceStatus?: Status) => {
        e.preventDefault(); setFormError(null);
        if (!title.trim() || !code.trim()) { setFormError("Title and code are required."); return; }

        // Run linter before save
        const warns = lintCode(code, lang);
        setLintWarnings(warns);

        const status: Status = forceStatus || (isDraft ? "DRAFT" : "PUBLISHED");
        const body = {
            title: title.trim(), language: lang, code, placement,
            conditions: conditions.trim() || null,
            priority, status,
            scheduledFor: scheduledFor || null,
            isActive: status !== "DRAFT",
        };

        setSaving(true);
        try {
            let r: Response;
            if (editTarget) {
                r = await fetch(`${apiUrl}/api/custom-code/${editTarget.id}`, {
                    method: "PUT", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            } else {
                r = await fetch(`${apiUrl}/api/custom-code/website/${siteId}`, {
                    method: "POST", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            }
            const d = await r.json();
            if (r.ok) { setView("list"); loadSnippets(); }
            else setFormError(d.message || "Server rejected the snippet.");
        } catch { setFormError("Network error — please retry."); }
        finally { setSaving(false); }
    };

    const toggleActive = async (s: Snippet) => {
        await fetch(`${apiUrl}/api/custom-code/${s.id}`, {
            method: "PUT", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !s.isActive }),
        });
        loadSnippets();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Permanently delete this snippet?")) return;
        const r = await fetch(`${apiUrl}/api/custom-code/${id}`, { method: "DELETE", credentials: "include" });
        if (r.ok) setSnippets(p => p.filter(s => s.id !== id));
        else alert("Delete failed.");
    };

    // ── FORM VIEW ────────────────────────────────────────────────
    if (view === "form") return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => setView("list")} className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition">← Back</button>
                <h2 className="text-lg font-bold text-slate-900">{editTarget ? "Edit Snippet" : "New Code Snippet"}</h2>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                {/* Title + Language + Placement */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Label / Title *</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Google Analytics" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300" required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Language</label>
                        <select value={lang} onChange={e => { setLang(e.target.value as Language); setLintWarnings([]); }} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:outline-none">
                            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Inject Location</label>
                        <select value={placement} onChange={e => setPlacement(e.target.value as Placement)} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:outline-none">
                            {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Code Editor */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Code *</label>
                        <button type="button" onClick={runLinter} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-900 flex items-center gap-1 transition">🔍 Run Linter</button>
                    </div>
                    <textarea
                        value={code} rows={12}
                        onChange={e => { setCode(e.target.value); setLintWarnings([]); }}
                        placeholder={lang === "JS" ? "// JavaScript code\nconsole.log('loaded');" : lang === "CSS" ? "/* CSS */\nbody { margin: 0; }" : "<script>...</script>"}
                        className="w-full rounded-xl border border-slate-200 bg-[#1E1E1E] text-slate-300 px-4 py-3 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                        required
                    />
                    {lintWarnings.length > 0 && (
                        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
                            <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wide">Linter Warnings ({lintWarnings.length})</p>
                            {lintWarnings.map((w, i) => <p key={i} className="text-xs text-amber-700">⚠ {w}</p>)}
                        </div>
                    )}
                    {lintWarnings.length === 0 && code && (
                        <p className="mt-1 text-[11px] font-semibold text-emerald-600">✓ No linter issues</p>
                    )}
                </div>

                {/* Advanced Options */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Advanced Options</p>

                    {/* Conditions */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Load Conditions</label>
                        <input type="text" value={conditions} onChange={e => setConditions(e.target.value)}
                            placeholder="e.g. page:home, user:logged-in, device:mobile"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        <p className="mt-1 text-[10px] text-slate-400">Comma-separated rules. Evaluated server-side at render time.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                        {/* Priority */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Priority</label>
                            <input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} min={1} max={100}
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                            <p className="mt-1 text-[10px] text-slate-400">Lower number = loads first.</p>
                        </div>

                        {/* Scheduled publishing */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Publish At</label>
                            <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)}
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                            <p className="mt-1 text-[10px] text-slate-400">Leave empty to publish now.</p>
                        </div>

                        {/* Draft */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Save as Draft</label>
                            <button type="button" onClick={() => setIsDraft(p => !p)}
                                className={`mt-1 h-9 w-full rounded-lg border text-xs font-bold transition ${isDraft ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                                {isDraft ? "📝 Draft — not published" : "Active on Publish"}
                            </button>
                        </div>
                    </div>
                </div>

                {formError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{formError}</div>}

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setView("list")} className="h-9 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition">Cancel</button>
                    <button type="button" onClick={e => handleSubmit(e as any, "DRAFT")} disabled={saving}
                        className="h-9 px-4 rounded-xl border border-amber-300 text-xs font-bold text-amber-700 hover:bg-amber-50 transition disabled:opacity-50">
                        Save Draft
                    </button>
                    <button type="submit" disabled={saving}
                        className="h-9 px-5 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-700 transition disabled:opacity-50">
                        {saving ? "Saving…" : editTarget ? "Update Snippet" : "Publish Snippet"}
                    </button>
                </div>
            </form>
        </div>
    );

    // ── LIST VIEW ────────────────────────────────────────────────
    const sorted = [...snippets].sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Custom Code Manager</h2>
                    <p className="text-sm text-slate-500 mt-1">Inject, schedule, lint and condition-control all code snippets across your site.</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {["Inject", "Conditions", "Drafts", "Schedule", "Priority", "Linter"].map(f => (
                            <span key={f} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{f}</span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {websites.length > 1 && (
                        <select value={siteId} onChange={e => setSiteId(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none">
                            {websites.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    )}
                    <button onClick={openAdd} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow hover:bg-slate-700 transition">
                        + Add Snippet
                    </button>
                </div>
            </div>

            {globalError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{globalError}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-16 text-xs font-semibold text-slate-400">Loading snippets…</div>
            ) : sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                    <div className="text-3xl mb-3">⚡</div>
                    <p className="text-sm font-bold text-slate-700">No code snippets yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add your first snippet to inject custom code into this site.</p>
                    <button onClick={openAdd} className="mt-4 h-8 px-4 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-700 transition">+ Add Snippet</button>
                </div>
            ) : (
                <div className="space-y-2">
                    {sorted.map(s => {
                        const langMeta = LANGUAGES.find(l => l.value === s.language) || LANGUAGES[0];
                        const placeMeta = PLACEMENTS.find(p => p.value === s.placement) || PLACEMENTS[0];
                        const isDraftSnippet = s.status === "DRAFT";
                        return (
                            <div key={s.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition-all ${!s.isActive || isDraftSnippet ? "opacity-60 border-slate-100" : "border-slate-200"}`}>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-slate-800 truncate">{s.title}</span>
                                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${langMeta.color}`}>{langMeta.label}</span>
                                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${placeMeta.color}`}>{placeMeta.label}</span>
                                            {isDraftSnippet && <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700">Draft</span>}
                                            {s.scheduledFor && <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700">⏰ {new Date(s.scheduledFor).toLocaleString()}</span>}
                                            {s.conditions && <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-700">Conditional</span>}
                                            <span className="text-[10px] text-slate-400">Priority: {s.priority}</span>
                                        </div>
                                        <pre className="text-[11px] font-mono text-slate-500 truncate max-w-full">{s.code.slice(0, 120)}{s.code.length > 120 ? "…" : ""}</pre>
                                        {s.conditions && <p className="text-[10px] text-slate-400 mt-0.5">Conditions: {s.conditions}</p>}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => toggleActive(s)} className={`h-7 px-3 rounded-lg text-[11px] font-bold border transition ${s.isActive && !isDraftSnippet ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                                            {s.isActive && !isDraftSnippet ? "Active" : "Inactive"}
                                        </button>
                                        <button onClick={() => openEdit(s)} className="h-7 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition">Edit</button>
                                        <button onClick={() => handleDelete(s.id)} className="h-7 px-3 rounded-lg border border-red-200 text-[11px] font-bold text-red-500 hover:bg-red-50 transition">Delete</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
