import React, { useState, useEffect } from "react";


const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function DeveloperApiSettings() {
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            setLoading(true);
            setError(null);
            // Uses session cookie auth (requireAuth middleware), NOT Bearer token
            const res = await fetch(`${apiUrl}/api/v1/apikeys`, {
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok) {
                setKeys(data.keys || []);
            } else {
                setError(data?.error?.message || data?.message || "Failed to load API keys.");
            }
        } catch (err) {
            console.error("Failed to load API keys", err);
            setError("Network error loading API keys.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setCreating(true);
            setError(null);
            const res = await fetch(`${apiUrl}/api/v1/apikeys`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: newKeyName,
                    scopes: ["websites:read", "websites:write", "publish:write"]
                })
            });
            const data = await res.json();
            if (res.ok) {
                setGeneratedSecret(data.rawSecret);
                setNewKeyName("");
                fetchKeys();
            } else {
                setError(data?.error?.message || "Failed to create API key.");
            }
        } catch (err) {
            console.error("Failed to create key", err);
            setError("Network error creating API key.");
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        if (!window.confirm("Are you sure you want to revoke this API key? Existing integrations will break immediately.")) return;
        try {
            const res = await fetch(`${apiUrl}/api/v1/apikeys/${id}/revoke`, {
                method: "POST",
                credentials: "include",
            });
            if (res.ok) {
                fetchKeys();
            } else {
                alert("Failed to revoke key.");
            }
        } catch (err) {
            alert("Failed to revoke key.");
        }
    };

    return (
        <div className="mt-12 bg-white rounded-3xl p-8 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Developer API</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                Manage your API keys for programmatic access to the ForgeStudio infrastructure. These tokens grant granular access to read, modify, and publish resources asynchronously through authenticated REST endpoints.
            </p>

            <div className="flex gap-4 mt-6">
                <button
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                    onClick={() => alert('Swagger OpenAPI Docs coming soon! (Endpoint: /api/v1/developer/docs)')}
                    title="View API Documentation"
                >
                    View API Reference
                </button>
            </div>

            <hr className="my-8 border-slate-100" />

            <h3 className="text-sm font-bold text-slate-800 mb-4">API Keys</h3>

            {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                    {error}
                </div>
            )}

            {generatedSecret && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <h4 className="text-sm font-bold text-amber-900">API Key Created Successfully</h4>
                    <p className="text-xs text-amber-800 mt-1 mb-3">Copy this secret now. It will only be shown once and cannot be retrieved later.</p>
                    <code className="block w-full rounded bg-amber-100 p-3 text-sm font-mono text-amber-900 break-all select-all">
                        {generatedSecret}
                    </code>
                    <button
                        onClick={() => setGeneratedSecret(null)}
                        className="mt-3 text-xs font-bold text-amber-700 hover:text-amber-900"
                    >
                        I have saved it securely
                    </button>
                </div>
            )}

            <form onSubmit={handleCreateKey} className="flex gap-3 mb-8">
                <input
                    type="text"
                    required
                    maxLength={50}
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="E.g. GitHub Actions Deployment Key"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    disabled={creating}
                />
                <button
                    type="submit"
                    disabled={creating || !newKeyName}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 shadow-md transition disabled:opacity-50"
                >
                    {creating ? "Creating..." : "Create New Key"}
                </button>
            </form>

            <div className="space-y-3">
                {loading ? (
                    <div className="text-sm text-slate-400">Loading keys...</div>
                ) : keys.length === 0 ? (
                    <div className="text-sm text-slate-400">No active API keys found.</div>
                ) : (
                    keys.map((key) => (
                        <div key={key.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <div>
                                <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    {key.name}
                                    {key.isRevoked && (
                                        <span className="bg-red-100 text-red-700 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold">Revoked</span>
                                    )}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1 flex gap-4">
                                    <span>Created: {new Date(key.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <span>Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Never"}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRevoke(key.id)}
                                disabled={key.isRevoked}
                                className="text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-30 transition"
                            >
                                Revoke Key
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
