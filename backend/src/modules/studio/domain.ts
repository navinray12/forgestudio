/** Pure validation and copy policy. Keep database and HTTP dependencies out of this module. */
export class StudioError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 400, code = "VALIDATION_ERROR") {
    super(message);
    this.name = "StudioError";
    this.status = status;
    this.code = code;
  }
}

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type SiteView = "all" | "favorites" | "archived" | "shared";
export type SiteSort = "updated" | "created" | "name" | "published";
export interface SiteQuery {
  workspaceId: string | null;
  folderId: string | null;
  view: SiteView;
  q: string;
  sort: SiteSort;
  direction: "asc" | "desc";
  page: number;
  limit: number;
}

export function id(value: unknown, label = "id"): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new StudioError(`${label} must be a UUID`);
  }
  return value.toLowerCase();
}

export function scope(value: unknown): string | null {
  return value === undefined || value === null || value === "personal" ? null : id(value, "workspaceId");
}

export function object(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new StudioError("A JSON object is required");
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new StudioError("The request contains an unsupported field");
  return body;
}

export function name(value: unknown): string {
  if (typeof value !== "string") throw new StudioError("Name is required");
  const result = value.trim().normalize("NFKC");
  if (!result || result.length > 120 || /[\u0000-\u001f\u007f]/.test(result)) {
    throw new StudioError("Name must contain 1–120 characters without control characters");
  }
  return result;
}

export function integer(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if ((typeof value !== "number" && typeof value !== "string") || !/^\d+$/.test(String(value))) {
    throw new StudioError("Expected a whole number");
  }
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < min || result > max) throw new StudioError(`Number must be between ${min} and ${max}`);
  return result;
}

export function revision(value: unknown): number {
  if (value === undefined) throw new StudioError("A revision is required", 428, "PRECONDITION_REQUIRED");
  return integer(value, 0, 0, 2147483646);
}

function choice<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !options.includes(value as T)) throw new StudioError("Unsupported filter option");
  return value as T;
}

export function siteQuery(raw: Record<string, unknown>): SiteQuery {
  object(raw, ["workspaceId", "folderId", "view", "q", "sort", "direction", "page", "limit"]);
  const q = raw.q === undefined ? "" : raw.q;
  if (typeof q !== "string" || q.length > 120) throw new StudioError("Search must be at most 120 characters");
  return {
    workspaceId: scope(raw.workspaceId),
    folderId: raw.folderId === undefined || raw.folderId === null ? null : id(raw.folderId, "folderId"),
    view: choice(raw.view, ["all", "favorites", "archived", "shared"], "all"),
    q: q.trim(),
    sort: choice(raw.sort, ["updated", "created", "name", "published"], "updated"),
    direction: choice(raw.direction, ["asc", "desc"], "desc"),
    page: integer(raw.page, 1, 1, 10000),
    limit: integer(raw.limit, 12, 1, 48),
  };
}

export function literalSearch(value: string): string {
  return `%${value.replace(/[\\%_]/g, character => `\\${character}`)}%`;
}

export function trustedOrigin(origin: unknown, configured: string | undefined, production: boolean): boolean {
  if (typeof origin !== "string" || origin === "null") return false;
  const candidates = configured ? [configured] : production ? [] : ["http://localhost:5173", "http://127.0.0.1:5173"];
  try {
    const incoming = new URL(origin);
    if (incoming.username || incoming.password || incoming.origin !== origin) return false;
    return candidates.some(candidate => new URL(candidate).origin === incoming.origin);
  } catch { return false; }
}

const DESIGN_KEYS = new Set([
  "version", "elements", "pages", "pageSettings", "globalStyles", "globalSettings",
  "designTokens", "globalClasses", "components", "breakpoints", "interactions", "fonts",
]);
const OPERATIONAL_KEYS = new Set([
  "__proto__", "constructor", "prototype", "password", "passwordHash", "apiKey", "secret",
  "accessToken", "refreshToken", "authorization", "credentials", "hostingConfig", "customDomains",
  "integrations", "webhooks", "backups", "deployments", "publishedData", "publishedSnapshot",
  "smtp", "mailerConfig", "billing", "clientBilling", "wpConnection", "sftpConnections",
]);

/** Duplicate design, not account credentials, publishing state, connected services or customer data. */
export function copyDesign(input: unknown): Record<string, Json> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new StudioError("The source design is invalid", 422, "INVALID_DESIGN");
  let nodes = 0;
  function copy(value: unknown, depth = 0): Json {
    if (++nodes > 50000 || depth > 60) throw new StudioError("The source design exceeds copy limits", 422, "DESIGN_TOO_LARGE");
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.map(item => copy(item, depth + 1));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).filter(([key]) => !OPERATIONAL_KEYS.has(key)).map(([key, item]) => [key, copy(item, depth + 1)]));
    }
    throw new StudioError("The source design contains non-JSON data", 422, "INVALID_DESIGN");
  }
  const result: Record<string, Json> = { version: 1, elements: [] };
  for (const [key, value] of Object.entries(input)) if (DESIGN_KEYS.has(key)) result[key] = copy(value);
  if (JSON.stringify(result).length > 2_000_000) throw new StudioError("The source design exceeds copy limits", 422, "DESIGN_TOO_LARGE");
  return result;
}

export function assertRevision(actual: number, expected: number): void {
  if (actual !== expected) throw new StudioError("This site changed in another session. Refresh and try again.", 409, "REVISION_CONFLICT");
}
