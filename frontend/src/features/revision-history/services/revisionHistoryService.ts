/**
 * @file Revision history feature: revision History Service. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { RevisionItem, PageSettingsData } from "../types/revisionHistory.types";
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";

const STORAGE_PREFIX = "forgestudio_revisions_";
export const MAX_REVISIONS = 30;

/**
 * Counts total elements in an element tree recursively.

 * @param elements Elements supplied to this operation (type: EditorElement[]).
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

   * @param websiteId Identifier of the website whose data is being read or changed.
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

   * @param revision Revision supplied to this operation (type: any).
   * @param currentWebsiteId Current Website Id supplied to this operation (type: string). Optional; callers may omit it.
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

   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param elements Elements supplied to this operation (type: EditorElement[]).
   * @param pageSettings Page Settings supplied to this operation (type: PageSettingsData). Optional; callers may omit it.
   * @param description Description supplied to this operation (type: string). Defaults to "Saved design change".
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

   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param revisionId Revision Id supplied to this operation (type: string).
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

   * @param websiteId Identifier of the website whose data is being read or changed.
   */
  clearRevisions(websiteId: string): void {
    if (!websiteId) return;
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${websiteId}`);
    } catch (error) {
      console.error("Failed to clear revisions from storage:", error);
    }
  },

  /**
   * Fetches authoritative revisions from backend PostgreSQL API.
   * Caches to localStorage for offline fallback.

   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param apiUrl Api Url supplied to this operation (type: string). Defaults to "".
   */
  async fetchServerRevisions(websiteId: string, apiUrl: string = ""): Promise<RevisionItem[]> {
    if (!websiteId) return [];

    try {
      const res = await fetch(`${apiUrl}/api/websites/${websiteId}/revisions`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: Failed to fetch revisions`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.revisions)) {
        const serverRevisions: RevisionItem[] = data.revisions.map((r: any) => ({
          id: r.id,
          websiteId: r.websiteId,
          version: r.version,
          revisionType: r.revisionType || "MANUAL",
          description: r.description || `Revision v${r.version}`,
          timestamp: r.timestamp || new Date(r.createdAt).getTime(),
          createdAt: r.createdAt,
          createdBy: r.createdBy,
          author: r.author || "Collaborator",
          elementCount: r.elementCount || 0,
          pageCount: r.pageCount || 1,
          elements: r.elements || [],
          pageSettings: r.pageSettings,
        }));

        // Cache server revisions to localStorage as resilient offline fallback
        try {
          localStorage.setItem(`${STORAGE_PREFIX}${websiteId}`, JSON.stringify(serverRevisions.slice(0, MAX_REVISIONS)));
        } catch (_) {}

        return serverRevisions;
      }
    } catch (netErr) {
      console.warn("Server revisions fetch failed, using local fallback:", netErr);
    }

    // Fallback to localStorage if server is offline/unreachable
    return this.getRevisions(websiteId);
  },

  /**
   * Fetches full revision detail and snapshot data from backend.

   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param revisionId Revision Id supplied to this operation (type: string).
   * @param apiUrl Api Url supplied to this operation (type: string). Defaults to "".
   */
  async fetchServerRevisionById(websiteId: string, revisionId: string, apiUrl: string = ""): Promise<any> {
    const res = await fetch(`${apiUrl}/api/websites/${websiteId}/revisions/${revisionId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch revision detail: HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.revision;
  },

  /**
   * Creates a new authoritative revision checkpoint on the server.

   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param payload Payload supplied to this operation (type: { description?: string; revisionType?: string; snapshot?: any; elements?: EditorElement[]; pageSettings?: PageSettingsData; pages?: any[]; siteParts?: any; globalSettings?: any; breakpoints?: any[]; popups?: any[]; pageCss?: string; homePageId?: string; }).
   * @param apiUrl Api Url supplied to this operation (type: string). Defaults to "".
   */
  async createServerRevision(
    websiteId: string,
    payload: {
      description?: string;
      revisionType?: string;
      snapshot?: any;
      elements?: EditorElement[];
      pageSettings?: PageSettingsData;
      pages?: any[];
      siteParts?: any;
      globalSettings?: any;
      breakpoints?: any[];
      popups?: any[];
      pageCss?: string;
      homePageId?: string;
    },
    apiUrl: string = ""
  ): Promise<RevisionItem> {
    const res = await fetch(`${apiUrl}/api/websites/${websiteId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create revision: HTTP ${res.status}`);
    }

    const data = await res.json();
    const rev = data.revision;

    // Also update local cache
    try {
      const existing = this.getRevisions(websiteId);
      const updated = [rev, ...existing.filter((e) => e.id !== rev.id)].slice(0, MAX_REVISIONS);
      localStorage.setItem(`${STORAGE_PREFIX}${websiteId}`, JSON.stringify(updated));
    } catch (_) {}

    return rev;
  },

  /**
   * Restores a revision snapshot to working draft on the server.
   * INVARIANT: Restore updates working draft ONLY. Does NOT publish.

   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param revisionId Revision Id supplied to this operation (type: string).
   * @param apiUrl Api Url supplied to this operation (type: string). Defaults to "".
   */
  async restoreServerRevision(websiteId: string, revisionId: string, apiUrl: string = ""): Promise<any> {
    const res = await fetch(`${apiUrl}/api/websites/${websiteId}/revisions/${revisionId}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to restore revision: HTTP ${res.status}`);
    }

    return await res.json();
  },
};

