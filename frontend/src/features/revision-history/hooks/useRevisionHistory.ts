/**
 * @file Revision history feature: use Revision History. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { useState, useCallback, useEffect } from "react";
import type { RevisionItem, RestoreConfirmationState, PageSettingsData } from "../types/revisionHistory.types";
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";
import { revisionHistoryService } from "../services/revisionHistoryService";

/**
 * Coordinate revision history state and lifecycle for the calling component.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param apiUrl Api Url supplied to this operation (type: string). Defaults to "".
 */
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

        // Load immutable input; the editor's single save coordinator performs the guarded write.
        const revision = await revisionHistoryService.fetchServerRevisionById(websiteId, revToRestore.id, apiUrl);
        const restoredData = revision.data;
        if (!restoredData || typeof restoredData !== 'object') throw new Error('This revision has no readable document.');

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
