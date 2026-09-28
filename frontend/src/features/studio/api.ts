import { useEffect, useState } from "react";

export const API_ORIGIN = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000" : "")).replace(/\/$/, "");
export class StudioApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status: number, code: string) {
    super(message); this.status = status; this.code = code;
  }
}

export async function request<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const response = await fetch(`${API_ORIGIN}/api/v1/studio${path}`, {
    method: options.method || "GET", signal: options.signal, credentials: "include",
    headers: { Accept: "application/json", ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(options.method && options.method !== "GET" ? { "X-Studio-Request": "1" } : {}) },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const message = response.status === 401 ? "Your session expired. Sign in again." : payload?.error?.message || payload?.message || `Request failed (${response.status})`;
    throw new StudioApiError(message, response.status, payload?.error?.code || "REQUEST_FAILED");
  }
  return payload as T;
}

export function useResource<T>(path: string | null, refresh = 0) {
  const key = `${path}|${refresh}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key: "" });
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    request<T>(path, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ key, data }); })
      .catch((error: Error) => { if (!controller.signal.aborted) setState({ key, error: error.message }); });
    return () => controller.abort();
  }, [path, key]);
  // Never display the prior workspace's records while a different workspace loads.
  const current = state.key === key ? state : undefined;
  return { data: current?.data, error: current?.error, loading: !!path && !current };
}

export function dateLabel(value: string | null): string {
  if (!value) return "Never published";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Unknown date" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
