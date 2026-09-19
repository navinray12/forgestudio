import React, { useState } from "react";
import { X, Plus, Trash2, Download, Upload, Palette, Type, Move, Layers, Sparkles, Check } from "lucide-react";

export interface DesignVariable {
    id: string;
    name: string;
    category: "color" | "typography" | "spacing" | "shadow" | "radius" | "custom";
    token: string;
    value: string;
    description?: string;
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

        const newVar: DesignVariable = {
            id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: newVarName.trim(),
            category: activeTab,
            token: sanitizedToken,
            value: newVarValue.trim(),
        };

        const updated = [...localVars, newVar];
        setLocalVars(updated);
        setNewVarName("");
        setNewVarValue("");
        setNewVarToken("");
    };

    const handleDelete = (id: string) => {
        setLocalVars(localVars.filter((v) => v.id !== id));
    };

    const handleUpdate = (id: string, field: "name" | "token" | "value", val: string) => {
        setLocalVars(
            localVars.map((v) => {
                if (v.id === id) {
                    return { ...v, [field]: val };
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
            version: 1,
            exportedAt: new Date().toISOString(),
            variables: localVars,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `forgestudio-design-tokens-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result as string);
                if (Array.isArray(parsed.variables)) {
                    setLocalVars(parsed.variables);
                } else if (Array.isArray(parsed)) {
                    setLocalVars(parsed);
                } else {
                    setImportError("Invalid design tokens JSON format.");
                }
            } catch {
                setImportError("Error parsing JSON file.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-750 text-slate-100 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                            <Palette className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Design Variables Manager</h2>
                            <p className="text-xs text-slate-400">Manage centralized CSS variables and design tokens (F-339)</p>
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
                            Add New {CATEGORIES.find((c) => c.key === activeTab)?.label} Token
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] text-slate-400 mb-1">Display Name</label>
                                <input
                                    type="text"
                                    placeholder={activeTab === "color" ? "Accent Color" : "Headline Spacing"}
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
                                <label className="block text-[11px] text-slate-400 mb-1">Value</label>
                                <div className="flex gap-2">
                                    {activeTab === "color" && (
                                        <input
                                            type="color"
                                            value={newVarValue.startsWith("#") && newVarValue.length === 7 ? newVarValue : "#6366f1"}
                                            onChange={(e) => setNewVarValue(e.target.value)}
                                            className="w-8 h-8 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0"
                                        />
                                    )}
                                    <input
                                        type="text"
                                        placeholder={activeTab === "color" ? "#6366f1" : activeTab === "spacing" ? "24px" : "1.5rem"}
                                        value={newVarValue}
                                        onChange={(e) => setNewVarValue(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="submit"
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
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
                                {filteredVars.map((v) => (
                                    <div key={v.id} className="p-3 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                                        {v.category === "color" && (
                                            <div
                                                className="w-7 h-7 rounded-md border border-slate-700 shadow-sm shrink-0"
                                                style={{ backgroundColor: v.value }}
                                            />
                                        )}
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <input
                                                type="text"
                                                value={v.name}
                                                onChange={(e) => handleUpdate(v.id, "name", e.target.value)}
                                                className="bg-transparent border border-transparent hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded px-2 py-1 text-xs text-slate-200"
                                            />
                                            <input
                                                type="text"
                                                value={v.token}
                                                onChange={(e) => handleUpdate(v.id, "token", e.target.value)}
                                                className="bg-transparent border border-transparent hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded px-2 py-1 text-xs font-mono text-indigo-300"
                                            />
                                            <div className="flex items-center gap-2">
                                                {v.category === "color" && (
                                                    <input
                                                        type="color"
                                                        value={v.value.startsWith("#") && v.value.length === 7 ? v.value : "#6366f1"}
                                                        onChange={(e) => handleUpdate(v.id, "value", e.target.value)}
                                                        className="w-6 h-6 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0"
                                                    />
                                                )}
                                                <input
                                                    type="text"
                                                    value={v.value}
                                                    onChange={(e) => handleUpdate(v.id, "value", e.target.value)}
                                                    className="flex-1 bg-transparent border border-transparent hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded px-2 py-1 text-xs text-slate-200"
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
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                        Tokens will be dynamically compiled to <code className="text-indigo-400">:root</code> CSS rules.
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
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
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
