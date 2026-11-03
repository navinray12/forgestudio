import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveDashboardWorkspace, showPersonalWorkspace, type DashboardWorkspaceOption } from "./workspace-selection";
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
export function useDashboardWorkspace(userId?: string) {
  const { workspaceId: requestedWorkspace } = useParams();
  const navigate = useNavigate();
  const storageKey = `forgestudio.workspace.${userId || "anonymous"}`;
  const [workspaceId, setWorkspaceId] = useState("personal");
  const [workspaces, setWorkspaces] = useState<DashboardWorkspaceOption[]>([]);
  const [personalSiteCount, setPersonalSiteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const preferred = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { setLoading(true); setError(""); }, 0);
    fetch(`${apiUrl}/api/v1/workspaces`, { credentials: "include", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || data?.error?.message || "Unable to load workspaces.");
        if (!Array.isArray(data?.workspaces)) throw new Error("Unable to load workspaces.");
        if (controller.signal.aborted) return;
        const items: DashboardWorkspaceOption[] = data.workspaces;
        setWorkspaces(items);
        const unassignedCount = Number(data.personalSiteCount) || 0;
        setPersonalSiteCount(unassignedCount);
        let saved: string | null = preferred.current || requestedWorkspace || null;
        preferred.current = null;
        try { saved ||= localStorage.getItem(storageKey); } catch { /* Storage is optional. */ }
        const selected = resolveDashboardWorkspace(items, unassignedCount, saved);
        setWorkspaceId(selected);
        try { localStorage.setItem(storageKey, selected); } catch { /* Storage is optional. */ }
        if (requestedWorkspace && requestedWorkspace !== selected) navigate(selected === "personal" ? "/dashboard" : `/dashboard/workspaces/${selected}`, { replace: true });
      }).catch(reason => { if (!controller.signal.aborted) { setWorkspaces([]); setPersonalSiteCount(0); setError(reason instanceof Error ? reason.message : "Unable to load workspaces."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [navigate, storageKey, revision, requestedWorkspace]);
  const selectWorkspace = useCallback((id: string) => {
    if (id === "personal" && !showPersonalWorkspace(workspaces, personalSiteCount)) return;
    if (id !== "personal" && !workspaces.some(item => item.id === id)) return;
    setWorkspaceId(id);
    try { localStorage.setItem(storageKey, id); } catch { /* Storage is optional. */ }
    if (requestedWorkspace) navigate(id === "personal" ? "/dashboard" : `/dashboard/workspaces/${id}`);
  }, [navigate, personalSiteCount, requestedWorkspace, storageKey, workspaces]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === storageKey) setRevision(value => value + 1); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);
  return { workspaceId, workspaces, showPersonal: showPersonalWorkspace(workspaces, personalSiteCount),
    loading, error, selectWorkspace, retry: (preferredId?: string) => { if (preferredId) preferred.current = preferredId; setRevision(value => value + 1); } };
}
