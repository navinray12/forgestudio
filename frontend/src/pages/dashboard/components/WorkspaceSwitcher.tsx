import React, { useState, useEffect } from "react";

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  userRole?: string;
}

interface WorkspaceSwitcherProps {
  apiUrl: string;
  currentWorkspaceId: string | null;
  onSelectWorkspace: (id: string | null) => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  apiUrl,
  currentWorkspaceId,
  onSelectWorkspace,
}) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/workspaces`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (err) {
      // Fallback
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [apiUrl]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewWorkspaceName("");
        setIsCreating(false);
        fetchWorkspaces();
        if (data.workspace?.id) {
          onSelectWorkspace(data.workspace.id);
        }
      }
    } catch (err) {
      console.error("Failed to create workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 items-center overflow-x-auto whitespace-nowrap p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl max-w-fit border border-slate-200/60 dark:border-slate-700/60">
      <button
        type="button"
        onClick={() => onSelectWorkspace(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
          currentWorkspaceId === null
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700"
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50"
        }`}
      >
        🏢 Personal Workspace
      </button>

      {workspaces.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => onSelectWorkspace(w.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
            currentWorkspaceId === w.id
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50"
          }`}
        >
          {w.name}
        </button>
      ))}

      {isCreating ? (
        <form onSubmit={handleCreate} className="flex items-center gap-1.5 ml-1">
          <input
            type="text"
            placeholder="Workspace name..."
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded font-bold cursor-pointer"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="ml-1 px-2.5 py-1 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 rounded-lg transition flex-shrink-0 cursor-pointer"
        >
          + New Workspace
        </button>
      )}
    </div>
  );
};
export default WorkspaceSwitcher;
