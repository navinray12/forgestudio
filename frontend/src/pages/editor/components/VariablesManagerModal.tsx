import React, { useState } from "react";
import { X, Plus, Trash2, Download, Upload, Palette, Type, Move, Layers, Sparkles, Check, Sun, Moon } from "lucide-react";

export interface VariableModeValue {
    modeId: "light" | "dark" | string;
    value: string;
}

export interface DesignVariable {
    id: string;
    name: string;
    category: "color" | "typography" | "spacing" | "shadow" | "radius" | "custom";
    token: string;
    value: string; // Base / Light mode value
    description?: string;
    defaultMode?: "light" | "dark";
    modes?: Record<string, string>; // e.g. { light: '#ffffff', dark: '#0f172a' }
}

interface VariablesManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    variables: DesignVariable[];
    onSaveVariables: (updated: DesignVariable[]) => void;
}

const CATEGORIES: Array<{ key: DesignVariable["category"]; label: string; icon: React.ReactNode }> = [
    { key: "color", label: "Colors", icon: <Palette className="w-4 h-4" /> },
    { key: "typography", label: "Typography", icon: <Type className="w-4 h-4" /> },
    { key: "spacing", label: "Spacing", icon: <Move className="w-4 h-4" /> },
    { key: "shadow", label: "Shadows", icon: <Layers className="w-4 h-4" /> },
    { key: "radius", label: "Border Radius", icon: <Sparkles className="w-4 h-4" /> },
    { key: "custom", label: "Custom", icon: <Sparkles className="w-4 h-4" /> },
];

