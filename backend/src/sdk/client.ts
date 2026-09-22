/**
 * @file Client: backend SDK integration support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
export interface ForgeStudioClientOptions {
  baseUrl?: string;
  apiKey?: string;
  sessionToken?: string;
  fetch?: typeof fetch;
}

export class ForgeStudioApiError extends Error {
  public code: string;
  public status: number;
  public details?: any;

  /**
   * Constructor.
   * @param message Message supplied to this operation (type: string).
   * @param code Code supplied to this operation (type: string). Defaults to "UNKNOWN_ERROR".
   * @param status Status supplied to this operation (type: number). Defaults to 500.
   * @param details Details supplied to this operation (type: any). Optional; callers may omit it.
   */
  constructor(message: string, code: string = "UNKNOWN_ERROR", status: number = 500, details?: any) {
    super(message);
    this.name = "ForgeStudioApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface WebsiteListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebsitePage {
  id: string;
  name: string;
  slug: string;
  elements: any[];
  seo?: Record<string, any>;
  status?: string;
}

export interface PublishOptions {
  environment?: "PRODUCTION" | "STAGING" | "DEVELOPMENT";
  destinationType?: "INTERNAL" | "WORDPRESS" | "STATIC" | "SFTP";
  destinationRef?: string;
}

export interface DeploymentRecord {
  id: string;
  websiteId: string;
  version: number;
  status: string;
  environment: string;
  destinationType: string;
  destinationRef?: string;
  startedAt: string;
  completedAt?: string;
  error?: any;
}

export class ForgeStudioClient {
  private baseUrl: string;
  private apiKey?: string;
  private sessionToken?: string;
  private fetchFn: typeof fetch;

  /**
   * Constructor.
   * @param options Options supplied to this operation (type: ForgeStudioClientOptions). Defaults to {}.
   */
  constructor(options: ForgeStudioClientOptions = {}) {
    this.baseUrl = (options.baseUrl || "http://localhost:5000/api/v1").replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.sessionToken = options.sessionToken;
    this.fetchFn = options.fetch || globalThis.fetch;
  }

  /**
   * Request.
   * @param path Path supplied to this operation (type: string).
   * @param options Options supplied to this operation (type: { method?: string; body?: any; query?: Record<string, any>; headers?: Record<string, string>; }). Defaults to {}.
   */
  private async request<T = any>(
    path: string,
    options: {
      method?: string;
      body?: any;
      query?: Record<string, any>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    let url = `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

    if (options.query) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined && v !== null) {
          searchParams.append(k, String(v));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes("?") ? "&" : "?") + qs;
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    } else if (this.sessionToken) {
      headers["Authorization"] = `Bearer ${this.sessionToken}`;
    }

    const res = await this.fetchFn(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new ForgeStudioApiError(
        `Failed to parse server response (HTTP ${res.status})`,
        "INVALID_RESPONSE",
        res.status
      );
    }

    if (!res.ok || json.success === false) {
      const err = json.error || {};
      throw new ForgeStudioApiError(
        err.message || json.message || `Request failed with status ${res.status}`,
        err.code || "REQUEST_FAILED",
        res.status,
        err.details
      );
    }

    return json.data !== undefined ? json.data : json;
  }

  // 1. List websites
  /**
   * List Websites.
   * @param query Query supplied to this operation (type: { page?: number; limit?: number; status?: string; search?: string; }). Optional; callers may omit it.
   */
  async listWebsites(query?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<WebsiteListItem[]> {
    return this.request<WebsiteListItem[]>("/websites", { query });
  }

  // 2. Create website
  /**
   * Create Website.
   * @param data Data supplied to this operation (type: { name: string; slug?: string; editorData?: any; templateId?: string; }).
   */
  async createWebsite(data: {
    name: string;
    slug?: string;
    editorData?: any;
    templateId?: string;
  }): Promise<any> {
    return this.request("/websites", {
      method: "POST",
      body: data,
    });
  }

  // 3. Get website by ID
  /**
   * Get Website.
   * @param id Id supplied to this operation (type: string).
   */
  async getWebsite(id: string): Promise<any> {
    return this.request(`/websites/${id}`);
  }

  // 4. Update website
  /**
   * Update Website.
   * @param id Id supplied to this operation (type: string).
   * @param data Data supplied to this operation (type: { name?: string; slug?: string; editorData?: any; status?: string; }).
   */
  async updateWebsite(
    id: string,
    data: {
      name?: string;
      slug?: string;
      editorData?: any;
      status?: string;
    }
  ): Promise<any> {
    return this.request(`/websites/${id}`, {
      method: "PUT",
      body: data,
    });
  }

  // 5. Get pages
  /**
   * Get Pages.
   * @param websiteId Identifier of the website whose data is being read or changed.
   */
  async getPages(websiteId: string): Promise<WebsitePage[]> {
    return this.request<WebsitePage[]>(`/websites/${websiteId}/pages`);
  }

  // 6. Update pages
  /**
   * Update Pages.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param pages Pages supplied to this operation (type: WebsitePage[]).
   */
  async updatePages(websiteId: string, pages: WebsitePage[]): Promise<{ pages: WebsitePage[] }> {
    return this.request<{ pages: WebsitePage[] }>(`/websites/${websiteId}/pages`, {
      method: "PUT",
      body: { pages },
    });
  }

  // 7. Validate publish (calls internal endpoint via API v1 website route)
  /**
   * Validate Publish.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param candidateData Candidate Data supplied to this operation (type: any). Optional; callers may omit it.
   */
  async validatePublish(websiteId: string, candidateData?: any): Promise<{ valid: boolean; errors: any[]; warnings: any[] }> {
    return this.request(`/websites/${websiteId}/validate-publish`, {
      method: "POST",
      body: { candidateData },
    });
  }

  // 8. Publish website
  /**
   * Publish.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param options Options supplied to this operation (type: PublishOptions). Optional; callers may omit it.
   */
  async publish(websiteId: string, options?: PublishOptions): Promise<any> {
    return this.request(`/websites/${websiteId}/publish`, {
      method: "POST",
      body: options || {},
    });
  }

  // 9. List deployments
  /**
   * List Deployments.
   * @param websiteId Identifier of the website whose data is being read or changed.
   */
  async listDeployments(websiteId: string): Promise<DeploymentRecord[]> {
    return this.request<DeploymentRecord[]>(`/websites/${websiteId}/deployments`);
  }

  // 10. Get single deployment
  /**
   * Get Deployment.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param deploymentId Deployment Id supplied to this operation (type: string).
   */
  async getDeployment(websiteId: string, deploymentId: string): Promise<DeploymentRecord> {
    return this.request<DeploymentRecord>(`/websites/${websiteId}/deployments/${deploymentId}`);
  }

  // 11. Rollback deployment
  /**
   * Rollback.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param deploymentId Deployment Id supplied to this operation (type: string).
   */
  async rollback(websiteId: string, deploymentId: string): Promise<any> {
    return this.request(`/websites/${websiteId}/deployments/${deploymentId}/rollback`, {
      method: "POST",
    });
  }

  // 12. Create revision
  /**
   * Create Revision.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param data Data supplied to this operation (type: { data: any; description?: string; revisionType?: string }).
   */
  async createRevision(
    websiteId: string,
    data: { data: any; description?: string; revisionType?: string }
  ): Promise<any> {
    return this.request(`/websites/${websiteId}/revisions`, {
      method: "POST",
      body: data,
    });
  }
}
