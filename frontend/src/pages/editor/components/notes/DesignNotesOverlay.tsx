import React, { useState, useEffect } from "react";

export interface DesignNoteItem {
  id: string;
  websiteId: string;
  elementId?: string | null;
  content: string;
  resolved: boolean;
  author?: {
    id: string;
    fullName?: string;
    email?: string;
  };
  createdAt: string;
}

interface DesignNotesOverlayProps {
  websiteId: string;
  activeElementId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DesignNotesOverlay: React.FC<DesignNotesOverlayProps> = ({
  websiteId,
  activeElementId,
  isOpen,
  onClose,
}) => {
  const [notes, setNotes] = useState<DesignNoteItem[]>([]);
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterResolved, setFilterResolved] = useState(false);

  const fetchNotes = async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/design-notes?websiteId=${websiteId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Failed to fetch design notes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && websiteId) {
      fetchNotes();
    }
  }, [isOpen, websiteId]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !websiteId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/design-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          websiteId,
          elementId: activeElementId || null,
          content: newContent.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => [data.note, ...prev]);
        setNewContent("");
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleResolve = async (noteId: string, currentResolved: boolean) => {
    try {
      const endpoint = currentResolved
        ? `/api/design-notes/${noteId}/reopen`
        : `/api/design-notes/${noteId}/resolve`;
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, resolved: !currentResolved } : n))
        );
      }
    } catch (err) {
      console.error("Failed to toggle note resolution:", err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/design-notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  if (!isOpen) return null;

  const displayedNotes = notes.filter((n) => (filterResolved ? true : !n.resolved));

  return (
    <div
      style={{
        position: "fixed",
        right: "16px",
        bottom: "16px",
        width: "360px",
        maxHeight: "520px",
        backgroundColor: "#18181b",
        border: "1px solid #27272a",
        borderRadius: "12px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
        zIndex: 99990,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: "#f4f4f5",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #27272a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#202023",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>💬</span>
          <span style={{ fontWeight: 600, fontSize: "13px" }}>
            Design Notes {activeElementId ? `(#${activeElementId.slice(-4)})` : "(Global)"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setFilterResolved(!filterResolved)}
            style={{
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: filterResolved ? "#3b82f6" : "#27272a",
              color: filterResolved ? "white" : "#a1a1aa",
              border: "none",
              cursor: "pointer",
            }}
          >
            {filterResolved ? "All" : "Open only"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#a1a1aa",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Note List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#a1a1aa", fontSize: "12px", padding: "20px" }}>
            Loading notes...
          </div>
        ) : displayedNotes.length === 0 ? (
          <div style={{ textAlign: "center", color: "#71717a", fontSize: "12px", padding: "20px" }}>
            No design notes found. Add the first comment below!
          </div>
        ) : (
          displayedNotes.map((note) => (
            <div
              key={note.id}
              style={{
                backgroundColor: note.resolved ? "#27272a40" : "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "12px",
                opacity: note.resolved ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontWeight: 600, color: "#93c5fd" }}>
                  {note.author?.fullName || note.author?.email || "Team Member"}
                </span>
                <span style={{ color: "#71717a", fontSize: "10px" }}>
                  {new Date(note.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p style={{ margin: "0 0 8px", lineHeight: "1.4", color: "#e4e4e7" }}>{note.content}</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleToggleResolve(note.id, note.resolved)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: note.resolved ? "#f59e0b" : "#10b981",
                    fontSize: "11px",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {note.resolved ? "Reopen" : "✓ Resolve"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ef4444",
                    fontSize: "11px",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleCreateNote}
        style={{
          padding: "12px",
          borderTop: "1px solid #27272a",
          backgroundColor: "#202023",
          display: "flex",
          gap: "8px",
        }}
      >
        <input
          type="text"
          placeholder="Leave a comment on this element..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 12px",
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "6px",
            color: "white",
            fontSize: "12px",
          }}
        />
        <button
          type="submit"
          disabled={submitting || !newContent.trim()}
          style={{
            padding: "8px 14px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            opacity: submitting || !newContent.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};
export default DesignNotesOverlay;
