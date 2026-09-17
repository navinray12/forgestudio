import { useState, useEffect } from "react";
import type { EditorElement } from "../WebsiteEditor";

interface Author {
    id: string;
    fullName: string | null;
    email: string | null;
}

interface Note {
    id: string;
    websiteId: string;
    elementId: string | null;
    authorId: string;
    content: string;
    status: "OPEN" | "RESOLVED";
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
    author: Author;
    resolver: Author | null;
}

interface NotesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    websiteId: string;
    apiUrl: string;
    selectedElementId: string | null;
    elements: EditorElement[];
}

export default function NotesPanel({ isOpen, onClose, websiteId, apiUrl, selectedElementId, elements }: NotesPanelProps) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Filters
    const [filter, setFilter] = useState<"ALL" | "OPEN" | "RESOLVED" | "ELEMENT">("ALL");

    useEffect(() => {
        if (isOpen) {
            fetchNotes();
        }
    }, [isOpen, websiteId]);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/design-notes?websiteId=${websiteId}`, { credentials: "include" });
            const data = await res.json();
            if (res.ok && data.notes) {
                setNotes(data.notes);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNoteContent.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/api/design-notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    websiteId,
                    content: newNoteContent,
                    elementId: filter === "ELEMENT" ? selectedElementId : null
                })
            });
            const data = await res.json();
            if (res.ok && data.note) {
                setNotes([data.note, ...notes]);
                setNewNoteContent("");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: "OPEN" | "RESOLVED") => {
        const action = currentStatus === "OPEN" ? "resolve" : "reopen";
        try {
            const res = await fetch(`${apiUrl}/api/design-notes/${id}/${action}`, {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok && data.note) {
                setNotes(notes.map(n => n.id === id ? data.note : n));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this note?")) return;
        try {
            const res = await fetch(`${apiUrl}/api/design-notes/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                setNotes(notes.filter(n => n.id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const getElementName = (elId: string) => {
        // Attempt to drill tree slightly or just surface standard label
        const findEl = (els: EditorElement[], target: string): EditorElement | null => {
            for (const el of els) {
                if (el.id === target) return el;
                if (el.children) {
                    const found = findEl(el.children, target);
                    if (found) return found;
                }
            }
            return null;
        };
        const el = findEl(elements, elId);
        if (!el) return elId.slice(0, 8);
        return el.type.charAt(0).toUpperCase() + el.type.slice(1);
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(new Date(dateString));
    };

    const filteredNotes = notes.filter(n => {
        if (filter === "OPEN") return n.status === "OPEN";
        if (filter === "RESOLVED") return n.status === "RESOLVED";
        if (filter === "ELEMENT") return (selectedElementId && n.elementId === selectedElementId);
        return true; // ALL
    });

    if (!isOpen) return null;

    return (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right-8 fade-in">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>💬</span> Collaboration Notes
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:bg-slate-200 rounded p-1">
                    ✕
                </button>
            </div>

            {/* Filters */}
            <div className="p-3 border-b border-slate-100 flex items-center gap-1 overflow-x-auto bg-slate-50/20">
                <button onClick={() => setFilter("ALL")} className={`px-2 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-widest transition-colors ${filter === "ALL" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>All</button>
                <button onClick={() => setFilter("OPEN")} className={`px-2 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-widest transition-colors ${filter === "OPEN" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>Open</button>
                <button onClick={() => setFilter("RESOLVED")} className={`px-2 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-widest transition-colors ${filter === "RESOLVED" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}>Resolved</button>
                <button onClick={() => setFilter("ELEMENT")} className={`px-2 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-widest transition-colors ${filter === "ELEMENT" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>This Element</button>
            </div>

            {/* Note Composer */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
                <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder={filter === "ELEMENT" && selectedElementId ? `Add note for ${getElementName(selectedElementId)}...` : "Add a project note..."}
                    className="w-full h-20 text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none font-sans"
                />
                <button
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim() || submitting}
                    className="self-end px-4 py-1.5 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {submitting ? "Posting..." : "Post Note"}
                </button>
            </div>

            {/* Note List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {loading ? (
                    <div className="text-center text-xs text-slate-400 mt-4">Loading notes...</div>
                ) : filteredNotes.length === 0 ? (
                    <div className="text-center flex flex-col items-center justify-center mt-8 gap-2">
                        <span className="text-3xl grayscale opacity-30">💭</span>
                        <p className="text-xs text-slate-500 max-w-[200px]">No notes found matching this filter.</p>
                    </div>
                ) : (
                    filteredNotes.map(note => (
                        <div key={note.id} className={`rounded-xl border p-3 flex flex-col gap-2 transition-all ${note.status === "RESOLVED" ? "bg-slate-50 border-slate-200 opacity-60" : "bg-white border-blue-100 shadow-sm"}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                        {note.author?.fullName?.charAt(0) || note.author?.email?.charAt(0) || "U"}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-slate-700 leading-none">{note.author?.fullName || "User"}</span>
                                        <span className="text-[9px] text-slate-400 mt-0.5">{formatDate(note.createdAt)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggleStatus(note.id, note.status)}
                                    className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${note.status === "RESOLVED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" : "text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                                >
                                    {note.status === "RESOLVED" ? "✓ Resolved" : "Resolve"}
                                </button>
                            </div>

                            {note.elementId && (
                                <div className="self-start px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[9px] font-bold border border-purple-100 mt-1">
                                    Attached to {getElementName(note.elementId)}
                                </div>
                            )}

                            <p className="text-[12px] text-slate-800 leading-relaxed font-medium whitespace-pre-wrap mt-1">
                                {note.content}
                            </p>

                            <div className="flex items-center justify-end mt-1 gap-2 border-t pt-2 border-slate-100">
                                <button onClick={() => handleDelete(note.id)} className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-wider">Delete</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
