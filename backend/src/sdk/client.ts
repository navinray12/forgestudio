export interface ForgeStudioClientOptions {
  baseUrl?: string;
  apiKey?: string;
  sessionToken?: string;
  timeout?: number; // Request timeout in milliseconds
  maxRetries?: number; // Max retries for safe idempotent (GET) requests on 429
  fetch?: typeof fetch;
}

export class ForgeStudioApiError extends Error {
  public code: string;
  public status: number;
  public details?: any;
  public retryAfter?: number;
  public requestId?: string;

  constructor(
    message: string,
    code: string = "UNKNOWN_ERROR",
    status: number = 500,
    details?: any,
    retryAfter?: number,
    requestId?: string
  ) {
    super(message);
    this.name = "ForgeStudioApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryAfter = retryAfter;
    this.requestId = requestId;
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
  metadata?: Record<string, any>;
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

export interface RequestOptions {
  method?: string;
  body?: any;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
  requestId?: string;
}

export class ForgeStudioClient {
  public baseUrl: string;
  private apiKey?: string;
  private sessionToken?: string;
  private timeout: number;
  private maxRetries: number;
  private fetchFn: typeof fetch;

  // Grouped namespaces
  public websites: {
    list: (query?: { page?: number; limit?: number; status?: string; search?: string }, options?: RequestOptions) => Promise<WebsiteListItem[]>;
    get: (id: string, options?: RequestOptions) => Promise<any>;
    create: (data: { name: string; slug?: string; editorData?: any; templateId?: string }, options?: RequestOptions) => Promise<any>;
    update: (id: string, data: { name?: string; slug?: string; editorData?: any; status?: string; expectedVersion?: number }, options?: RequestOptions) => Promise<any>;
    iterate: (query?: { limit?: number; status?: string; search?: string }) => AsyncGenerator<WebsiteListItem>;
  };

  public pages: {
    get: (websiteId: string, options?: RequestOptions) => Promise<WebsitePage[]>;
    update: (websiteId: string, pages: WebsitePage[], revision?: { expectedVersion?: number; lastKnownUpdatedAt?: string }, options?: RequestOptions) => Promise<{ pages: WebsitePage[] }>;
  };

  public publishing: {
    publish: (websiteId: string, options?: PublishOptions, reqOptions?: RequestOptions) => Promise<any>;
    validate: (websiteId: string, candidateData?: any, reqOptions?: RequestOptions) => Promise<{ valid: boolean; errors: any[]; warnings: any[] }>;
  };

  public deployments: {
    list: (websiteId: string, options?: RequestOptions) => Promise<DeploymentRecord[]>;
    get: (websiteId: string, deploymentId: string, options?: RequestOptions) => Promise<DeploymentRecord>;
    rollback: (websiteId: string, deploymentId: string, options?: RequestOptions) => Promise<any>;
  };

  constructor(options: ForgeStudioClientOptions = {}) {
    this.baseUrl = (options.baseUrl || "http://localhost:5000/api/v1").replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.sessionToken = options.sessionToken;
    this.timeout = options.timeout ?? 30000;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetchFn = options.fetch || globalThis.fetch;

    // Initialize namespaces
    this.websites = {
      list: (query, reqOptions) => this.listWebsites(query, reqOptions),
      get: (id, reqOptions) => this.getWebsite(id, reqOptions),
      create: (data, reqOptions) => this.createWebsite(data, reqOptions),
      update: (id, data, reqOptions) => this.updateWebsite(id, data, reqOptions),
      iterate: (query) => this.iterateWebsites(query),
    };

    this.pages = {
      get: (websiteId, reqOptions) => this.getPages(websiteId, reqOptions),
      update: (websiteId, pages, revision, reqOptions) => this.updatePages(websiteId, pages, revision, reqOptions),
    };

    this.publishing = {
      publish: (websiteId, options, reqOptions) => this.publish(websiteId, options, reqOptions),
      validate: (websiteId, candidateData, reqOptions) => this.validatePublish(websiteId, candidateData, reqOptions),
    };

    this.deployments = {
      list: (websiteId, reqOptions) => this.listDeployments(websiteId, reqOptions),
      get: (websiteId, deploymentId, reqOptions) => this.getDeployment(websiteId, deploymentId, reqOptions),
      rollback: (websiteId, deploymentId, reqOptions) => this.rollback(websiteId, deploymentId, reqOptions),
    };
  }

  public async request<T = any>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const method = (options.method || "GET").toUpperCase();
    const isSafeMethod = method === "GET" || method === "HEAD";
    const maxRetries = isSafeMethod ? this.maxRetries : 0; // Strict: No retries for mutations!

    let attempt = 0;

    while (true) {
      attempt++;
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

      if (options.requestId) {
        headers["X-Request-Id"] = options.requestId;
      }

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      } else if (this.sessionToken) {
        headers["Authorization"] = `Bearer ${this.sessionToken}`;
      }

      // Handle Timeout & AbortSignal
      const requestTimeout = options.timeout ?? this.timeout;
      const controller = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      if (requestTimeout > 0) {
        timeoutId = setTimeout(() => {
          controller.abort(new Error(`Request timed out after ${requestTimeout}ms`));
        }, requestTimeout);
      }

      if (options.signal) {
        if (options.signal.aborted) {
          controller.abort(options.signal.reason);
        } else {
          options.signal.addEventListener("abort", () => {
            controller.abort(options.signal?.reason);
          });
        }
      }

      let res: Response;
      try {
        res = await this.fetchFn(url, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });
      } catch (err: any) {
        if (timeoutId) clearTimeout(timeoutId);
        if (err.name === "AbortError" || controller.signal.aborted) {
          throw new ForgeStudioApiError(
            err.message || `Request aborted`,
            "ABORT_ERROR",
            0
          );
        }
        throw new ForgeStudioApiError(
          err.message || "Network request failed",
          "NETWORK_ERROR",
          0
        );
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

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

      // Check for 429 Rate Limiting
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get("retry-after");
        const retryAfterSec = retryAfterHeader
          ? parseInt(retryAfterHeader, 10)
          : json.error?.retryAfter ?? 1;

        if (isSafeMethod && attempt <= maxRetries) {
          const waitMs = Math.min((retryAfterSec || 1) * 1000, 5000);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        const err = json.error || {};
        throw new ForgeStudioApiError(
          err.message || "Rate limit exceeded",
          err.code || "RATE_LIMITED",
          429,
          err.details,
          retryAfterSec,
          res.headers.get("x-request-id") || undefined
        );
      }

      if (!res.ok || json.success === false) {
        const err = json.error || {};
        throw new ForgeStudioApiError(
          err.message || json.message || `Request failed with status ${res.status}`,
          err.code || "REQUEST_FAILED",
          res.status,
          err.details,
          undefined,
          res.headers.get("x-request-id") || json.requestId || undefined
        );
      }

      return json.data !== undefined ? json.data : json;
    }
  }

