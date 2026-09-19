import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Real backend field mapping (from customPostType.controller.ts) ──────
// CPT fields: name, singular, plural, slug, description, hasArchive
// Fields: name, key, type, required, order, options
// Entries: title, slug, status, values

interface CPT {
    id: string;
    name: string;
    singular: string;
    plural: string;
    slug: string;
    description?: string;
    hasArchive: boolean;
    _count?: { entries: number; fields: number };
    createdAt: string;
}

interface CustomField {
    id?: string;
    name: string;
    key: string;
    type: string;
    required: boolean;
    order: number;
    options?: Record<string, any>;
}

const FIELD_TYPES = ["text", "textarea", "number", "email", "url", "date", "boolean", "select", "image", "file"];

type View = "list" | "create" | "fields";

export default function CustomPostTypesPanel() {
    const navigate = useNavigate();
    const [websites, setWebsites] = useState<any[]>([]);
    const [siteId, setSiteId] = useState("");
    const [cpts, setCpts] = useState<CPT[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<View>("list");
    const [activeCpt, setActiveCpt] = useState<CPT | null>(null);
    const [fields, setFields] = useState<CustomField[]>([]);
    const [fieldsLoading, setFieldsLoading] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);

    // Create form
    const [name, setName] = useState("");
    const [singular, setSingular] = useState("");
    const [plural, setPlural] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [hasArchive, setHasArchive] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Field editor
    const [savingFields, setSavingFields] = useState(false);

    useEffect(() => { loadWebsites(); }, []);
    useEffect(() => { if (siteId) loadCpts(); }, [siteId]);

    const loadWebsites = async () => {
        try {
            const r = await fetch(`${apiUrl}/api/websites`, { credentials: "include" });
            const d = await r.json();
            if (r.ok && d.websites) { setWebsites(d.websites); if (d.websites[0]) setSiteId(d.websites[0].id); }
        } catch { setGlobalError("Could not load websites."); }
    };

    const loadCpts = async () => {
        setLoading(true); setGlobalError(null);
        try {
            // Route: GET /api/cpt/websites/:websiteId/types
            const r = await fetch(`${apiUrl}/api/cpt/websites/${siteId}/types`, { credentials: "include" });
            const d = await r.json();
            if (r.ok) setCpts(d.data ?? []);
            else setGlobalError(d.error?.message || d.message || "Failed to load post types.");
        } catch { setGlobalError("Network error."); }
        finally { setLoading(false); }
    };

    const autoSlug = (val: string) => val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setCreateError(null);
        if (!name.trim() || !slug.trim() || !singular.trim() || !plural.trim()) {
            setCreateError("Name, singular, plural, and slug are all required."); return;
        }
        setCreating(true);
        try {
            // Route: POST /api/cpt/websites/:websiteId/types
            const r = await fetch(`${apiUrl}/api/cpt/websites/${siteId}/types`, {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, singular, plural, slug, description, hasArchive }),
            });
            const d = await r.json();
            if (r.ok) {
                setView("list"); loadCpts();
                setName(""); setSingular(""); setPlural(""); setSlug(""); setDescription(""); setHasArchive(false);
            } else setCreateError(d.error?.message || d.message || "Failed to create.");
        } catch { setCreateError("Network error."); }
        finally { setCreating(false); }
    };

    const loadFields = async (cpt: CPT) => {
        setActiveCpt(cpt); setFieldsLoading(true); setView("fields");
        try {
            // Route: GET /api/cpt/types/:cptId/fields
            const r = await fetch(`${apiUrl}/api/cpt/types/${cpt.id}/fields`, { credentials: "include" });
            const d = await r.json();
            if (r.ok) setFields(d.data ?? []);
        } catch { /* show empty */ }
        finally { setFieldsLoading(false); }
    };

    const addField = () => setFields(prev => [...prev, { name: "", key: "", type: "text", required: false, order: prev.length }]);

    const updateField = (i: number, patch: Partial<CustomField>) =>
        setFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));

    const removeField = (i: number) =>
        setFields(prev => prev.filter((_, idx) => idx !== i).map((f, idx) => ({ ...f, order: idx })));

    const saveFields = async () => {
        if (!activeCpt) return;
        setSavingFields(true);
        try {
            // Route: POST /api/cpt/types/:cptId/fields
            const r = await fetch(`${apiUrl}/api/cpt/types/${activeCpt.id}/fields`, {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fields: fields.map((f, i) => ({ ...f, order: i })) }),
            });
            if (r.ok) { alert("Fields saved!"); loadCpts(); } // refresh counts
            else alert("Save failed.");
        } catch { alert("Network error."); }
        finally { setSavingFields(false); }
    };

    const handleDelete = async (cpt: CPT) => {
        if (!confirm(`Delete "${cpt.name}" and all its fields/entries? This cannot be undone.`)) return;
        try {
            // Route: DELETE /api/cpt/types/:cptId
            const r = await fetch(`${apiUrl}/api/cpt/types/${cpt.id}`, { method: "DELETE", credentials: "include" });
            const d = await r.json();
            if (r.ok) {
                loadCpts();
                if (activeCpt?.id === cpt.id) { setView("list"); setActiveCpt(null); }
            } else {
                alert(d.error?.message || d.message || "Failed to delete CPT.");
            }
        } catch {
            alert("Network error while deleting.");
        }
    };

    // ── FIELD EDITOR ─────────────────────────────────────────────
    if (view === "fields" && activeCpt) return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => setView("list")} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition">← Back</button>
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Fields: {activeCpt.name}</h2>
                    <p className="text-xs text-slate-500">/{activeCpt.slug}</p>
                </div>
            </div>

            {fieldsLoading ? (
                <div className="text-xs text-slate-400 text-center py-8">Loading fields…</div>
            ) : (
                <div className="space-y-3">
                    {fields.map((f, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Field Name</label>
                                    <input type="text" value={f.name} onChange={e => updateField(i, { name: e.target.value, key: autoSlug(e.target.value) })} placeholder="Field Name" className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Key</label>
                                    <input type="text" value={f.key} onChange={e => updateField(i, { key: autoSlug(e.target.value) })} placeholder="field_key" className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-300" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Type</label>
                                    <select value={f.type} onChange={e => updateField(i, { type: e.target.value })} className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold focus:outline-none">
                                        {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end gap-2">
                                    <label className="inline-flex items-center gap-1.5 cursor-pointer mb-1">
                                        <input type="checkbox" checked={f.required} onChange={e => updateField(i, { required: e.target.checked })} className="w-3.5 h-3.5" />
                                        <span className="text-[11px] font-semibold text-slate-600">Required</span>
                                    </label>
                                    <button onClick={() => removeField(i)} className="ml-auto h-8 px-3 rounded-lg border border-red-200 text-[11px] font-bold text-red-500 hover:bg-red-50 transition">Remove</button>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="flex gap-3">
                        <button onClick={addField} className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">+ Add Field</button>
                        <button onClick={saveFields} disabled={savingFields} className="h-9 px-5 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-700 transition disabled:opacity-50">{savingFields ? "Saving…" : "Save Fields"}</button>
                    </div>
                </div>
            )}
        </div>
    );

    // ── CREATE FORM ───────────────────────────────────────────────
    if (view === "create") return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => setView("list")} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition">← Back</button>
                <h2 className="text-lg font-bold text-slate-900">New Custom Post Type</h2>
            </div>

            <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Display Name *</label>
                        <input type="text" value={name} onChange={e => { setName(e.target.value); setSlug(autoSlug(e.target.value)); setSingular(e.target.value); setPlural(e.target.value + "s"); }}
                            placeholder="e.g. Portfolio" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300" required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Slug * (auto-generated)</label>
                        <input type="text" value={slug} onChange={e => setSlug(autoSlug(e.target.value))}
                            placeholder="e.g. portfolio" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-300" required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Singular Label *</label>
                        <input type="text" value={singular} onChange={e => setSingular(e.target.value)}
                            placeholder="e.g. Portfolio Item" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300" required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Plural Label *</label>
                        <input type="text" value={plural} onChange={e => setPlural(e.target.value)}
                            placeholder="e.g. Portfolio Items" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300" required />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Description</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="Brief description of this post type" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={hasArchive} onChange={e => setHasArchive(e.target.checked)} className="w-4 h-4" />
                    <span className="text-xs font-semibold text-slate-700">Has archive page</span>
                </label>

                {createError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{createError}</div>}

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setView("list")} className="h-9 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition">Cancel</button>
                    <button type="submit" disabled={creating} className="h-9 px-5 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-700 transition disabled:opacity-50">{creating ? "Creating…" : "Create Post Type"}</button>
                </div>
            </form>
        </div>
    );

    // ── LIST VIEW ─────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Custom Post Types</h2>
                    <p className="text-sm text-slate-500 mt-1">Create custom content types with dynamic fields and entries.</p>
                </div>
                <div className="flex items-center gap-2">
                    {websites.length > 1 && (
                        <select value={siteId} onChange={e => setSiteId(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none">
                            {websites.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    )}
                    <button onClick={() => setView("create")} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow hover:bg-slate-700 transition">
                        + New Post Type
                    </button>
                </div>
            </div>

            {globalError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{globalError}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-16 text-xs font-semibold text-slate-400">Loading…</div>
            ) : cpts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                    <div className="text-3xl mb-3">📝</div>
                    <p className="text-sm font-bold text-slate-700">No custom post types yet</p>
                    <p className="text-xs text-slate-400 mt-1">Create your first CPT to power dynamic, structured content.</p>
                    <button onClick={() => setView("create")} className="mt-4 h-8 px-4 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-700 transition">+ Create Post Type</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cpts.map(cpt => (
                        <div key={cpt.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900 truncate">{cpt.name}</h3>
                                    <p className="text-xs font-mono text-slate-400 mt-0.5">/{cpt.slug}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{cpt.singular} / {cpt.plural}</p>
                                    {cpt.description && <p className="text-xs text-slate-400 mt-1">{cpt.description}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{cpt._count?.fields ?? 0} Fields</span>
                                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">{cpt._count?.entries ?? 0} Entries</span>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                <button onClick={() => loadFields(cpt)} className="h-7 px-3 rounded-lg bg-slate-900 text-[11px] font-bold text-white hover:bg-slate-700 transition">Manage Fields</button>
                                <button onClick={() => navigate(`/dashboard/cpts/${siteId}/entries/${cpt.id}`)} className="h-7 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition">View Entries</button>
                                <button onClick={() => handleDelete(cpt)} className="ml-auto h-7 px-3 rounded-lg border border-red-200 text-[11px] font-bold text-red-500 hover:bg-red-50 transition">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
