export interface WebsiteSummary {
  id: string;
  name?: string;
  [key: string]: any;
}

export function getWorkspaceScopeKey(workspaceId: string | null | undefined): string {
  if (!workspaceId || typeof workspaceId !== "string" || workspaceId.trim() === "") {
    return "__default__";
  }
  return workspaceId.trim();
}

export class WorkspaceWebsiteCache<T extends { id: string } = any> {
  private cache: Map<string, T[]> = new Map();

  get(scopeKey: string): T[] | undefined {
    const list = this.cache.get(scopeKey);
    return list ? [...list] : undefined;
  }

  set(scopeKey: string, websites: T[]): void {
    this.cache.set(scopeKey, [...websites]);
  }

  remove(scopeKey: string, websiteId: string): void {
    const existing = this.cache.get(scopeKey);
    if (existing) {
      this.cache.set(
        scopeKey,
        existing.filter((w) => w.id !== websiteId)
      );
    }
  }

  has(scopeKey: string): boolean {
    return this.cache.has(scopeKey);
  }

  clear(scopeKey?: string): void {
    if (scopeKey) {
      this.cache.delete(scopeKey);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Resolves the list of websites to display immediately when switching to a workspace.
   * If the workspace has cached data from a prior successful fetch, return it.
   * Otherwise return an empty array — never return another workspace's websites.
   */
  resolveForScope(scopeKey: string): {
    websites: T[];
    hasCachedData: boolean;
  } {
    const cached = this.get(scopeKey);
    if (cached !== undefined) {
      return { websites: cached, hasCachedData: true };
    }
    return { websites: [], hasCachedData: false };
  }

  /**
   * Resolves websites and error state following a fetch attempt.
   * - On success: updates cache and returns new websites with error: null.
   * - On failure: if this scope already had cached websites, preserves them with error banner;
   *   otherwise returns empty array with error state.
   * Under NO circumstance are another workspace's websites returned.
   */
  resolveFetchResult(
    scopeKey: string,
    success: boolean,
    data?: T[],
    errorMessage?: string
  ): {
    websites: T[];
    error: string | null;
    isPreservingScopeCache: boolean;
  } {
    if (success && Array.isArray(data)) {
      this.set(scopeKey, data);
      return {
        websites: data,
        error: null,
        isPreservingScopeCache: false,
      };
    }

    const cached = this.get(scopeKey);
    if (cached !== undefined && cached.length > 0) {
      return {
        websites: cached,
        error: errorMessage || "Failed to load websites.",
        isPreservingScopeCache: true,
      };
    }

    return {
      websites: [],
      error: errorMessage || "Failed to load websites.",
      isPreservingScopeCache: false,
    };
  }

  /**
   * Stale request validator: verifies that an incoming response belongs to the
   * current active fetch ID and active workspace scope.
   */
  static isRequestFresh(
    responseFetchId: number,
    activeFetchId: number,
    responseScopeKey: string,
    activeScopeKey: string
  ): boolean {
    return responseFetchId === activeFetchId && responseScopeKey === activeScopeKey;
  }
}