export const VariablesManagerModal: React.FC<VariablesManagerModalProps> = ({
    isOpen,
    onClose,
    variables,
    onSaveVariables,
}) => {
    const [activeTab, setActiveTab] = useState<DesignVariable["category"]>("color");
    const [localVars, setLocalVars] = useState<DesignVariable[]>(variables);
    const [newVarName, setNewVarName] = useState("");
    const [newVarValue, setNewVarValue] = useState("");
    const [newVarDarkValue, setNewVarDarkValue] = useState("");
    const [newVarToken, setNewVarToken] = useState("");
    const [importError, setImportError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    if (!isOpen) return null;

    const filteredVars = localVars.filter((v) => v.category === activeTab);

    const handleAddVariable = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVarName.trim() || !newVarValue.trim()) return;

        const autoToken = newVarToken.trim() || `--fs-${activeTab}-${newVarName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
        const sanitizedToken = autoToken.startsWith("--") ? autoToken : `--${autoToken}`;

        const modes: Record<string, string> = {
            light: newVarValue.trim(),
        };
        if (newVarDarkValue.trim()) {
            modes.dark = newVarDarkValue.trim();
        }

        const newVar: DesignVariable = {
            id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: newVarName.trim(),
            category: activeTab,
            token: sanitizedToken,
            value: newVarValue.trim(),
            defaultMode: "light",
            modes,
        };

        const updated = [...localVars, newVar];
        setLocalVars(updated);
        setNewVarName("");
        setNewVarValue("");
        setNewVarDarkValue("");
        setNewVarToken("");
    };

    const handleDelete = (id: string) => {
        setLocalVars(localVars.filter((v) => v.id !== id));
    };

    const handleUpdate = (id: string, field: "name" | "token" | "value", val: string) => {
        setLocalVars(
            localVars.map((v) => {
                if (v.id === id) {
                    const currentModes = v.modes ? { ...v.modes } : { light: v.value };
                    if (field === "value") {
                        currentModes.light = val;
                    }
                    return { ...v, [field]: val, modes: currentModes };
                }
                return v;
            })
        );
    };

    const handleUpdateDarkMode = (id: string, darkVal: string) => {
        setLocalVars(
            localVars.map((v) => {
                if (v.id === id) {
                    const currentModes = v.modes ? { ...v.modes } : { light: v.value };
                    if (darkVal.trim()) {
                        currentModes.dark = darkVal.trim();
                    } else {
                        delete currentModes.dark;
                    }
                    return { ...v, modes: currentModes };
                }
                return v;
            })
        );
    };

    const handleSaveAndApply = () => {
        onSaveVariables(localVars);
        setSaveSuccess(true);
        setTimeout(() => {
            setSaveSuccess(false);
            onClose();
        }, 600);
    };

    const handleExport = () => {
        const payload = {
            version: 2,
            exportedAt: new Date().toISOString(),
            variables: localVars,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `forgestudio-design-tokens-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const importedVars = Array.isArray(json.variables) ? json.variables : Array.isArray(json) ? json : null;
                if (!importedVars) {
                    throw new Error("Invalid format: JSON must contain a 'variables' array");
                }
                setLocalVars(importedVars);
                setImportError(null);
            } catch (err: any) {
                setImportError(err.message || "Failed to parse JSON file");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Palette className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Design Token Multi-Mode System</h2>
                            <p className="text-xs text-slate-400">Manage centralized CSS variables with dual Dark and Light mode themes (F-339)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                            title="Export Design Tokens to JSON (F-342)"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            Import
                            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                        </label>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors ml-2"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {importError && (
                    <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 text-xs text-red-400">
                        {importError}
                    </div>
                )}

                {/* Category Navigation */}
                <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 gap-2">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.key}
                            type="button"
                            onClick={() => setActiveTab(cat.key)}
                            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${
                                activeTab === cat.key
                                    ? "border-indigo-500 text-indigo-400"
                                    : "border-transparent text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            {cat.icon}
                            {cat.label}
                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                {localVars.filter((v) => v.category === cat.key).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Add Token Form */}
                    <form onSubmit={handleAddVariable} className="bg-slate-950/40 p-4 rounded-lg border border-slate-800 space-y-3">
                        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Add New {CATEGORIES.find((c) => c.key === activeTab)?.label} Token (Light & Dark)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-[11px] text-slate-400 mb-1">Display Name</label>
                                <input
                                    type="text"
                                    placeholder={activeTab === "color" ? "Surface Background" : "Headline Spacing"}
                                    value={newVarName}
                                    onChange={(e) => {
                                        setNewVarName(e.target.value);
                                        if (!newVarToken) {
                                            setNewVarToken(`--fs-${activeTab}-${e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-")}`);
                                        }
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-400 mb-1">CSS Token Name</label>
                                <input
                                    type="text"
                                    placeholder={`--fs-${activeTab}-custom`}
                                    value={newVarToken}
                                    onChange={(e) => setNewVarToken(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
                                    <Sun className="w-3 h-3 text-amber-400" />
                                    <span>Light Value</span>
                                </label>
                                <div className="flex gap-1.5">
                                    {activeTab === "color" && (
                                        <input
                                            type="color"
                                            value={newVarValue.startsWith("#") && newVarValue.length === 7 ? newVarValue : "#ffffff"}
                                            onChange={(e) => setNewVarValue(e.target.value)}
                                            className="w-7 h-7 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0"
                                        />
                                    )}
                                    <input
                                        type="text"
                                        placeholder={activeTab === "color" ? "#ffffff" : "16px"}
                                        value={newVarValue}
                                        onChange={(e) => setNewVarValue(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
                                    <Moon className="w-3 h-3 text-indigo-400" />
                                    <span>Dark Value (Optional)</span>
                                </label>
                                <div className="flex gap-1.5">
                                    {activeTab === "color" && (
                                        <input
                                            type="color"
                                            value={newVarDarkValue.startsWith("#") && newVarDarkValue.length === 7 ? newVarDarkValue : "#0f172a"}
                                            onChange={(e) => setNewVarDarkValue(e.target.value)}
                                            className="w-7 h-7 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0"
                                        />
                                    )}
                                    <input
                                        type="text"
                                        placeholder={activeTab === "color" ? "#0f172a" : "16px"}
                                        value={newVarDarkValue}
                                        onChange={(e) => setNewVarDarkValue(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="submit"
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors shrink-0"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Token Table / List */}
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Active Tokens ({filteredVars.length})
                        </div>
                        {filteredVars.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                                No {activeTab} tokens created yet. Add one above to standardize your design system.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950/20 overflow-hidden">
                                {filteredVars.map((v) => {
                                    const lightVal = v.modes?.light || v.value;
                                    const darkVal = v.modes?.dark || "";

                                    return (
                                        <div key={v.id} className="p-3 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                                                {/* Name */}
                                                <input
                                                    type="text"
                                                    value={v.name}
                                                    onChange={(e) => handleUpdate(v.id, "name", e.target.value)}
                                                    className="bg-transparent border border-transparent hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded px-2 py-1 text-xs text-slate-200"
                                                />
                                                {/* CSS Token */}
                                                <input
                                                    type="text"
                                                    value={v.token}
                                                    onChange={(e) => handleUpdate(v.id, "token", e.target.value)}
                                                    className="bg-transparent border border-transparent hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded px-2 py-1 text-xs font-mono text-indigo-300"
                                                />
                                                {/* Light Value */}
                                                <div className="flex items-center gap-1.5">
                                                    {v.category === "color" && (
                                                        <div
                                                            className="w-5 h-5 rounded border border-slate-700 shadow-sm shrink-0"
                                                            style={{ backgroundColor: lightVal }}
                                                        />
                                                    )}
                                                    {v.category === "color" && (
                                                        <input
                                                            type="color"
                                                            value={lightVal.startsWith("#") && lightVal.length === 7 ? lightVal : "#ffffff"}
                                                            onChange={(e) => handleUpdate(v.id, "value", e.target.value)}
                                                            className="w-6 h-6 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0 shrink-0"
                                                        />
                                                    )}
                                                    <input
                                                        type="text"
                                                        value={lightVal}
                                                        onChange={(e) => handleUpdate(v.id, "value", e.target.value)}
                                                        placeholder="Light mode"
                                                        className="flex-1 bg-transparent border border-transparent hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded px-2 py-1 text-xs text-slate-200"
                                                    />
                                                </div>
                                                {/* Dark Value */}
                                                <div className="flex items-center gap-1.5">
                                                    {v.category === "color" && (
                                                        <div
                                                            className="w-5 h-5 rounded border border-slate-700 shadow-sm shrink-0"
                                                            style={{ backgroundColor: darkVal || "#0f172a" }}
                                                        />
                                                    )}
                                                    {v.category === "color" && (
                                                        <input
                                                            type="color"
                                                            value={darkVal.startsWith("#") && darkVal.length === 7 ? darkVal : "#0f172a"}
                                                            onChange={(e) => handleUpdateDarkMode(v.id, e.target.value)}
                                                            className="w-6 h-6 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0 shrink-0"
                                                        />
                                                    )}
                                                    <input
                                                        type="text"
                                                        value={darkVal}
                                                        onChange={(e) => handleUpdateDarkMode(v.id, e.target.value)}
                                                        placeholder="Dark mode override"
                                                        className="flex-1 bg-transparent border border-transparent hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded px-2 py-1 text-xs text-indigo-200 placeholder:text-slate-600"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(v.id)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                title="Delete token"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                        Tokens will be dynamically compiled to <code className="text-indigo-400">:root</code> and <code className="text-indigo-400">[data-theme="dark"]</code> CSS rules.
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAndApply}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
                        >
                            {saveSuccess ? (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    Applied!
                                </>
                            ) : (
                                "Apply & Save Tokens"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VariablesManagerModal;
