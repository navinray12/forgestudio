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
   * Fetch SFTP destination configuration
   */
  async getSftpConfig(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/sftp/config/${websiteId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to get SFTP config");
    }
    return data;
  },

  /**
   * Save SFTP destination credentials
   */
  async saveSftpConfig(config: any, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/sftp/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to save SFTP config");
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
   * Import WordPress Page into ForgeStudio Editor Session
   */
  async importWordPressPage(websiteId: string, pageId: number, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || `Failed to import WordPress Page ${pageId}`);
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
   * Verify SFTP destination connectivity
   */
  async verifySftpConfig(config: any, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/sftp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to verify SFTP connection");
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
   * Publish a ForgeStudio page to WordPress synchronously (F-495 & F-499)
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
      format?: "html" | "gutenberg";
      mode?: "html" | "gutenberg";
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
   * Preview sanitized HTML & CSS payload without publishing mutation (F-499)
   */
  async previewWordPressHtml(
    websiteId: string,
    pageId: string = "default",
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}/preview-html`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to generate HTML preview");
    }
    return data.data || data;
  },

  /**
   * Preview native Gutenberg blocks payload without publishing mutation (F-500)
   */
  async previewWordPressGutenberg(
    websiteId: string,
    pageId: string = "default",
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}/preview-gutenberg`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to generate Gutenberg preview");
    }
    return data.data || data;
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

  /**
   * Create an asynchronous WordPress publishing job (F-498 & F-499)
   */
  async createWordPressPublishJob(
    websiteId: string,
    pageId: string = "default",
    options: { targetWpPostId?: number; slug?: string; status?: string; title?: string; format?: "html" | "gutenberg" } = {},
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/pages/${pageId}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(options),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to create WordPress publishing job");
    }
    return data;
  },

  /**
   * Get detailed status and step progress of a WordPress publishing job (F-498)
   */
  async getWordPressPublishJobStatus(
    websiteId: string,
    jobId: string,
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/jobs/${jobId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to fetch job status");
    }
    return data.job || data;
  },

  /**
   * List WordPress publishing jobs (F-498)
   */
  async listWordPressPublishJobs(
    websiteId: string,
    pageId?: string,
    apiUrl?: string
  ): Promise<any[]> {
    const base = getBaseUrl(apiUrl);
    const query = pageId ? `?pageId=${encodeURIComponent(pageId)}` : "";
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/jobs${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to list publishing jobs");
    }
    return data.jobs || [];
  },

  /**
   * Cancel an active or queued WordPress publishing job (F-498)
   */
  async cancelWordPressPublishJob(
    websiteId: string,
    jobId: string,
    reason?: string,
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/jobs/${jobId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to cancel publishing job");
    }
    return data;
  },

  /**
   * Retry a failed or cancelled WordPress publishing job (F-498)
   */
  async retryWordPressPublishJob(
    websiteId: string,
    jobId: string,
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/jobs/${jobId}/retry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Failed to retry publishing job");
    }
    return data;
  },

  /**
   * Sync compiled files to SFTP server
   */
  async syncSftp(websiteId: string, options: any = {}, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/sftp/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ websiteId, ...options }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to sync files via SFTP");
    }
    return data;
  },

  /**
   * Get WordPress Forms capabilities for site
   */
  async getWordPressFormsCapabilities(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/forms/capabilities`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch WordPress forms capabilities");
    }
    return data;
  },

  /**
   * List WordPress forms for site
   */
  async listWordPressForms(websiteId: string, apiUrl?: string): Promise<any[]> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/forms`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to list WordPress forms");
    }
    return data;
  },

  /**
   * Synchronize form definition to WordPress
   */
  async syncWordPressForm(websiteId: string, formId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/forms/${formId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to sync form to WordPress");
    }
    return data;
  },

  /**
   * Submit form payload
   */
  async submitWordPressForm(websiteId: string, formId: string, payload: any, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/forms/${formId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to submit form");
    }
    return data;
  },

  /**
   * F-502: Get WordPress SEO capabilities
   */
  async getWordPressSeoCapabilities(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/seo/capabilities`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch WordPress SEO capabilities");
    }
    return data;
  },

  /**
   * F-502: Get page SEO metadata
   */
  async getWordPressPageSeo(websiteId: string, pageId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/seo/pages/${pageId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch WordPress page SEO");
    }
    return data;
  },

  /**
   * F-502: Update page SEO metadata
   */
  async updateWordPressPageSeo(websiteId: string, pageId: string, metadata: any, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/seo/pages/${pageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(metadata),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to update WordPress page SEO");
    }
    return data;
  },

  /**
   * F-502: Synchronize page SEO metadata to WordPress
   */
  async syncWordPressPageSeo(websiteId: string, pageId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/seo/pages/${pageId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to sync page SEO to WordPress");
    }
    return data;
  },

  /**
   * F-503: Get WordPress Analytics capabilities
   */
  async getWordPressAnalyticsCapabilities(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/analytics/capabilities`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch WordPress Analytics capabilities");
    }
    return data;
  },

  /**
   * F-503: Get Analytics Configuration
   */
  async getWordPressAnalyticsConfig(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/analytics/config`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch WordPress Analytics configuration");
    }
    return data;
  },

  /**
   * F-503: Update Analytics Configuration
   */
  async updateWordPressAnalyticsConfig(websiteId: string, config: any, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/analytics/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to update WordPress Analytics configuration");
    }
    return data;
  },

  /**
   * F-503: Get Analytics Data
   */
  async getWordPressAnalyticsData(websiteId: string, params?: any, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const query = new URLSearchParams(params || {}).toString();
    const url = `${base}/api/websites/${websiteId}/wordpress/analytics${query ? `?${query}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch WordPress Analytics data");
    }
    return data;
  },

  /**
   * F-503: Synchronize Analytics
   */
  async syncWordPressAnalytics(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/analytics/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to sync WordPress Analytics");
    }
    return data;
  },

  /**
   * F-504: Get Menu Capabilities
   */
  async getWordPressMenuCapabilities(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/menus/capabilities`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch WordPress Menu capabilities");
    return data;
  },

  /**
   * F-504: List Menus
   */
  async listWordPressMenus(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/menus`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to list WordPress menus");
    return data;
  },

  /**
   * F-504: Create Menu
   */
  async createWordPressMenu(websiteId: string, menuData: { name: string; slug?: string; description?: string }, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/menus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menuData),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to create WordPress menu");
    return data;
  },

  /**
   * F-504: Delete Menu
   */
  async deleteWordPressMenu(websiteId: string, menuId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/menus/${menuId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to delete WordPress menu");
    return data;
  },

  /**
   * F-504: List Menu Items
   */
  async listWordPressMenuItems(websiteId: string, menuId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/menus/${menuId}/items`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to list menu items");
    return data;
  },

  /**
   * F-504: Create Menu Item
   */
  async createWordPressMenuItem(websiteId: string, menuId: string, itemData: any, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/menus/${menuId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemData),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to create menu item");
    return data;
  },

  /**
   * F-504: Reorder Menu Items
   */
  async reorderWordPressMenuItems(websiteId: string, menuId: string, reorderPayload: any[], apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/menus/${menuId}/items/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: reorderPayload }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to reorder menu items");
    return data;
  },

  /**
   * F-504: Get Theme Menu Locations
   */
  async getWordPressMenuLocations(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/menus/locations`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch menu locations");
    return data;
  },

  /**
   * F-504: Assign Menu Location
   */
  async assignWordPressMenuLocation(websiteId: string, menuId: string, location: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/menus/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuId, location }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to assign menu location");
    return data;
  },

  /**
   * F-505: Get Webhook Capabilities
   */
  async getWordPressWebhookCapabilities(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/webhooks/capabilities`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch webhook capabilities");
    return data;
  },

  /**
   * F-505: List Webhooks
   */
  async listWordPressWebhooks(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/webhooks`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to list webhooks");
    return data;
  },

  /**
   * F-505: Create Webhook
   */
  async createWordPressWebhook(websiteId: string, webhookData: any, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookData),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to create webhook");
    return data;
  },

  /**
   * F-505: Delete Webhook
   */
  async deleteWordPressWebhook(websiteId: string, webhookId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/webhooks/${webhookId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to delete webhook");
    return data;
  },

  /**
   * F-505: Enable Webhook
   */
  async enableWordPressWebhook(websiteId: string, webhookId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/webhooks/${webhookId}/enable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to enable webhook");
    return data;
  },

  /**
   * F-505: Disable Webhook
   */
  async disableWordPressWebhook(websiteId: string, webhookId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/webhooks/${webhookId}/disable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to disable webhook");
    return data;
  },

  /**
   * F-505: List Webhook Deliveries
   */
  async listWordPressWebhookDeliveries(websiteId: string, webhookId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/webhooks/${webhookId}/deliveries`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch webhook deliveries");
    return data;
  },

  /**
   * F-506: Get Plugin Capabilities
   */
  async getWordPressPluginCapabilities(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/plugins/capabilities`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch plugin capabilities");
    return data;
  },

  /**
   * F-506: List Plugins
   */
  async listWordPressPlugins(websiteId: string, filter: any = {}, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const params = new URLSearchParams(filter).toString();
    const query = params ? `?${params}` : "";
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/plugins${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to list plugins");
    return data;
  },

  /**
   * F-506: Activate Plugin
   */
  async activateWordPressPlugin(websiteId: string, pluginId: string, isNetwork = false, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/plugins/${encodeURIComponent(pluginId)}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isNetwork }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to activate plugin");
    return data;
  },

  /**
   * F-506: Deactivate Plugin
   */
  async deactivateWordPressPlugin(websiteId: string, pluginId: string, isNetwork = false, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/plugins/${encodeURIComponent(pluginId)}/deactivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isNetwork }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to deactivate plugin");
    return data;
  },

  /**
   * F-506: Update Plugin
   */
  async updateWordPressPlugin(websiteId: string, pluginId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/plugins/${encodeURIComponent(pluginId)}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to update plugin");
    return data;
  },

  /**
   * F-506: Delete Plugin
   */
  async deleteWordPressPlugin(websiteId: string, pluginId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/plugins/${encodeURIComponent(pluginId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to delete plugin");
    return data;
  },

  /**
   * F-507: Get Theme Capabilities
   */
  async getWordPressThemeCapabilities(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/themes/capabilities`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch theme capabilities");
    return data;
  },

  /**
   * F-507: List Themes
   */
  async listWordPressThemes(websiteId: string, filter: any = {}, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const params = new URLSearchParams(filter).toString();
    const query = params ? `?${params}` : "";
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/themes${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to list themes");
    return data;
  },

  /**
   * F-507: Get Active Theme
   */
  async getActiveWordPressTheme(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/themes/active`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch active theme");
    return data;
  },

  /**
   * F-507: Activate Theme
   */
  async activateWordPressTheme(websiteId: string, themeId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/themes/${encodeURIComponent(themeId)}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to activate theme");
    return data;
  },

  /**
   * F-507: Update Theme
   */
  async updateWordPressTheme(websiteId: string, themeId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/themes/${encodeURIComponent(themeId)}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to update theme");
    return data;
  },

  /**
   * F-507: Delete Theme
   */
  async deleteWordPressTheme(websiteId: string, themeId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/themes/${encodeURIComponent(themeId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to delete theme");
    return data;
  },

  /**
   * F-508: Get Cache Capabilities
   */
  async getWordPressCacheCapabilities(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/cache/capabilities`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch cache capabilities");
    return data;
  },

  /**
   * F-508: Get Remote Cache Status
   */
  async getWordPressCacheStatus(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/cache/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch cache status");
    return data;
  },

  /**
   * F-508: Purge Cache
   */
  async purgeWordPressCache(websiteId: string, target: any = {}, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/cache/purge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to purge cache");
    return data;
  },

  /**
   * F-508: Clear All Cache
   */
  async clearWordPressCache(websiteId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/cache/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to clear cache");
    return data;
  },

  /**
   * F-508: Warm Cache
   */
  async warmWordPressCache(websiteId: string, urls: string[] = [], apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/wordpress/cache/warm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to warm cache");
    return data;
  },
  /**
   * F-115: Schedule code publishing for a future timestamp
   */
  async scheduleCodePublish(
    websiteId: string,
    payload: {
      scheduledTime: string;
      codeSnippet?: string;
      location?: "head" | "body" | "footer";
      environment?: string;
      targetPages?: string[];
    },
    apiUrl?: string
  ): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/scheduled-publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to schedule code publishing");
    return data;
  },

  /**
   * F-115: List scheduled code publishing jobs
   */
  async listScheduledCodePublishes(websiteId: string, apiUrl?: string): Promise<any[]> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/scheduled-publish`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to list scheduled code publishing jobs");
    return data.jobs || data || [];
  },

  /**
   * F-115: Cancel a scheduled code publishing job
   */
  async cancelScheduledCodePublish(websiteId: string, jobId: string, apiUrl?: string): Promise<any> {
    const base = getBaseUrl(apiUrl);
    const res = await fetch(`${base}/api/websites/${websiteId}/scheduled-publish/${jobId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to cancel scheduled publishing job");
    return data;
  }
};






