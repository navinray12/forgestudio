/**
 * @file Developer Api Settings: React UI composition and event handling for this screen or component.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import React, { useState, useEffect } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AVAILABLE_SCOPES = [
  { id: "websites:read", label: "Websites: Read", description: "Read website configuration, pages, and metadata" },
  { id: "websites:write", label: "Websites: Write", description: "Create and update websites, page trees, and contents" },
  { id: "publish:write", label: "Publish: Write", description: "Trigger production deployments and non-destructive rollbacks" },
];
export default function DeveloperApiSettings() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "websites:read",
    "websites:write",
    "publish:write",
  ]);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snippetTab, setSnippetTab] = useState<"curl" | "sdk" | "fetch">("curl");

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      setError(null);
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

  const toggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedScopes.length === 0) {
      setError("Please select at least one permission scope.");
      return;
    }
    try {
      setCreating(true);
      setError(null);
      const res = await fetch(`${apiUrl}/api/v1/apikeys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: selectedScopes,
        }),
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
    if (!window.confirm("Are you sure you want to revoke this API key? Existing integrations using it will fail immediately.")) return;
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

  const copyToClipboard = (text: string, type: "key" | "snippet") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } else {
      setCopiedSnippet(type);
      setTimeout(() => setCopiedSnippet(null), 2500);
    }
  };

  const activeKeySample = generatedSecret || "fsk_your_api_key_secret";

  const curlSnippet = `curl -X GET "${apiUrl}/api/v1/websites" \\
  -H "Authorization: Bearer ${activeKeySample}" \\
  -H "Content-Type: application/json"`;

  const sdkSnippet = `import { ForgeStudioClient } from "@forgestudio/sdk";

const client = new ForgeStudioClient({
  baseUrl: "${apiUrl}/api/v1",
  apiKey: "${activeKeySample}",
});

// List all managed websites
const { websites, meta } = await client.listWebsites({ page: 1, limit: 10 });
console.log("Websites:", websites);`;

  const fetchSnippet = `const response = await fetch("${apiUrl}/api/v1/websites", {
  method: "GET",
  headers: {
    "Authorization": "Bearer ${activeKeySample}",
    "Content-Type": "application/json",
  },
});
const data = await response.json();
console.log("Data:", data.data);`;

  return (
    <div className="mt-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-xl mb-3 font-mono">
              ⚡
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Developer API & SDK Platform</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
              Programmatic REST endpoints and isomorphic TypeScript SDK client for automated CI/CD pipelines, headless deployments, and external content synchronization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              API v1 Stable
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Generated API Secret Reveal Alert */}
        {generatedSecret && (
          <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <span>🔑</span> API Key Generated Successfully
              </h4>
              <button
                onClick={() => setGeneratedSecret(null)}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 underline"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-amber-800">
              Copy this secret token now. For security purposes, it is hashed with SHA-256 and cannot be retrieved again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-xl bg-white border border-amber-200 px-4 py-3 text-xs font-mono text-amber-950 break-all select-all shadow-inner">
                {generatedSecret}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(generatedSecret, "key")}
                className="px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm shrink-0"
              >
                {copiedKey ? "✓ Copied!" : "Copy Token"}
              </button>
            </div>
          </div>
        )}

        {/* Key Creation Form with Scope Selectors */}
        <div className="mt-8 pt-8 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Generate New API Token</h3>
          <p className="text-xs text-slate-500 mb-4">
            Select the granular access scopes required for your integration.
          </p>

          <form onSubmit={handleCreateKey} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                maxLength={50}
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key label (e.g. GitHub Actions Deployer, Headless Sync)"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-none"
                disabled={creating}
              />
              <button
                type="submit"
                disabled={creating || !newKeyName.trim() || selectedScopes.length === 0}
                className="rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-purple-700 shadow-md transition disabled:opacity-50 shrink-0"
              >
                {creating ? "Generating..." : "Generate API Key"}
              </button>
            </div>

            {/* Scope Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {AVAILABLE_SCOPES.map((scope) => {
                const isSelected = selectedScopes.includes(scope.id);
                return (
                  <label
                    key={scope.id}
                    onClick={() => toggleScope(scope.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition select-none ${
                      isSelected
                        ? "border-purple-300 bg-purple-50/50 text-purple-950"
                        : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="text-xs font-bold">{scope.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{scope.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </form>
        </div>

        {/* Existing API Keys Table */}
        <div className="mt-8 pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Your Active API Keys</h3>
            <button
              onClick={fetchKeys}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-slate-400 py-4 text-center">Loading API keys...</div>
            ) : keys.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No active API keys found. Generate one above to get started.
              </div>
            ) : (
              keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-200"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span>{key.name}</span>
                      {key.isRevoked ? (
                        <span className="bg-red-100 text-red-700 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold">
                          Revoked
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {Array.isArray(key.scopes) &&
                        key.scopes.map((scope: string) => (
                          <span
                            key={scope}
                            className="inline-block px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 text-[10px] font-mono font-medium"
                          >
                            {scope}
                          </span>
                        ))}
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1 flex gap-4">
                      <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                      <span>Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevoke(key.id)}
                    disabled={key.isRevoked}
                    className="text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-30 transition px-3 py-1.5 rounded-lg hover:bg-red-50"
                  >
                    Revoke Key
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Integration Code Snippets Sandbox */}
      <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 text-slate-100 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white">SDK & cURL Quickstart</h3>
            <p className="text-xs text-slate-400 mt-1">
              Test your authenticated endpoints in terminal or TypeScript application.
            </p>
          </div>
          {/* Tabs */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setSnippetTab("curl")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                snippetTab === "curl" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              cURL
            </button>
            <button
              onClick={() => setSnippetTab("sdk")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                snippetTab === "sdk" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              TypeScript SDK
            </button>
            <button
              onClick={() => setSnippetTab("fetch")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                snippetTab === "fetch" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Fetch API
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="relative">
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
            {snippetTab === "curl" ? curlSnippet : snippetTab === "sdk" ? sdkSnippet : fetchSnippet}
          </pre>
          <button
            onClick={() =>
              copyToClipboard(
                snippetTab === "curl" ? curlSnippet : snippetTab === "sdk" ? sdkSnippet : fetchSnippet,
                "snippet"
              )
            }
            className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 transition"
          >
            {copiedSnippet ? "✓ Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
