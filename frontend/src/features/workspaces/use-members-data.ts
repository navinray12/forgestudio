import { useCallback, useEffect, useRef, useState } from "react";
import { workspaceRequest, WorkspaceRequestError } from "./workspace-api";
import type { WorkspaceDetails, WorkspaceSummary } from "./workspace-api";
import type { WorkspaceInvitation } from "./members-model";
import { subscribeToMembersChanges } from "./members-sync";
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
interface MembersState { workspace: WorkspaceDetails | null; invitations: WorkspaceInvitation[]; loading: boolean; refreshing: boolean; error: string; sessionExpired: boolean }
const empty: MembersState = { workspace: null, invitations: [], loading: true, refreshing: false, error: "", sessionExpired: false };
export function useMembersData(workspaceId: string, onSelect: (id: string) => void) {
  const [data, setData] = useState<MembersState>(empty);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const inFlight = useRef<AbortController | null>(null);
  const paused = useRef(false);
  const expired = useRef(false);
  const [loadedWorkspace, setLoadedWorkspace] = useState("");
  const expireSession = useCallback((message: string) => { expired.current = true; inFlight.current?.abort(); setData({ ...empty, loading: false, sessionExpired: true, error: message }); }, []);
  const load = useCallback(async () => {
    if (expired.current) return false;
    inFlight.current?.abort();
    const controller = new AbortController(); inFlight.current = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
    try {
      const list = await workspaceRequest<{ workspaces: WorkspaceSummary[] }>(apiUrl, "", { signal });
      const items = list.workspaces || [];
      let workspace: WorkspaceDetails | null = null;
      let invitations: WorkspaceInvitation[] = [];
      if (workspaceId !== "personal") {
        workspace = (await workspaceRequest<{ workspace: WorkspaceDetails }>(apiUrl, `/${workspaceId}`, { signal })).workspace;
        if (workspace.userRole !== "MEMBER") invitations = (await workspaceRequest<{ invitations: WorkspaceInvitation[] }>(apiUrl, `/${workspaceId}/invitations`, { signal })).invitations;
      }
      if (controller.signal.aborted) return false;
      setLoadedWorkspace(workspaceId); setWorkspaces(items);
      setData({ workspace, invitations, loading: false, refreshing: false, error: "", sessionExpired: false });
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      if (error instanceof WorkspaceRequestError && error.status === 401) expireSession(error.message);
      else setData({ ...empty, loading: false, error: error instanceof Error ? error.message : "Unable to load members." });
      return false;
    } finally { if (inFlight.current === controller) inFlight.current = null; }
  }, [workspaceId, expireSession]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    const refresh = () => { if (!document.hidden && !paused.current && !expired.current && !inFlight.current) void load(); };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    const unsubscribe = subscribeToMembersChanges(id => { if (id === workspaceId) refresh(); });
    return () => { window.clearTimeout(timer); window.clearInterval(interval); inFlight.current?.abort(); unsubscribe(); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load, workspaceId]);
  const refresh = useCallback(() => { setData(previous => ({ ...previous, refreshing: true })); return load(); }, [load]);
  const setRefreshPaused = useCallback((value: boolean) => { paused.current = value; setSelectionLocked(value); }, []);
  // Never render a previous workspace's membership while a new selection is loading.
  const current = loadedWorkspace === workspaceId || data.error ? data : empty;
  return { ...current, workspaces, selectionLocked, refresh, load, selectWorkspace: onSelect, expireSession, setRefreshPaused };
}
