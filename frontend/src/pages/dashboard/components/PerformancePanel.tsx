import { useState, useEffect } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface PerformanceSettings {
    reducedDom: boolean;
    optimizedMedia: boolean;
    reducedCss: boolean;
    reducedJs: boolean;
    lazyLoading: boolean;
    fasterFonts: boolean;
    assetDefer: boolean;
    elementCaching: boolean;
    performanceMode: boolean;
    imageOptimization: boolean;
}

const PERF_FEATURES: { key: keyof PerformanceSettings; id: string; name: string; description: string; icon: string }[] = [
    { key: "reducedDom", id: "F-351", name: "Reduced DOM Output", description: "Strip unnecessary wrapper elements to produce a leaner HTML structure.", icon: "🏗" },
    { key: "optimizedMedia", id: "F-352", name: "Optimized Media Loading", description: "Use srcset and modern formats for responsive image delivery.", icon: "🖼" },
    { key: "reducedCss", id: "F-353", name: "Reduced CSS", description: "Purge unused CSS rules from the final stylesheet on publish.", icon: "🎨" },
    { key: "reducedJs", id: "F-354", name: "Reduced JavaScript", description: "Tree-shake and minify JS bundles to reduce parse time.", icon: "⚡" },
    { key: "lazyLoading", id: "F-355", name: "Lazy Loading", description: "Defer images and iframes that are below the fold until needed.", icon: "⏳" },
    { key: "fasterFonts", id: "F-356", name: "Faster Font Loading", description: "Use font-display: swap and preload hints for web fonts.", icon: "✍️" },
    { key: "assetDefer", id: "F-357", name: "Front-End Asset Loading", description: "Defer non-critical scripts and stylesheets to prevent render-blocking.", icon: "📦" },
    { key: "elementCaching", id: "F-358", name: "Element Caching", description: "Cache reusable component output to reduce re-render overhead.", icon: "💾" },
    { key: "performanceMode", id: "F-359", name: "Performance Optimization", description: "Enable global performance mode with automated compile-time optimizations.", icon: "🚀" },
    { key: "imageOptimization", id: "F-360", name: "Image Optimization", description: "Auto-compress and convert images to WebP on save or publish.", icon: "🖼" },
];

const defaultSettings: PerformanceSettings = {
    reducedDom: false, optimizedMedia: true, reducedCss: false, reducedJs: false,
    lazyLoading: true, fasterFonts: true, assetDefer: false, elementCaching: false,
    performanceMode: false, imageOptimization: false,
};

export default function PerformancePanel() {
    const [websites, setWebsites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState<string>("");
    const [settings, setSettings] = useState<PerformanceSettings>(defaultSettings);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => { fetchWebsites(); }, []);
    useEffect(() => { if (selectedSite) fetchSettings(); }, [selectedSite]);

    const fetchWebsites = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/websites`, { credentials: "include" });
            const data = await res.json();
            if (res.ok && data.websites) {
                setWebsites(data.websites);
                if (data.websites[0]) setSelectedSite(data.websites[0].id);
            }
        } catch { /* no-op */ }
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/websites/${selectedSite}`, { credentials: "include" });
            const data = await res.json();
            if (res.ok) {
                const saved = data.website?.performanceSettings || data.performanceSettings;
                if (saved) setSettings({ ...defaultSettings, ...saved });
            }
        } catch { /* use defaults */ }
        finally { setLoading(false); }
    };

    const toggle = (key: keyof PerformanceSettings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true); setSaved(false);
        try {
            await fetch(`${apiUrl}/api/websites/${selectedSite}/editor-data`, {
                method: "PUT", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ performanceSettings: settings }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch { /* no-op */ }
        finally { setSaving(false); }
    };

    const enabledCount = Object.values(settings).filter(Boolean).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Performance & Optimization</h2>
                    <p className="text-sm text-slate-500 mt-1">Control rendering, loading, and delivery optimizations for your site.</p>
                    <div className="mt-3 flex items-center gap-3">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-700">
                            {enabledCount} / {PERF_FEATURES.length} Optimizations Active
                        </div>
                        {/* Score bar */}
                        <div className="flex-1 max-w-[200px] h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                                style={{ width: `${(enabledCount / PERF_FEATURES.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {websites.length > 1 && (
                        <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none">
                            {websites.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`h-9 px-4 rounded-xl text-xs font-bold text-white shadow transition ${saved ? "bg-emerald-600" : "bg-slate-900 hover:bg-slate-700"} disabled:opacity-50`}
                    >
                        {saving ? "Saving…" : saved ? "✓ Saved" : "Save Settings"}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-xs text-slate-400 font-semibold text-center py-12">Loading…</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PERF_FEATURES.map(feat => (
                        <div
                            key={feat.key}
                            onClick={() => toggle(feat.key)}
                            className={`cursor-pointer rounded-2xl border p-4 transition-all select-none ${settings[feat.key]
                                    ? "bg-slate-900 border-slate-800 shadow-md"
                                    : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{feat.icon}</span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-extrabold ${settings[feat.key] ? "text-slate-400" : "text-slate-400"}`}>{feat.id}</span>
                                            <h3 className={`text-sm font-bold ${settings[feat.key] ? "text-white" : "text-slate-800"}`}>{feat.name}</h3>
                                        </div>
                                        <p className={`text-xs mt-0.5 leading-relaxed ${settings[feat.key] ? "text-slate-400" : "text-slate-500"}`}>{feat.description}</p>
                                    </div>
                                </div>
                                {/* Toggle */}
                                <div className={`shrink-0 w-9 h-5 rounded-full transition-colors ${settings[feat.key] ? "bg-emerald-500" : "bg-slate-200"} relative mt-0.5`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[feat.key] ? "translate-x-4" : "translate-x-0.5"}`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick tip */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold text-blue-700">
                    💡 These settings are also accessible in the editor under <strong>Global &amp; Site → Performance &amp; SEO</strong>. Changes here sync automatically.
                </p>
            </div>
        </div>
    );
}
