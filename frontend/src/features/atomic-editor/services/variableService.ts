import type { AtomicVariable, VariableType } from "../types/variables.types";

const STORAGE_KEY = "forgestudio_atomic_variables";
const apiUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:5000";

export const DEFAULT_VARIABLES: AtomicVariable[] = [
  {
    id: "var-primary-color",
    name: "Primary Color",
    key: "--primary-color",
    type: "color",
    value: "#2563eb",
    description: "Main brand color used for buttons and interactive elements",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "var-secondary-color",
    name: "Secondary Color",
    key: "--secondary-color",
    type: "color",
    value: "#7c3aed",
    description: "Accent color for badges and secondary highlights",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "var-font-main",
    name: "Main Font Family",
    key: "--font-main",
    type: "font",
    value: "Inter, sans-serif",
    description: "Primary font family for body copy and headings",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "var-spacing-md",
    name: "Standard Padding",
    key: "--spacing-md",
    type: "spacing",
    value: "16px",
    description: "Standard container padding spacing token",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getVariableStorageKey(websiteId?: string): string {
  return websiteId ? `${STORAGE_KEY}_${websiteId}` : STORAGE_KEY;
}

/**
 * Maps a canonical DesignVariable from website editorData into AtomicVariable format.
 */
export function designVariableToAtomicVariable(dv: any): AtomicVariable {
  const typeMap: Record<string, VariableType> = {
    color: "color",
    typography: "font",
    font: "font",
    spacing: "spacing",
    number: "number",
    radius: "number",
    shadow: "number",
    custom: "number",
  };
  const token = typeof dv.token === "string" ? dv.token : "";
  const key = token.startsWith("--") ? token : `--${token || "var"}`;
  return {
    id: dv.id || `var-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: dv.name || token || "Variable",
    key,
    type: typeMap[dv.category] || "color",
    value: dv.modes?.light || dv.value || "",
    description: dv.description || "",
    createdAt: dv.createdAt || new Date().toISOString(),
    updatedAt: dv.updatedAt || new Date().toISOString(),
  };
}

/**
 * Maps an AtomicVariable into the canonical DesignVariable format for website persistence.
 */
export function atomicVariableToDesignVariable(av: AtomicVariable): any {
  const categoryMap: Record<VariableType, string> = {
    color: "color",
    font: "typography",
    spacing: "spacing",
    number: "custom",
  };
  const token = av.key?.startsWith("--") ? av.key : `--${av.key || "var"}`;
  return {
    id: av.id,
    name: av.name,
    category: categoryMap[av.type] || "custom",
    token,
    value: av.value,
    description: av.description || "",
    modes: { light: av.value },
  };
}

export async function fetchVariables(websiteId?: string): Promise<AtomicVariable[]> {
  const storageKey = getVariableStorageKey(websiteId);

  if (websiteId) {
    // 1. Attempt API fetch from canonical website endpoint
    try {
      let res = await fetch(`${apiUrl}/api/websites/${websiteId}/design-system`, {
        credentials: "include",
      });
      if (!res.ok && res.status !== 404) {
        res = await fetch(`${apiUrl}/api/v1/websites/${websiteId}/design-system`, {
          credentials: "include",
        });
      }

      if (res.ok) {
        const data = await res.json();
        const rawVars = Array.isArray(data.variables) ? data.variables : [];
        const converted = rawVars.map(designVariableToAtomicVariable);
        try {
          localStorage.setItem(storageKey, JSON.stringify(converted));
        } catch (_) {}
        return converted;
      }
    } catch (_err) {
      // Fallback to local storage on offline/network error
    }

    // 2. Fallback to website-scoped localStorage
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      // Check full editor data backup for website
      const editorDataRaw = localStorage.getItem(`forgestudio_editor_${websiteId}`);
      if (editorDataRaw) {
        const editorData = JSON.parse(editorDataRaw);
        if (Array.isArray(editorData.globalVariables)) {
          const converted = editorData.globalVariables.map(designVariableToAtomicVariable);
          return converted;
        }
      }
    } catch (_) {}

    // Return empty list for a clean website with no tokens (prevent cross-site pollution)
    return [];
  }

  // Standalone/unscoped legacy fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // Fallback to defaults
  }
  return DEFAULT_VARIABLES;
}

export async function saveVariables(variables: AtomicVariable[], websiteId?: string): Promise<void> {
  const storageKey = getVariableStorageKey(websiteId);

  // 1. Immediately persist to scoped localStorage
  try {
    localStorage.setItem(storageKey, JSON.stringify(variables));
  } catch (e) {
    console.error("Failed to persist variables to storage", e);
  }

  if (websiteId) {
    const designVars = variables.map(atomicVariableToDesignVariable);

    // 2. Dispatch reactive event for WebsiteEditor & Canvas live synchronization
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fs-design-system-updated", {
            detail: { websiteId, variables: designVars },
          })
        );
      }
    } catch (_) {}

    // 3. Persist to backend database via canonical endpoint
    try {
      let res = await fetch(`${apiUrl}/api/websites/${websiteId}/design-system`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ variables: designVars }),
      });
      if (!res.ok && res.status !== 404) {
        await fetch(`${apiUrl}/api/v1/websites/${websiteId}/design-system`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ variables: designVars }),
        });
      }
    } catch (e) {
      console.warn("Failed to persist variables to backend:", e);
    }
  }
}
