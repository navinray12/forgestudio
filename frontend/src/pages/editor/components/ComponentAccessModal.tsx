import { useState } from "react";
import type { EditorElement } from "../WebsiteEditor";

interface AccessRecord {
    id: string;
    websiteId: string;
    componentId: string;
    userId: string;
    permission: string;
    user?: {
        id: string;
        fullName: string;
        email: string;
    };
}

interface ComponentAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    websiteId: string;
    apiUrl: string;
    elements: EditorElement[];
    onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
}

export default function ComponentAccessModal({ isOpen, onClose, websiteId: _websiteId, apiUrl: _apiUrl, elements, onUpdateElement }: ComponentAccessModalProps) {
    const [search, setSearch] = useState("");
    const [_accessData, _setAccessData] = useState<Record<string, AccessRecord[]>>({});
    const [_loading, _setLoading] = useState(false);

    // Flatten elements for the list
    const flattenElements = (els: EditorElement[]): EditorElement[] => {
        let result: EditorElement[] = [];
        els.forEach(el => {
            result.push(el);
            if (el.children) result = result.concat(flattenElements(el.children));
        });
        return result;
    };

    const allElements = flattenElements(elements);
    const filteredElements = allElements.filter(el =>
        el.type.toLowerCase().includes(search.toLowerCase()) ||
        (el.content && el.content.toLowerCase().includes(search.toLowerCase())) ||
        el.id.includes(search)
    );

    const toggleLock = (el: EditorElement) => {
        onUpdateElement(el.id, { isProtected: !el.isProtected });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Component Access & Permissions</h2>
                        <p className="text-xs text-slate-500 mt-1">Control which components collaborators can edit.</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                        ✕
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search components..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 text-sm px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    <div className="flex flex-col gap-3">
                        {filteredElements.length === 0 ? (
                            <div className="text-center p-8 text-slate-400 text-sm">No components match your search.</div>
                        ) : (
                            filteredElements.map(el => (
                                <div key={el.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                                                {el.isProtected ? "🔒" : "📄"}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    {el.type.charAt(0).toUpperCase() + el.type.slice(1)}
                                                    <span className="text-[10px] font-mono text-slate-400">#{el.id.slice(0, 6)}</span>
                                                </h3>
                                                <p className="text-xs font-medium text-slate-500 mt-0.5">
                                                    Editing: <span className={el.isProtected ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>
                                                        {el.isProtected ? "Restricted" : "Open to everyone"}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleLock(el)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${el.isProtected
                                                ? "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                                                : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"}`}
                                        >
                                            {el.isProtected ? "Unlock Component" : "Protect Component"}
                                        </button>
                                    </div>

                                    {el.isProtected && (
                                        <div className="mt-2 pt-3 border-t border-slate-100">
                                            <p className="text-xs text-slate-500 mb-2 font-medium">Explicitly Allowed Editors:</p>
                                            <div className="text-xs text-slate-400 bg-slate-50 rounded p-2 border border-slate-100">
                                                To add explicit collaborators, use the upcoming F-406 Role Manager to assign members to this component context.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

