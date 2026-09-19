import { useState, useEffect } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PluginHub() {
    const [plugins, setPlugins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlugins();
    }, []);

    const fetchPlugins = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/v1/plugins`, {
                credentials: "include",
            });
            const data = await res.json();
            if (data.success) {
                setPlugins(data.plugins);
            }
        } catch (e) {
            console.error("Failed to fetch plugins", e);
        } finally {
            setLoading(false);
        }
    };

    const activatePlugin = async (id: string) => {
        try {
            const res = await fetch(`${apiUrl}/api/v1/plugins/${id}/activate`, {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json();
            if (data.success) {
                fetchPlugins(); // Refresh
            }
        } catch (e) {
            console.error("Failed to activate plugin", e);
        }
    };

    if (loading) return <div className="text-slate-500 text-sm">Loading plugin definitions...</div>;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-8 max-w-4xl">
            <h2 className="text-lg font-bold text-slate-900">Plugin Hub</h2>
            <p className="text-sm text-slate-500 mt-1 mb-8">Manage CMS plugins mapping to native ecosystem components.</p>

            {plugins.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-sm text-slate-500 font-medium tracking-wide">No CMS plugins installed in the ecosystem.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plugins.map(p => (
                        <div key={p.id} className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors">
                            <div>
                                <h3 className="font-bold text-slate-900 mb-1">{p.pluginSlug}</h3>
                                <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider mb-4">
                                    <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded">v{p.currentVersion}</span>
                                    <span className={p.compatibilityStatus === 'SUPPORTED' ? 'bg-emerald-100 text-emerald-700 px-2 py-1 rounded' : 'bg-amber-100 text-amber-700 px-2 py-1 rounded'}>{p.compatibilityStatus}</span>
                                </div>
                            </div>
                            <div className="flex justify-end pt-3 border-t border-slate-100">
                                {p.compatibilityStatus !== 'SUPPORTED' ? (
                                    <button
                                        onClick={() => activatePlugin(p.id)}
                                        className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 rounded-lg transition-colors shadow shadow-indigo-200"
                                    >
                                        Activate Support
                                    </button>
                                ) : (
                                    <button className="text-xs font-bold bg-slate-100 text-slate-400 px-4 py-2 rounded-lg cursor-not-allowed">
                                        Activated
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
