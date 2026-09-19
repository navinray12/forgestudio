import React, { useState } from "react";
import { X, Plus, Trash2, Download, Upload, Code2, Check, ShieldAlert, Eye } from "lucide-react";

export interface GlobalClass {
    id: string;
    name: string;
    className: string;
    description?: string;
    styles: Record<string, string | number>;
    pseudoStyles?: {
        hover?: Record<string, string | number>;
        focus?: Record<string, string | number>;
        active?: Record<string, string | number>;
    };
    createdByRole?: string;
}

interface ClassManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    classes: GlobalClass[];
    onSaveClasses: (updated: GlobalClass[]) => void;
    userRole?: string;
}

export const ClassManagerModal: React.FC<ClassManagerModalProps> = ({
    isOpen,
    onClose,
    classes,
    onSaveClasses,
    userRole = "OWNER",
}) => {
    const [localClasses, setLocalClasses] = useState<GlobalClass[]>(classes);
    const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
    const [activePseudo, setActivePseudo] = useState<"normal" | "hover" | "active">("normal");
    const [newClassName, setNewClassName] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    if (!isOpen) return null;

    const isReadOnly = userRole === "VIEWER" || userRole === "CONTENT_EDITOR";
    const selectedClass = localClasses.find((c) => c.id === selectedClassId) || localClasses[0];

    const handleAddClass = (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly || !newClassName.trim()) return;

        const cleanName = newClassName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
        const formattedClassName = cleanName.startsWith("fs-") ? cleanName : `fs-${cleanName}`;

        const newClass: GlobalClass = {
            id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: newClassName.trim(),
            className: formattedClassName,
            description: "Custom reusable class",
            styles: {
                backgroundColor: "#1e293b",
                color: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
            },
            pseudoStyles: {
                hover: {
                    backgroundColor: "#334155",
                },
            },
            createdByRole: userRole,
        };

        const updated = [...localClasses, newClass];
        setLocalClasses(updated);
        setSelectedClassId(newClass.id);
        setNewClassName("");
    };

    const handleDeleteClass = (id: string) => {
        if (isReadOnly) return;
        const updated = localClasses.filter((c) => c.id !== id);
        setLocalClasses(updated);
        if (selectedClassId === id) {
            setSelectedClassId(updated[0]?.id || "");
        }
    };

    const handleStyleChange = (prop: string, value: string) => {
        if (isReadOnly || !selectedClass) return;

        setLocalClasses(
            localClasses.map((c) => {
                if (c.id !== selectedClass.id) return c;

                if (activePseudo === "normal") {
                    return {
                        ...c,
                        styles: { ...c.styles, [prop]: value },
                    };
                } else {
                    const pseudoObj = c.pseudoStyles || {};
                    const currentTarget = pseudoObj[activePseudo] || {};
                    return {
                        ...c,
                        pseudoStyles: {
                            ...pseudoObj,
                            [activePseudo]: { ...currentTarget, [prop]: value },
                        },
                    };
                }
            })
        );
    };

    const handleSaveAndApply = () => {
        onSaveClasses(localClasses);
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
            classes: localClasses,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `forgestudio-global-classes-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || isReadOnly) return;
        setImportError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result as string);
                if (Array.isArray(parsed.classes)) {
                    setLocalClasses(parsed.classes);
                    setSelectedClassId(parsed.classes[0]?.id || "");
                } else if (Array.isArray(parsed)) {
                    setLocalClasses(parsed);
                    setSelectedClassId(parsed[0]?.id || "");
                } else {
                    setImportError("Invalid global classes JSON format.");
                }
            } catch {
                setImportError("Error parsing JSON file.");
            }
        };
        reader.readAsText(file);
    };

    // Current styles being edited
    const currentStyles = selectedClass
        ? activePseudo === "normal"
            ? selectedClass.styles
            : selectedClass.pseudoStyles?.[activePseudo] || {}
        : {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-750 text-slate-100 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                            <Code2 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold">Global Class Manager</h2>
                                {isReadOnly && (
                                    <span className="flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        <ShieldAlert className="w-3 h-3" /> Read Only ({userRole})
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">
                                Create reusable CSS utility and component classes with role protection (F-340, F-341)
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                            title="Export Global Classes to JSON (F-343)"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                        {!isReadOnly && (
                            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors cursor-pointer">
                                <Upload className="w-3.5 h-3.5" />
                                Import
                                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                            </label>
                        )}
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

                {/* Main 2-Column Split */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar: Class List */}
                    <div className="w-64 border-r border-slate-800 bg-slate-950/40 flex flex-col">
                        {!isReadOnly && (
                            <form onSubmit={handleAddClass} className="p-3 border-b border-slate-800 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Class name..."
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                                />
                                <button
                                    type="submit"
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </form>
                        )}

                        <div className="flex-1 overflow-y-auto divide-y divide-slate-850 p-2 space-y-1">
                            {localClasses.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-xs">No classes created.</div>
                            ) : (
                                localClasses.map((cls) => (
                                    <div
                                        key={cls.id}
                                        onClick={() => setSelectedClassId(cls.id)}
                                        className={`p-2.5 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                            selectedClassId === cls.id
                                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                                : "text-slate-300 hover:bg-slate-800/50"
                                        }`}
                                    >
                                        <div className="truncate">
                                            <div className="font-semibold truncate">{cls.name}</div>
                                            <div className="font-mono text-[10px] text-slate-400 truncate">.{cls.className}</div>
                                        </div>
                                        {!isReadOnly && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClass(cls.id);
                                                }}
                                                className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Area: Class Editor & Live Preview */}
                    {selectedClass ? (
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/50">
                            {/* Class Subheader & Pseudo State Toggle */}
                            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
                                <div>
                                    <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                        .{selectedClass.className}
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                                            {selectedClass.name}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400">Configure styles applied by this class</div>
                                </div>

                                <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setActivePseudo("normal")}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                            activePseudo === "normal"
                                                ? "bg-emerald-600 text-white"
                                                : "text-slate-400 hover:text-slate-200"
                                        }`}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActivePseudo("hover")}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                            activePseudo === "hover"
                                                ? "bg-emerald-600 text-white"
                                                : "text-slate-400 hover:text-slate-200"
                                        }`}
                                    >
                                        :hover
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActivePseudo("active")}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                            activePseudo === "active"
                                                ? "bg-emerald-600 text-white"
                                                : "text-slate-400 hover:text-slate-200"
                                        }`}
                                    >
                                        :active
                                    </button>
                                </div>
                            </div>

                            {/* Property Inputs & Preview */}
                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Property Controls */}
                                <div className="space-y-4">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        CSS Declarations ({activePseudo})
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Background Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={
                                                    String(currentStyles.backgroundColor || "#1e293b").startsWith("#") &&
                                                    String(currentStyles.backgroundColor).length === 7
                                                        ? String(currentStyles.backgroundColor)
                                                        : "#1e293b"
                                                }
                                                disabled={isReadOnly}
                                                onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
                                                className="w-8 h-8 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0"
                                            />
                                            <input
                                                type="text"
                                                value={String(currentStyles.backgroundColor || "")}
                                                disabled={isReadOnly}
                                                placeholder="#1e293b or var(--fs-color-primary)"
                                                onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Text Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={
                                                    String(currentStyles.color || "#ffffff").startsWith("#") &&
                                                    String(currentStyles.color).length === 7
                                                        ? String(currentStyles.color)
                                                        : "#ffffff"
                                                }
                                                disabled={isReadOnly}
                                                onChange={(e) => handleStyleChange("color", e.target.value)}
                                                className="w-8 h-8 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0"
                                            />
                                            <input
                                                type="text"
                                                value={String(currentStyles.color || "")}
                                                disabled={isReadOnly}
                                                placeholder="#ffffff"
                                                onChange={(e) => handleStyleChange("color", e.target.value)}
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Padding</label>
                                            <input
                                                type="text"
                                                value={String(currentStyles.padding || "")}
                                                disabled={isReadOnly}
                                                placeholder="16px or 1rem 2rem"
                                                onChange={(e) => handleStyleChange("padding", e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Border Radius</label>
                                            <input
                                                type="text"
                                                value={String(currentStyles.borderRadius || "")}
                                                disabled={isReadOnly}
                                                placeholder="8px or 9999px"
                                                onChange={(e) => handleStyleChange("borderRadius", e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Border</label>
                                            <input
                                                type="text"
                                                value={String(currentStyles.border || "")}
                                                disabled={isReadOnly}
                                                placeholder="1px solid #334155"
                                                onChange={(e) => handleStyleChange("border", e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Box Shadow</label>
                                            <input
                                                type="text"
                                                value={String(currentStyles.boxShadow || "")}
                                                disabled={isReadOnly}
                                                placeholder="0 4px 6px -1px rgb(0 0 0 / 0.1)"
                                                onChange={(e) => handleStyleChange("boxShadow", e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Live Preview Box */}
                                <div className="space-y-4 flex flex-col">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5" />
                                        Interactive Preview
                                    </div>

                                    <div className="flex-1 bg-slate-950/60 rounded-xl border border-slate-800 p-8 flex items-center justify-center min-h-[220px]">
                                        <div
                                            className="transition-all duration-200 cursor-pointer text-center select-none shadow-md"
                                            style={{
                                                ...(selectedClass.styles as any),
                                                ...(activePseudo === "hover" ? (selectedClass.pseudoStyles?.hover as any) : {}),
                                                ...(activePseudo === "active" ? (selectedClass.pseudoStyles?.active as any) : {}),
                                            }}
                                        >
                                            <div className="font-semibold text-sm">Sample Element</div>
                                            <div className="text-xs opacity-75 mt-1">Applying .{selectedClass.className}</div>
                                        </div>
                                    </div>

                                    {/* Generated CSS Block */}
                                    <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-emerald-400/90 overflow-x-auto">
                                        <div>.{selectedClass.className} &#123;</div>
                                        {Object.entries(selectedClass.styles).map(([k, v]) => (
                                            <div key={k} className="pl-4">
                                                {k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: {v};
                                            </div>
                                        ))}
                                        <div>&#125;</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                            Select or create a class to start editing.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                        Global classes can be attached to any element on any page via the Style Inspector.
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        {!isReadOnly && (
                            <button
                                type="button"
                                onClick={handleSaveAndApply}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
                            >
                                {saveSuccess ? (
                                    <>
                                        <Check className="w-3.5 h-3.5" />
                                        Classes Saved!
                                    </>
                                ) : (
                                    "Save & Apply Classes"
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClassManagerModal;
