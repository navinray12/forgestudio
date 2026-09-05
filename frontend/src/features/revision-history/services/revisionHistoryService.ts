import type { RevisionItem, PageSettingsData } from "../types/revisionHistory.types";
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";

const STORAGE_PREFIX = "forgestudio_revisions_";
export const MAX_REVISIONS = 30;

/**
 * Counts total elements in an element tree recursively.
 */
function countElementsRecursively(elements: EditorElement[]): number {
  if (!Array.isArray(elements)) return 0;
  let count = elements.length;
  for (const el of elements) {
    if (el && Array.isArray((el as any).children)) {
      count += countElementsRecursively((el as any).children);
    }
  }
  return count;
}

/**
 * Service managing client-side persistent storage and lifecycle for website revisions.
 */
export const revisionHistoryService = {
  /**
   * Retrieves all valid saved revisions for a website, sorted NEWEST -> OLDEST by timestamp.
   */
  getRevisions(websiteId: string): RevisionItem[] {
    if (!websiteId) return [];
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${websiteId}`);
      if (!raw) return [];
      
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      // Filter and sanitize invalid/malformed entries safely
      const validRevisions: RevisionItem[] = parsed.filter((item): item is RevisionItem => {
        return (
          item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.websiteId === "string" &&
          typeof item.timestamp === "number" &&
          !isNaN(item.timestamp) &&
          Array.isArray(item.elements)
        );
      });

      // Always sort NEWEST -> OLDEST by timestamp
      return validRevisions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Failed to parse revision history from storage:", error);
      return [];
    }
  },

  /**
   * Validates if a revision object is completely valid for restoration.
   */
  validateRevision(revision: any, currentWebsiteId?: string): { valid: boolean; reason?: string } {
    if (!revision || typeof revision !== "object") {
      return { valid: false, reason: "Revision data is missing or invalid." };
    }
    if (typeof revision.id !== "string" || !revision.id) {
      return { valid: false, reason: "Revision is missing a valid identifier." };
    }
    if (currentWebsiteId && revision.websiteId !== currentWebsiteId) {
      return { valid: false, reason: "Revision does not belong to the active website." };
    }
    if (!Array.isArray(revision.elements)) {
      return { valid: false, reason: "Revision contains invalid element tree structure." };
    }
    if (typeof revision.timestamp !== "number" || isNaN(revision.timestamp)) {
      return { valid: false, reason: "Revision timestamp is invalid." };
    }
    return { valid: true };
  },

  /**
   * Creates and saves a new snapshot revision for a website.
   * Prevents creating duplicate identical snapshots.
   */
  saveRevision(
    websiteId: string,
    elements: EditorElement[],
    pageSettings?: PageSettingsData,
    description: string = "Saved design change"
  ): RevisionItem {
    if (!websiteId) {
      throw new Error("Cannot save revision without a valid website ID.");
    }
    if (!Array.isArray(elements)) {
      throw new Error("Invalid elements structure provided for revision.");
    }

    const existing = this.getRevisions(websiteId);

    // Deep clone elements & settings for accurate serialization comparison
    const elementsClone: EditorElement[] = JSON.parse(JSON.stringify(elements || []));
    const settingsClone: PageSettingsData | undefined = pageSettings
      ? JSON.parse(JSON.stringify(pageSettings))
      : undefined;

    // Fix 9 — Duplicate snapshot protection: Avoid creating duplicate identical snapshot
    if (existing.length > 0) {
      const latest = existing[0];
      const elementsMatch = JSON.stringify(latest.elements) === JSON.stringify(elementsClone);
      const settingsMatch = JSON.stringify(latest.pageSettings || {}) === JSON.stringify(settingsClone || {});
      if (elementsMatch && settingsMatch) {
        return latest;
      }
    }

    const newRevision: RevisionItem = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      websiteId,
      timestamp: Date.now(),
      description,
      elements: elementsClone,
      pageSettings: settingsClone,
      elementCount: countElementsRecursively(elementsClone),
      version: 1,
    };

    // Prepend new revision, limit to MAX_REVISIONS (30)
    const updated = [newRevision, ...existing].slice(0, MAX_REVISIONS);

    try {
      localStorage.setItem(`${STORAGE_PREFIX}${websiteId}`, JSON.stringify(updated));
    } catch (error: any) {
      console.error("Failed to write revision to storage:", error);
      throw new Error(
        error?.name === "QuotaExceededError"
          ? "Storage limit exceeded. Unable to save revision snapshot."
          : "Failed to persist revision snapshot to local storage."
      );
    }

    return newRevision;
  },

  /**
   * Deletes a specific revision by ID.
   */
  deleteRevision(websiteId: string, revisionId: string): RevisionItem[] {
    if (!websiteId || !revisionId) return [];
    const existing = this.getRevisions(websiteId);
    const updated = existing.filter((rev) => rev.id !== revisionId);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${websiteId}`, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to update storage after deleting revision:", error);
    }
    return updated;
  },

  /**
   * Clears all saved revisions for a website.
   */
  clearRevisions(websiteId: string): void {
    if (!websiteId) return;
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${websiteId}`);
    } catch (error) {
      console.error("Failed to clear revisions from storage:", error);
    }
  },
};
