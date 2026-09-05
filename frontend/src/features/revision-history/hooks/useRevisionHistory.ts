import { useState, useCallback, useEffect } from "react";
import type { RevisionItem, RestoreConfirmationState, PageSettingsData } from "../types/revisionHistory.types";
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";
import { revisionHistoryService } from "../services/revisionHistoryService";

export function useRevisionHistory(websiteId: string) {
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<RevisionItem | null>(null);
  const [confirmRestoreState, setConfirmRestoreState] = useState<RestoreConfirmationState>({
    isOpen: false,
    revision: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refreshes revisions list from storage service
   */
  const refreshRevisions = useCallback(() => {
    if (!websiteId) {
      setRevisions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const items = revisionHistoryService.getRevisions(websiteId);
      setRevisions(items);
    } catch (err: any) {
      setError(err?.message || "Failed to load revision history.");
    } finally {
      setIsLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    refreshRevisions();
  }, [refreshRevisions]);

  /**
   * Creates a new snapshot revision
   */
  const createSnapshot = useCallback(
    (elements: EditorElement[], pageSettings?: PageSettingsData, description: string = "Saved design change") => {
      if (!websiteId) return null;
      try {
        const newRev = revisionHistoryService.saveRevision(websiteId, elements, pageSettings, description);
        refreshRevisions();
        return newRev;
      } catch (err: any) {
        setError(err?.message || "Failed to save revision snapshot.");
        return null;
      }
    },
    [websiteId, refreshRevisions]
  );

  /**
   * Opens restore confirmation prompt after validating revision data
   */
  const promptRestore = useCallback((revision: RevisionItem) => {
    const validation = revisionHistoryService.validateRevision(revision, websiteId);
    if (!validation.valid) {
      setError(validation.reason || "Invalid revision data.");
      return;
    }
    setError(null);
    setConfirmRestoreState({
      isOpen: true,
      revision,
    });
  }, [websiteId]);

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
   * Confirms and executes safe restoration with deep-cloned immutable objects
   */
  const confirmRestore = useCallback(
    (onRestoreCallback: (elements: EditorElement[], pageSettings?: PageSettingsData) => void) => {
      const revToRestore = confirmRestoreState.revision;
      if (!revToRestore) {
        setError("No revision selected for restoration.");
        return;
      }

      // Fix 3 — Validate revision data before restore
      const validation = revisionHistoryService.validateRevision(revToRestore, websiteId);
      if (!validation.valid) {
        setError(validation.reason || "Selected revision data is corrupted or invalid.");
        setConfirmRestoreState({ isOpen: false, revision: null });
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fix 4 — Deep clone elements & pageSettings to avoid mutable references
        const clonedElements: EditorElement[] = JSON.parse(JSON.stringify(revToRestore.elements));
        const clonedPageSettings: PageSettingsData | undefined = revToRestore.pageSettings
          ? JSON.parse(JSON.stringify(revToRestore.pageSettings))
          : undefined;

        // Execute safety restore callback to editor
        onRestoreCallback(clonedElements, clonedPageSettings);
        
        // Close modal & update selected revision
        setConfirmRestoreState({ isOpen: false, revision: null });
        setSelectedRevision(revToRestore);
      } catch (err: any) {
        console.error("Restoration failed:", err);
        setError(err?.message || "Failed to restore revision state safely.");
      } finally {
        setIsLoading(false);
      }
    },
    [confirmRestoreState.revision, websiteId]
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
    createSnapshot,
    setSelectedRevision,
    promptRestore,
    cancelRestore,
    confirmRestore,
    deleteRevision,
  };
}
