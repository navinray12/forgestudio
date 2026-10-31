import type { AtomicVariable } from "../types/variables.types";

const LEGACY_STORAGE_KEY = "forgestudio_atomic_variables";
const getStorageKey = (websiteId?: string) =>
  websiteId ? `forgestudio_atomic_variables_${websiteId}` : LEGACY_STORAGE_KEY;

const getBaseUrl = (override?: string) => override || (import.meta.env.VITE_API_URL || "");

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch {
    // Ignore in non-browser context
  }
  return headers;
};

export const DEFAULT_VARIABLES: AtomicVariable[] = [
  {
    id: "var-primary-color",
    name: "Primary Color",
    key: "--primary-color",
    token: "--primary-color",
    type: "color",
    category: "color",
    value: "#2563eb",
    defaultMode: "light",
    modes: { light: "#2563eb", dark: "#3b82f6" },
    description: "Main brand color used for buttons and interactive elements",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "var-secondary-color",
    name: "Secondary Color",
    key: "--secondary-color",
    token: "--secondary-color",
    type: "color",
    category: "color",
    value: "#7c3aed",
    defaultMode: "light",
    modes: { light: "#7c3aed", dark: "#8b5cf6" },
    description: "Accent color for badges and secondary highlights",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "var-font-main",
    name: "Main Font Family",
    key: "--font-main",
    token: "--font-main",
    type: "font",
    category: "font",
    value: "Inter, sans-serif",
    description: "Primary font family for body copy and headings",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "var-spacing-md",
    name: "Standard Padding",
    key: "--spacing-md",
    token: "--spacing-md",
    type: "spacing",
    category: "spacing",
    value: "16px",
    description: "Standard container padding spacing token",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Fetch variables authoritatively from backend website design system API,
 * falling back to website-scoped local cache or migrating legacy localStorage.
 */
export async function fetchVariables(
  websiteId?: string,
  apiUrl?: string
): Promise<AtomicVariable[]> {
  const base = getBaseUrl(apiUrl);

  if (websiteId) {
    try {
      const res = await fetch(`${base}/api/websites/${websiteId}/design-system`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.variables) && data.variables.length > 0) {
          const mapped: AtomicVariable[] = data.variables.map((v: any, idx: number) => ({
            id: String(v.id || `var-${idx}`),
            name: String(v.name || `Variable ${idx + 1}`),
            key: String(v.token || v.key || `--fs-custom-${idx + 1}`),
            token: String(v.token || v.key || `--fs-custom-${idx + 1}`),
            type: (v.category || v.type || "custom") as any,
            category: (v.category || v.type || "custom") as any,
            value: String(v.value || ""),
            description: v.description,
            defaultMode: v.defaultMode || "light",
            modes: v.modes,
            createdAt: v.createdAt || new Date().toISOString(),
            updatedAt: v.updatedAt || new Date().toISOString(),
          }));

          // Cache locally under website scope
          try {
            localStorage.setItem(getStorageKey(websiteId), JSON.stringify(mapped));
          } catch {}

          return mapped;
        }
      }
    } catch (e) {
      console.warn("Backend design-system API unavailable, falling back to local storage cache", e);
    }

    // Check website-scoped local cache
    try {
      const siteCache = localStorage.getItem(getStorageKey(websiteId));
      if (siteCache) {
        const parsed = JSON.parse(siteCache);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Safe migration from legacy global localStorage
    try {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyVars = JSON.parse(legacyRaw);
        if (Array.isArray(legacyVars) && legacyVars.length > 0) {
          console.info(`Migrating ${legacyVars.length} legacy variables to website ${websiteId}`);
          await saveVariables(legacyVars, websiteId, undefined, apiUrl);
          return legacyVars;
        }
      }
    } catch (e) {
      console.warn("Legacy variable migration failed, using default variables", e);
    }
  }

  // Fallback to legacy or defaults
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  return DEFAULT_VARIABLES;
}

/**
 * Persist variables to backend website design system API,
 * with CAS version check and fallback to website-scoped storage.
 */
export async function saveVariables(
  variables: AtomicVariable[],
  websiteId?: string,
  expectedVersion?: number,
  apiUrl?: string
): Promise<{ success: boolean; version?: number }> {
  // Always update local website-scoped cache
  try {
    localStorage.setItem(getStorageKey(websiteId), JSON.stringify(variables));
  } catch (e) {
    console.error("Failed to persist variables to local storage", e);
  }

  if (websiteId) {
    const base = getBaseUrl(apiUrl);
    const backendVars = variables.map((v, index) => ({
      id: v.id || `var-${index}`,
      name: v.name,
      category: v.type || v.category || "custom",
      token: v.token || v.key,
      value: v.value,
      description: v.description,
      defaultMode: v.defaultMode || "light",
      modes: v.modes,
      createdAt: v.createdAt,
      updatedAt: new Date().toISOString(),
    }));

    // Fetch existing classes to avoid overwriting them during partial design system save
    let existingClasses: any[] = [];
    try {
      const currentRes = await fetch(`${base}/api/websites/${websiteId}/design-system`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (currentRes.ok) {
        const currentData = await currentRes.json();
        if (Array.isArray(currentData.classes)) {
          existingClasses = currentData.classes;
        }
      }
    } catch {}

    const res = await fetch(`${base}/api/websites/${websiteId}/design-system`, {
      method: "PUT",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({
        variables: backendVars,
        classes: existingClasses,
        expectedVersion,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409) {
        throw new Error(data?.message || "STALE_VERSION_CONFLICT: Design system was modified elsewhere.");
      }
      throw new Error(data?.message || "Failed to update website design system variables");
    }

    return { success: true, version: data.version };
  }

  return { success: true };
}

