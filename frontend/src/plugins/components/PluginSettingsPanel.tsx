import { useState, useEffect } from "react";
import { PluginManager } from "../PluginManager";
import type { PluginState } from "../PluginManager";

export default function PluginSettingsPanel() {
    const [plugins, setPlugins] = useState<any[]>([]);

    useEffect(() => {
        // Safe local evaluation querying the singleton instance natively globally.
        setPlugins(PluginManager.getPlugins());
    }, []);

    const getStatusColor = (state: PluginState) => {
        switch (state) {
            case "active": return "bg-green-100 text-green-800";
            case "error": return "bg-red-100 text-red-800";
            case "registered": return "bg-blue-100 text-blue-800";
            default: return "bg-slate-100 text-slate-800";
        }
    };

    return (
        <div className="mt-12 bg-white rounded-3xl p-8 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Active Plugins & Extensions</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl mb-6">
                Manage built-in and external plugins safely integrated inside the ForgeStudio architectural bounds. Only securely loaded local dependencies natively mapped through valid PluginContext structures process effectively.
            </p>

            <div className="space-y-4">
                {plugins.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
                        <p className="text-sm font-semibold text-slate-500">No plugins correctly registered currently.</p>
                    </div>
                ) : (
                    plugins.map(p => (
                        <div key={p.manifest.id} className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between items-start gap-4 hover:shadow-sm transition bg-white group">
                            <div className="flex gap-4 items-start w-full justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">{p.manifest.name}</h3>
                                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">{p.manifest.id} &bull; v{p.manifest.version} &bull; Required FS {p.manifest.forgeStudioVersion}</div>
                                    <p className="text-xs text-slate-600 mt-2">{p.manifest.description}</p>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(p.state)}`}>
                                    {p.state}
                                </span>
                            </div>

                            <div className="w-full bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-2">
                                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Declared Capabilities</div>
                                <div className="flex gap-2 flex-wrap">
                                    {p.manifest.capabilities.map((cap: string) => (
                                        <span key={cap} className="px-2 py-1 text-[9px] bg-white border border-slate-200 text-slate-700 rounded-md font-semibold uppercase">{cap}</span>
                                    ))}
                                </div>
                            </div>

                            {p.state === "error" && p.error && (
                                <div className="w-full bg-red-50 text-red-900 border border-red-200 p-3 rounded-lg text-xs">
                                    <div className="font-bold">Plugin Initialization Failed</div>
                                    <div className="mt-1 font-mono text-[10px]">{p.error.message}</div>
                                </div>
                            )}

                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
