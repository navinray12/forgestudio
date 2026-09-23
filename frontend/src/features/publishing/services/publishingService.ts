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
};

