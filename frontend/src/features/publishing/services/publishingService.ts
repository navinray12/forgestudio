import type { DeploymentRecord, DeploymentStatus } from "../../../pages/editor/types";

export interface PublishApiResponse {
  success: boolean;
  deploymentId: string;
  status: DeploymentStatus;
  version: number;
  environment: string;
  destinationType: string;
  publishedAt: string;
  liveUrl: string;
  sourceRevisionId?: string;
  warnings?: Array<{ field: string; message: string; severity: "ERROR" | "WARNING" }>;
}

export interface ValidationApiResponse {
  success: boolean;
  validation: {
    valid: boolean;
    errors: Array<{ field: string; message: string; severity: "ERROR" | "WARNING" }>;
    warnings: Array<{ field: string; message: string; severity: "ERROR" | "WARNING" }>;
  };
}

const getBaseUrl = (override?: string) => override || (import.meta.env.VITE_API_URL || "");

export const publishingService = {
  /**
   * Run pre-publish validation on current draft
   */
  async validateWebsite(websiteId: string, editorData?: any, apiUrl?: string): Promise<ValidationApiResponse> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/validate-publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ editorData }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to validate website before publishing");
    }
    return data;
  },

  /**
   * Trigger production publish pipeline
   */
  async publishWebsite(
    websiteId: string,
    options: {
      editorData?: any;
      environment?: "PRODUCTION" | "STAGING" | "DEVELOPMENT";
      destinationType?: "INTERNAL" | "WORDPRESS" | "STATIC";
      metadata?: Record<string, any>;
    } = {},
    apiUrl?: string
  ): Promise<PublishApiResponse> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(options),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to execute website publishing");
    }
    return data;
  },

  /**
   * Fetch deployment history
   */
  async getDeployments(websiteId: string, apiUrl?: string): Promise<DeploymentRecord[]> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/deployments`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch deployment history");
    }
    return data.deployments || [];
  },

  /**
   * Rollback to a previous successful deployment
   */
  async rollbackDeployment(websiteId: string, deploymentId: string, apiUrl?: string): Promise<PublishApiResponse> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/deployments/${deploymentId}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to initiate deployment rollback");
    }
    return data;
  },

  /**
   * Connect to a WordPress destination site
   */
  async connectWordPress(
    websiteId: string,
    siteUrl: string,
    apiKey: string,
    siteName?: string,
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ siteUrl, apiKey, siteName }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to connect to WordPress");
    }
    return data;
  },

  /**
   * Fetch WordPress connection status
   */
  async getWordPressStatus(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to get WordPress status");
    }
    return data;
  },

  /**
   * Verify WordPress connection health
   */
  async verifyWordPress(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to verify WordPress connection");
    }
    return data;
  },

  /**
   * Safely disconnect WordPress integration
   */
  async disconnectWordPress(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to disconnect WordPress");
    }
    return data;
  },

  /**
   * Revoke an active WordPress connection
   */
  async revokeWordPressConnection(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to revoke WordPress connection");
    }
    return data;
  },

  /**
   * Download the official ForgeStudio WordPress Connector plugin ZIP archive
   */
  async downloadWordPressPlugin(websiteId: string, apiUrl?: string): Promise<void> {
    const base = getBaseUrl(apiUrl);
    const downloadUrl = `${base}/api/websites/${websiteId}/wordpress/download-plugin`;
    const res = await fetch(downloadUrl, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || data?.message || "Failed to download WordPress plugin archive");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forgestudio-connector.zip";
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Fetch WordPress Site Information
   */
  async getWordPressSiteInfo(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/site-info`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to retrieve site information");
    }
    return data;
  },

  /**
   * Fetch WordPress Site Health & Diagnostics
   */
  async getWordPressSiteHealth(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/site-health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to retrieve site health diagnostics");
    }
    return data;
  },

  /**
   * List WordPress Pages
   */
  async listWordPressPages(websiteId: string, query?: { search?: string; status?: string; parent?: number; page?: number; perPage?: number }, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search);
    if (query?.status) params.append("status", query.status);
    if (query?.parent !== undefined) params.append("parent", query.parent.toString());
    if (query?.page) params.append("page", query.page.toString());
    if (query?.perPage) params.append("perPage", query.perPage.toString());

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages${queryString}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to list WordPress pages");
    }
    return data;
  },

  /**
   * Get Single WordPress Page
   */
  async getWordPressPage(websiteId: string, pageId: number, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || `Failed to fetch WordPress Page ${pageId}`);
    }
    return data;
  },

  /**
   * Create WordPress Page
   */
  async createWordPressPage(websiteId: string, pageData: { title: string; slug?: string; content?: string; status?: string; parent?: number; menuOrder?: number; template?: string; excerpt?: string; forgePageId?: string }, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(pageData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to create WordPress page");
    }
    return data;
  },

  /**
   * Update WordPress Page
   */
  async updateWordPressPage(websiteId: string, pageId: number, pageData: { title?: string; slug?: string; content?: string; status?: string; parent?: number; menuOrder?: number; template?: string; excerpt?: string; forgePageId?: string }, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(pageData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || `Failed to update WordPress Page ${pageId}`);
    }
    return data;
  },

  /**
   * Delete WordPress Page
   */
  async deleteWordPressPage(websiteId: string, pageId: number, force: boolean = false, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}?force=${force ? "true" : "false"}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || `Failed to delete WordPress Page ${pageId}`);
    }
    return data;
  },

  /**
   * Duplicate WordPress Page (F-491)
   */
  async duplicateWordPressPage(
    websiteId: string,
    pageId: number,
    options?: { customTitle?: string; customSlug?: string },
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(options || {}),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || `Failed to duplicate WordPress Page ${pageId}`);
    }
    return data;
  },

  /**
   * Reorder WordPress Page (F-492)
   */
  async reorderWordPressPage(
    websiteId: string,
    pageId: number,
    options?: { targetPageId?: number; position?: "BEFORE" | "AFTER" | "FIRST" | "LAST"; parentId?: number },
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(options || {}),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || `Failed to reorder WordPress Page ${pageId}`);
    }
    return data;
  },

  /**
   * Upload Media to WordPress Media Library (F-493)
   */
  async uploadWordPressMedia(
    websiteId: string,
    file: File,
    options?: { title?: string; altText?: string; caption?: string; description?: string },
    apiUrl?: string,
    onProgress?: (percent: number) => void
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const commaIdx = result.indexOf(",");
        resolve(commaIdx !== -1 ? result.substring(commaIdx + 1) : result);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    if (onProgress) onProgress(30);

    const payload = {
      filename: file.name,
      mimeType: file.type || "image/png",
      base64Data,
      title: options?.title || file.name.substring(0, file.name.lastIndexOf(".")) || file.name,
      altText: options?.altText || "",
      caption: options?.caption || "",
      description: options?.description || "",
    };

    if (onProgress) onProgress(60);

    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (onProgress) onProgress(90);

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to upload media to WordPress Media Library");
    }

    if (onProgress) onProgress(100);
    return data;
  },

  /**
   * List WordPress Media (F-494)
   */
  async listWordPressMedia(
    websiteId: string,
    query?: {
      search?: string;
      mimeType?: string;
      mediaType?: "image" | "document" | "all";
      order?: "ASC" | "DESC";
      orderby?: "date" | "modified" | "title" | "filename";
      page?: number;
      perPage?: number;
    },
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search);
    if (query?.mimeType) params.append("mimeType", query.mimeType);
    if (query?.mediaType) params.append("mediaType", query.mediaType);
    if (query?.order) params.append("order", query.order);
    if (query?.orderby) params.append("orderby", query.orderby);
    if (query?.page) params.append("page", query.page.toString());
    if (query?.perPage) params.append("perPage", query.perPage.toString());

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/media${queryString}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to list WordPress media");
    }
    return data;
  },

  /**
   * Get WordPress Media Details (F-494)
   */
  async getWordPressMedia(websiteId: string, mediaId: number, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/media/${mediaId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || `Failed to fetch WordPress media ID ${mediaId}`);
    }
    return data;
  },

  /**
   * Update WordPress Media Metadata (F-494)
   */
  async updateWordPressMedia(
    websiteId: string,
    mediaId: number,
    metadata: { title?: string; altText?: string; caption?: string; description?: string },
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/media/${mediaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(metadata),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || `Failed to update WordPress media ID ${mediaId}`);
    }
    return data;
  },

  /**
   * Delete WordPress Media (F-494)
   */
  async deleteWordPressMedia(
    websiteId: string,
    mediaId: number,
    options?: { force?: boolean },
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const forceParam = options?.force ? "?force=true" : "";
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/media/${mediaId}${forceParam}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || `Failed to delete WordPress media ID ${mediaId}`);
    }
    return data;
  },

  /**
   * Publish page to WordPress destination (F-495)
   */
  async publishWordPressPage(
    websiteId: string,
    options?: {
      pageId?: string;
      wordpressPageId?: number;
      title?: string;
      slug?: string;
      status?: "draft" | "publish" | "private";
      content?: string;
      excerpt?: string;
      template?: string;
    },
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/publish-page`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(options || {}),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to publish page to WordPress");
    }
    return data;
  },

  /**
   * Get WordPress publish status (F-496)
   */
  async getWordPressPublishStatus(
    websiteId: string,
    pageId: string = "default",
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}/publish-status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to get WordPress publish status");
    }
    return data.data || data;
  },

  /**
   * Get WordPress rollback target snapshots (F-497)
   */
  async getWordPressRollbackTargets(
    websiteId: string,
    pageId: string = "default",
    apiUrl?: string
  ): Promise<any[]> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}/rollback-targets`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to fetch WordPress rollback targets");
    }
    return data.data || data || [];
  },

  /**
   * Rollback WordPress page to a historical publish snapshot (F-497)
   */
  async rollbackWordPressPage(
    websiteId: string,
    pageId: string = "default",
    snapshotId: string,
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ snapshotId }),
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data?.error?.message || data?.message || "Failed to rollback WordPress page");
      (err as any).code = data?.error?.code || data?.code;
      throw err;
    }
    return data;
  },
};


