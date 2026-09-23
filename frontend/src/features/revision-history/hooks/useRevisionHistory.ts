import { useState, useCallback, useEffect } from "react";
import type { RevisionItem, RestoreConfirmationState, PageSettingsData } from "../types/revisionHistory.types";
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";
import { revisionHistoryService } from "../services/revisionHistoryService";

export function useRevisionHistory(websiteId: string, apiUrl: string = "") {
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<RevisionItem | null>(null);
  const [confirmRestoreState, setConfirmRestoreState] = useState<RestoreConfirmationState>({
    isOpen: false,
    revision: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refreshes revisions list from authoritative server API (with local fallback)
   */
  const refreshRevisions = useCallback(async () => {
    if (!websiteId) {
      setRevisions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const items = await revisionHistoryService.fetchServerRevisions(websiteId, apiUrl);
      setRevisions(items);
    } catch (err: any) {
      setError(err?.message || "Failed to load revision history.");
      // Resilient fallback
      setRevisions(revisionHistoryService.getRevisions(websiteId));
    } finally {
      setIsLoading(false);
    }
  }, [websiteId, apiUrl]);

  useEffect(() => {
    refreshRevisions();
  }, [refreshRevisions]);

  /**
   * Creates an explicit manual checkpoint revision on the server
   */
  const createManualCheckpoint = useCallback(
    async (
      description: string = "Manual checkpoint",
      snapshotData?: {
        elements?: EditorElement[];
        pageSettings?: PageSettingsData;
        pages?: any[];
        siteParts?: any;
        globalSettings?: any;
        breakpoints?: any[];
        popups?: any[];
        pageCss?: string;
        homePageId?: string;
      }
    ) => {
      if (!websiteId) return null;
      setIsLoading(true);
      setError(null);
      try {
        const newRev = await revisionHistoryService.createServerRevision(
          websiteId,
          {
            description,
            revisionType: "MANUAL",
            ...snapshotData,
          },
          apiUrl
        );
        await refreshRevisions();
        return newRev;
      } catch (err: any) {
        console.error("Failed to create server revision:", err);
        setError(err?.message || "Failed to save revision checkpoint.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [websiteId, apiUrl, refreshRevisions]
  );

  /**
   * Opens restore confirmation prompt
   */
  const promptRestore = useCallback((revision: RevisionItem) => {
    setError(null);
    setConfirmRestoreState({
      isOpen: true,
      revision,
    });
  }, []);

  /**
   * Cancels restore dialog
   */
  const cancelRestore = useCallback(() => {
    setConfirmRestoreState({
      isOpen: false,
      revision: null,
    });
  }, []);

  /**
   * Confirms and executes safe restoration on server and editor
   * INVARIANT: Restore updates working draft ONLY. Does not publish.
   */
  const confirmRestore = useCallback(
    async (
      onRestoreCallback: (
        elements: EditorElement[],
        pageSettings?: PageSettingsData,
        fullRestoredState?: any
      ) => void
    ) => {
      const revToRestore = confirmRestoreState.revision;
      if (!revToRestore) {
        setError("No revision selected for restoration.");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 1. Attempt server-side restoration to update database working draft
        let restoredData: any = null;
        try {
          const serverResult = await revisionHistoryService.restoreServerRevision(
            websiteId,
            revToRestore.id,
            apiUrl
          );
          restoredData = serverResult?.restoredRevision?.data;
        } catch (serverErr: any) {
          console.warn("Server restore API failed, checking local snapshot:", serverErr);
        }

        // If server returned snapshot data, prefer it; otherwise use local snapshot
        const elementsSource = restoredData?.elements || revToRestore.elements || [];
        const pageSettingsSource = restoredData?.pageSettings || revToRestore.pageSettings;

        // Deep clone to avoid mutable references
        const clonedElements: EditorElement[] = JSON.parse(JSON.stringify(elementsSource));
        const clonedPageSettings: PageSettingsData | undefined = pageSettingsSource
          ? JSON.parse(JSON.stringify(pageSettingsSource))
          : undefined;

        // Execute safety restore callback to editor
        onRestoreCallback(clonedElements, clonedPageSettings, restoredData);

        // Close modal & update state
        setConfirmRestoreState({ isOpen: false, revision: null });
        setSelectedRevision(revToRestore);

        // Refresh revisions to include the RESTORE checkpoint
        await refreshRevisions();
      } catch (err: any) {
        console.error("Restoration failed:", err);
        setError(err?.message || "Failed to restore revision state safely.");
      } finally {
        setIsLoading(false);
      }
    },
    [confirmRestoreState.revision, websiteId, apiUrl, refreshRevisions]
  );

  /**
   * Deletes a revision
   */
  const deleteRevision = useCallback(
    (revisionId: string) => {
      if (!websiteId || !revisionId) return;
      const updated = revisionHistoryService.deleteRevision(websiteId, revisionId);
      setRevisions(updated);
      if (selectedRevision?.id === revisionId) {
        setSelectedRevision(null);
      }
    },
    [websiteId, selectedRevision]
  );

  return {
    revisions,
    selectedRevision,
    confirmRestoreState,
    isLoading,
    error,
    setError,
    refreshRevisions,
    createManualCheckpoint,
    setSelectedRevision,
    promptRestore,
    cancelRestore,
    confirmRestore,
    deleteRevision,
  };
}
