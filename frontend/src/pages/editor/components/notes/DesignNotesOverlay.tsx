import React, { useState, useEffect, useCallback } from "react";

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
  onSelectElement?: (elementId: string) => void;
  onNotesCountChange?: (count: number) => void;
}

export const DesignNotesOverlay: React.FC<DesignNotesOverlayProps> = ({
  websiteId,
  activeElementId,
  isOpen,
  onClose,
  onSelectElement,
  onNotesCountChange,
}) => {
  const [notes, setNotes] = useState<DesignNoteItem[]>([]);
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterResolved, setFilterResolved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const updateNotesList = useCallback(
    (updated: DesignNoteItem[]) => {
      setNotes(updated);
      const openCount = updated.filter((n) => !n.resolved).length;
      onNotesCountChange?.(openCount);
    },
    [onNotesCountChange]
  );

  const fetchNotes = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/design-notes?websiteId=${websiteId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const loadedNotes = data.notes || [];
        updateNotesList(loadedNotes);
      } else {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.message || "Failed to load notes");
      }
    } catch {
      setErrorMessage("Network error while loading design notes");
    } finally {
      setLoading(false);
    }
  }, [websiteId, updateNotesList]);

  // Initial load on mount or when website changes to seed count
  useEffect(() => {
    if (websiteId) {
      queueMicrotask(() => {
        fetchNotes();
      });
    }
  }, [websiteId, fetchNotes]);

  // Re-fetch when opened
  useEffect(() => {
    if (isOpen && websiteId) {
      queueMicrotask(() => {
        fetchNotes();
      });
    }
  }, [isOpen, websiteId, fetchNotes]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !websiteId) return;
    setSubmitting(true);
    setErrorMessage("");
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
      const data = await res.json().catch(() => null);
      if (res.ok && data?.note) {
        updateNotesList([data.note, ...notes]);
        setNewContent("");
      } else {
        setErrorMessage(data?.message || "Failed to create comment");
      }
    } catch {
      setErrorMessage("Network error while creating note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleResolve = async (noteId: string, currentResolved: boolean) => {
    setErrorMessage("");
    try {
      const endpoint = currentResolved
        ? `/api/design-notes/${noteId}/reopen`
        : `/api/design-notes/${noteId}/resolve`;
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const updated = notes.map((n) =>
          n.id === noteId ? { ...n, resolved: !currentResolved } : n
        );
        updateNotesList(updated);
      } else {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.message || "Failed to update note status");
      }
    } catch {
      setErrorMessage("Network error while updating note status");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setErrorMessage("");
    try {
      const res = await fetch(`/api/design-notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        const updated = notes.filter((n) => n.id !== noteId);
        updateNotesList(updated);
      } else {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.message || "Failed to delete note");
      }
    } catch {
      setErrorMessage("Network error while deleting note");
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
        width: "380px",
        maxHeight: "560px",
        backgroundColor: "#18181b",
        border: "1px solid #27272a",
        borderRadius: "14px",
        boxShadow: "0 20px 30px -10px rgba(0, 0, 0, 0.7)",
        zIndex: 99990,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: "#f4f4f5",
        fontFamily: "inherit",
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
          <span style={{ fontWeight: 700, fontSize: "13px" }}>
            Design Comments{" "}
            {activeElementId ? (
              <span style={{ color: "#a78bfa", fontWeight: 600 }}>
                (#{activeElementId.slice(-6)})
              </span>
            ) : (
              <span style={{ color: "#71717a", fontWeight: 500 }}>(Global)</span>
            )}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setFilterResolved(!filterResolved)}
            style={{
              fontSize: "11px",
              padding: "3px 8px",
              borderRadius: "6px",
              backgroundColor: filterResolved ? "#3b82f6" : "#27272a",
              color: filterResolved ? "white" : "#a1a1aa",
              border: "1px solid",
              borderColor: filterResolved ? "#2563eb" : "#3f3f46",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {filterResolved ? "All Notes" : "Open Only"}
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
              padding: "2px 6px",
              borderRadius: "4px",
            }}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div
          style={{
            padding: "8px 14px",
            backgroundColor: "#7f1d1d40",
            borderBottom: "1px solid #991b1b",
            color: "#fca5a5",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Note List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", color: "#a1a1aa", fontSize: "12px", padding: "24px" }}>
            Loading comments...
          </div>
        ) : displayedNotes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#71717a",
              fontSize: "12px",
              padding: "28px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "24px", opacity: 0.5 }}>💭</span>
            <span>
              {filterResolved ? "No design comments found." : "No open comments on this design."}
            </span>
            <span style={{ fontSize: "11px", color: "#52525b" }}>
              Leave feedback below for your team or reviewers.
            </span>
          </div>
        ) : (
          displayedNotes.map((note) => (
            <div
              key={note.id}
              style={{
                backgroundColor: note.resolved ? "#27272a30" : "#27272a",
                border: "1px solid",
                borderColor: note.resolved ? "#3f3f46" : "#3b82f640",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "12px",
                opacity: note.resolved ? 0.7 : 1,
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontWeight: 600, color: "#93c5fd", fontSize: "12px" }}>
                  {note.author?.fullName || note.author?.email || "Team Member"}
                </span>
                <span style={{ color: "#71717a", fontSize: "10px" }}>
                  {new Date(note.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Element badge with navigation */}
              {note.elementId && (
                <div style={{ marginBottom: "6px" }}>
                  <button
                    type="button"
                    onClick={() => onSelectElement?.(note.elementId!)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: "6px",
                      backgroundColor: "#312e81",
                      color: "#c7d2fe",
                      border: "1px solid #4338ca",
                      cursor: onSelectElement ? "pointer" : "default",
                      transition: "opacity 0.15s ease",
                    }}
                    title="Select and scroll to element on canvas"
                  >
                    <span>🎯</span>
                    <span>Element #{note.elementId.slice(-6)}</span>
                  </button>
                </div>
              )}

              <p
                style={{
                  margin: "0 0 10px",
                  lineHeight: "1.5",
                  color: "#e4e4e7",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {note.content}
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #3f3f4650",
                  paddingTop: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleToggleResolve(note.id, note.resolved)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: note.resolved ? "#f59e0b" : "#10b981",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {note.resolved ? "↩ Reopen" : "✓ Resolve"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ef4444",
                    fontSize: "11px",
                    fontWeight: 600,
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

      {/* Input Composer */}
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
          placeholder={
            activeElementId
              ? `Comment on element #${activeElementId.slice(-6)}...`
              : "Leave a global project comment..."
          }
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 12px",
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            color: "white",
            fontSize: "12px",
            outline: "none",
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
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            opacity: submitting || !newContent.trim() ? 0.5 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          {submitting ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default DesignNotesOverlay;