  // 1. List websites
  async listWebsites(
    query?: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    },
    options?: RequestOptions
  ): Promise<WebsiteListItem[]> {
    return this.request<WebsiteListItem[]>("/websites", {
      ...options,
      method: "GET",
      query: { ...options?.query, ...query },
    });
  }

  // Async generator pagination helper
  async *iterateWebsites(query?: {
    limit?: number;
    status?: string;
    search?: string;
  }): AsyncGenerator<WebsiteListItem> {
    let page = 1;
    const limit = query?.limit || 20;

    while (true) {
      const items = await this.listWebsites({ ...query, page, limit });
      if (!items || items.length === 0) {
        break;
      }
      for (const item of items) {
        yield item;
      }
      if (items.length < limit) {
        break;
      }
      page++;
    }
  }

  // 2. Create website
  async createWebsite(
    data: {
      name: string;
      slug?: string;
      editorData?: any;
      templateId?: string;
    },
    options?: RequestOptions
  ): Promise<any> {
    return this.request("/websites", {
      ...options,
      method: "POST",
      body: data,
    });
  }

  // 3. Get website by ID
  async getWebsite(id: string, options?: RequestOptions): Promise<any> {
    return this.request(`/websites/${id}`, {
      ...options,
      method: "GET",
    });
  }

  // 4. Update website
  async updateWebsite(
    id: string,
    data: {
      name?: string;
      slug?: string;
      editorData?: any;
      status?: string;
      expectedVersion?: number;
    },
    options?: RequestOptions
  ): Promise<any> {
    return this.request(`/websites/${id}`, {
      ...options,
      method: "PUT",
      body: data,
    });
  }

  // 5. Get pages
  async getPages(websiteId: string, options?: RequestOptions): Promise<WebsitePage[]> {
    return this.request<WebsitePage[]>(`/websites/${websiteId}/pages`, {
      ...options,
      method: "GET",
    });
  }

  // 6. Update pages
  async updatePages(
    websiteId: string,
    pages: WebsitePage[],
    revision?: { expectedVersion?: number; lastKnownUpdatedAt?: string },
    options?: RequestOptions
  ): Promise<{ pages: WebsitePage[] }> {
    return this.request<{ pages: WebsitePage[] }>(`/websites/${websiteId}/pages`, {
      ...options,
      method: "PUT",
      body: {
        pages,
        ...(revision?.expectedVersion !== undefined ? { expectedVersion: revision.expectedVersion } : {}),
        ...(revision?.lastKnownUpdatedAt ? { lastKnownUpdatedAt: revision.lastKnownUpdatedAt } : {}),
      },
    });
  }

  // 7. Validate publish
  async validatePublish(
    websiteId: string,
    candidateData?: any,
    options?: RequestOptions
  ): Promise<{ valid: boolean; errors: any[]; warnings: any[] }> {
    return this.request(`/websites/${websiteId}/validate-publish`, {
      ...options,
      method: "POST",
      body: { candidateData },
    });
  }

  // 8. Publish website
  async publish(
    websiteId: string,
    publishOptions?: PublishOptions,
    options?: RequestOptions
  ): Promise<any> {
    return this.request(`/websites/${websiteId}/publish`, {
      ...options,
      method: "POST",
      body: publishOptions || {},
    });
  }

  // 9. List deployments
  async listDeployments(websiteId: string, options?: RequestOptions): Promise<DeploymentRecord[]> {
    return this.request<DeploymentRecord[]>(`/websites/${websiteId}/deployments`, {
      ...options,
      method: "GET",
    });
  }

  // 10. Get single deployment
  async getDeployment(
    websiteId: string,
    deploymentId: string,
    options?: RequestOptions
  ): Promise<DeploymentRecord> {
    return this.request<DeploymentRecord>(`/websites/${websiteId}/deployments/${deploymentId}`, {
      ...options,
      method: "GET",
    });
  }

  // 11. Rollback deployment
  async rollback(
    websiteId: string,
    deploymentId: string,
    options?: RequestOptions
  ): Promise<any> {
    return this.request(`/websites/${websiteId}/deployments/${deploymentId}/rollback`, {
      ...options,
      method: "POST",
    });
  }

  // 12. Create revision
  async createRevision(
    websiteId: string,
    data: { data: any; description?: string; revisionType?: string },
    options?: RequestOptions
  ): Promise<any> {
    return this.request(`/websites/${websiteId}/revisions`, {
      ...options,
      method: "POST",
      body: data,
    });
  }
}
