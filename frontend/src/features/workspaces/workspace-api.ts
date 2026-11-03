export interface WorkspaceSummary {
  id: string; name: string; slug: string; organizationId: string;
  version: number; lifecycleStatus: "ACTIVE" | "ARCHIVED";
  organizationName?: string; userRole: "OWNER" | "ADMIN" | "MEMBER";
  ownerId?: string; owner?: { id: string; fullName: string | null } | null;
}
export interface WorkspaceDetails extends WorkspaceSummary {
  settings?: {locale?:string;timeZone?:string}; archivedAt?:string|null;
  members: Array<{ id: string; userId: string; role: string; createdAt?: string; membershipStatus?: string;
    user: { fullName: string | null; email?: string | null; status?: string; emailVerified?: boolean } }>;
  websites: Array<{ id: string; name: string; slug: string; status: string }>;
  hasMoreWebsites: boolean;
}
export class WorkspaceRequestError extends Error {
  readonly status:number; readonly code:string;
  constructor(message:string, status:number, code:string) {super(message);this.name="WorkspaceRequestError";this.status=status;this.code=code;}
}
export async function workspaceRequest<T>(base: string, path: string, options: {
  signal?: AbortSignal; method?: string; payload?: unknown; key?: string; etag?: string;
} = {}): Promise<T> {
  const method = options.method ?? "GET";
  const response = await fetch(`${base}/api/v1/tenant-workspaces${path}`, {
    method, credentials: "include", signal: options.signal,
    headers: {
      ...(method === "GET" ? {} : {
        "Content-Type": "application/json", "X-Forge-Intent": "workspace-command", "Idempotency-Key": options.key ?? "",
        ...(options.etag ? {"If-Match":options.etag} : {}),
      }),
    },
    body: options.payload === undefined ? undefined : JSON.stringify(options.payload),
  });
  const data = await response.json().catch(() => null);
  if (response.status === 401) throw new WorkspaceRequestError("Your session has expired or is no longer valid. Sign in again to continue.", 401, "SESSION_EXPIRED");
  if (!response.ok || !data) throw new WorkspaceRequestError(data?.error?.message || data?.detail || data?.message || `Workspace request failed (${response.status})`,response.status,data?.code || data?.error?.code || "REQUEST_FAILED");
  return data as T;
}
