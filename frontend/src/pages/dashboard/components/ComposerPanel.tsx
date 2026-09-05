import { useState, useEffect } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface ComposerStatus {
    available: boolean;
    version?: string;
    phpAvailable: boolean;
    phpVersion?: string;
    error?: string;
}

export default function ComposerPanel() {
    const [status, setStatus] = useState<ComposerStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [configInput, setConfigInput] = useState('{\n  "require": {\n    \n  }\n}');
    const [validating, setValidating] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [output, setOutput] = useState("");

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            // Composer routes use requireAuth (cookie-based session), mounted at /api/v1/composer
            const res = await fetch(`${apiUrl}/api/v1/composer/status`, {
                credentials: "include",
            });
            const data = await res.json();
            if (data.success) {
                setStatus(data.data);
            }
        } catch (e) {
            console.error("Failed to fetch composer status", e);
        } finally {
            setLoading(false);
        }
    };

    const handleValidate = async () => {
        setValidating(true);
        setOutput("");
        try {
            const res = await fetch(`${apiUrl}/api/v1/composer/validate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ config: configInput })
            });
            const data = await res.json();
            if (data.success) {
                setOutput(`✓ Validation passed: ${data.message}`);
            } else {
                setOutput(`⚠ Validation failed: ${data.error?.message}`);
            }
        } catch (e: any) {
            setOutput(`⚠ Error: ${e.message}`);
        } finally {
            setValidating(false);
        }
    };

    const handleInstall = async () => {
        setInstalling(true);
        setOutput("Starting installation...\n");
        try {
            const res = await fetch(`${apiUrl}/api/v1/composer/install`, {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json();
            if (data.success) {
                setOutput(`✓ Success:\n${data.output}`);
            } else {
                setOutput(`⚠ Failed:\n${data.error?.details || data.error?.message}`);
            }
        } catch (e: any) {
            setOutput(`⚠ Error: ${e.message}`);
        } finally {
            setInstalling(false);
        }
    };



    if (loading) return <div className="text-slate-500 text-sm">Checking environment...</div>;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-8 max-w-4xl">
            <h2 className="text-lg font-bold text-slate-900">Composer Integration</h2>
            <p className="text-sm text-slate-500 mt-1 mb-8">Manage optional PHP/WordPress dependencies using Composer securely.</p>

            <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-100 p-6 rounded-2xl mb-8">
                <div>
                    <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">PHP Environment</h3>
                    {status?.phpAvailable ? (
                        <div className="flex items-center gap-2 text-green-700 font-bold text-sm bg-green-50 w-max px-3 py-1.5 rounded-lg border border-green-100">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            PHP {status.phpVersion} detected
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-700 font-bold text-sm bg-red-50 w-max px-3 py-1.5 rounded-lg border border-red-100">
                            ⚠ PHP not available
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Composer Binary</h3>
                    {status?.available ? (
                        <div className="flex items-center gap-2 text-green-700 font-bold text-sm bg-green-50 w-max px-3 py-1.5 rounded-lg border border-green-100">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            Composer {status.version} detected
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-700 font-bold text-sm bg-red-50 w-max px-3 py-1.5 rounded-lg border border-red-100">
                            ⚠ Composer not detected
                        </div>
                    )}
                </div>
            </div>

            {status?.available && (
                <div className="flex flex-col gap-6">
                    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-600 flex justify-between">
                            <span>composer.json</span>
                            <span className="text-slate-400 font-mono">Sandbox: /integrations/php</span>
                        </div>
                        <textarea
                            value={configInput}
                            onChange={(e) => setConfigInput(e.target.value)}
                            spellCheck={false}
                            className="w-full bg-slate-800 text-green-400 font-mono text-sm p-4 h-48 border-none focus:ring-0 resize-y"
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            disabled={validating || installing}
                            onClick={handleValidate}
                            className="bg-white border border-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition"
                        >
                            {validating ? "Validating..." : "Validate Configuration"}
                        </button>
                        <button
                            disabled={installing || validating}
                            onClick={handleInstall}
                            className="bg-blue-600 border border-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition"
                        >
                            {installing ? "Installing..." : "Install Dependencies"}
                        </button>
                    </div>

                    {output && (
                        <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-700">
                            <h4 className="text-xs font-bold tracking-widest text-slate-500 mb-2 uppercase">Execution Output</h4>
                            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{output}</pre>
                        </div>
                    )}
                </div>
            )}

            {status?.error && (
                <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100">
                    <h4 className="text-xs font-bold text-red-800 mb-1">Environment Alert</h4>
                    <p className="text-xs text-red-600">{status.error}</p>
                </div>
            )}
        </div>
    );
}
