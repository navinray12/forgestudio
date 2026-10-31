import type { AtomicClass } from "../types/classes.types";

const LEGACY_STORAGE_KEY = "forgestudio_atomic_classes";
const getStorageKey = (websiteId?: string) =>
  websiteId ? `forgestudio_atomic_classes_${websiteId}` : LEGACY_STORAGE_KEY;

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

export const DEFAULT_CLASSES: AtomicClass[] = [
  {
    id: "cls-heading-primary",
    name: "Heading Primary",
    key: "heading-primary",
    className: "heading-primary",
    isGlobal: true,
    scope: "global",
    styles: {
      fontSize: "32px",
      fontWeight: "800",
      lineHeight: "1.2",
      color: "#0f172a",
      letterSpacing: "-0.02em",
    },
    description: "Site-wide primary section header text style",
    assignedCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cls-button-global",
    name: "Global Action Button",
    key: "button-global",
    className: "button-global",
    isGlobal: true,
    scope: "global",
    styles: {
      backgroundColor: "#2563eb",
      color: "#ffffff",
      padding: "12px 24px",
      borderRadius: "10px",
      fontWeight: "700",
      textAlign: "center",
      boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
    },
    pseudoStyles: {
      hover: {
        backgroundColor: "#1d4ed8",
        transform: "translateY(-1px)",
      },
      active: {
        transform: "translateY(0px)",
      },
    },
    description: "Global standard action button style",
    assignedCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cls-card-global",
    name: "Global Card Container",
    key: "card-global",
    className: "card-global",
    isGlobal: true,
    scope: "global",
    styles: {
      backgroundColor: "#ffffff",
      padding: "24px",
      borderRadius: "16px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
      borderColor: "#e2e8f0",
      borderWidth: "1px",
      borderStyle: "solid",
    },
    description: "Site-wide elevated white card container style",
    assignedCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cls-button-primary",
    name: "Primary Button",
    key: "button-primary",
    className: "button-primary",
    isGlobal: false,
    scope: "local",
    styles: {
      backgroundColor: "#2563eb",
      color: "#ffffff",
      padding: "10px 20px",
      borderRadius: "8px",
      fontWeight: "700",
      textAlign: "center",
    },
    description: "Standard page button class style",
    assignedCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Count how many elements actively reference a given class name.
 */
function calculateAssignedCount(className: string, elements?: any[]): number {
  if (!elements || !Array.isArray(elements) || !className) return 0;
  let count = 0;

  function traverse(el: any) {
    if (!el) return;
    const classStr = String(el.className || "");
    const classesArr = Array.isArray(el.classes) ? el.classes : [];
    if (
      classStr.split(/\s+/).includes(className) ||
      classesArr.includes(className) ||
      classesArr.some((c: any) => c === className || c?.name === className || c?.className === className)
    ) {
      count++;
    }
    if (Array.isArray(el.children)) {
      for (const child of el.children) traverse(child);
    }
  }

  for (const el of elements) traverse(el);
  return count;
}

/**
 * Fetch classes authoritatively from backend website design system API,
 * calculating real active element reference counts.
 */
export async function fetchClasses(
  websiteId?: string,
  apiUrl?: string,
  elements?: any[]
): Promise<AtomicClass[]> {
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
        if (Array.isArray(data?.classes) && data.classes.length > 0) {
          const mapped: AtomicClass[] = data.classes.map((c: any, idx: number) => {
            const classKey = String(c.className || c.key || `fs-class-${idx + 1}`);
            return {
              id: String(c.id || `cls-${idx}`),
              name: String(c.name || `Class ${idx + 1}`),
              key: classKey,
              className: classKey,
              isGlobal: true,
              scope: "global",
              styles: c.styles || {},
              pseudoStyles: c.pseudoStyles,
              description: c.description,
              assignedCount: calculateAssignedCount(classKey, elements),
              createdByRole: c.createdByRole,
              createdAt: c.createdAt || new Date().toISOString(),
              updatedAt: c.updatedAt || new Date().toISOString(),
            };
          });

          try {
            localStorage.setItem(getStorageKey(websiteId), JSON.stringify(mapped));
          } catch {}

          return mapped;
        }
      }
    } catch (e) {
      console.warn("Backend design-system API unavailable, falling back to local classes cache", e);
    }

    // Check website-scoped local cache
    try {
      const siteCache = localStorage.getItem(getStorageKey(websiteId));
      if (siteCache) {
        const parsed = JSON.parse(siteCache);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: AtomicClass) => ({
            ...c,
            assignedCount: calculateAssignedCount(c.className || c.key, elements),
          }));
        }
      }
    } catch {}

    // Safe migration from legacy global localStorage
    try {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyClasses = JSON.parse(legacyRaw);
        if (Array.isArray(legacyClasses) && legacyClasses.length > 0) {
          console.info(`Migrating ${legacyClasses.length} legacy classes to website ${websiteId}`);
          await saveClasses(legacyClasses, websiteId, undefined, apiUrl);
          return legacyClasses;
        }
      }
    } catch (e) {
      console.warn("Legacy class migration failed, using defaults", e);
    }
  }

  // Fallback to legacy or defaults
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: AtomicClass) => ({
          ...c,
          assignedCount: calculateAssignedCount(c.className || c.key, elements),
        }));
      }
    }
  } catch {}

  return DEFAULT_CLASSES.map((c) => ({
    ...c,
    assignedCount: calculateAssignedCount(c.className || c.key, elements),
  }));
}

/**
 * Persist classes to backend website design system API,
 * with CAS version check and fallback to website-scoped storage.
 */
export async function saveClasses(
  classes: AtomicClass[],
  websiteId?: string,
  expectedVersion?: number,
  apiUrl?: string
): Promise<{ success: boolean; version?: number }> {
  // Always update local website-scoped cache
  try {
    localStorage.setItem(getStorageKey(websiteId), JSON.stringify(classes));
  } catch (e) {
    console.error("Failed to persist classes to storage", e);
  }

  if (websiteId) {
    const base = getBaseUrl(apiUrl);
    const backendClasses = classes.map((c, index) => ({
      id: c.id || `cls-${index}`,
      name: c.name,
      className: c.className || c.key,
      description: c.description,
      styles: c.styles || {},
      pseudoStyles: c.pseudoStyles,
      createdByRole: c.createdByRole || "DESIGNER",
      createdAt: c.createdAt,
      updatedAt: new Date().toISOString(),
    }));

    // Fetch existing variables to preserve them during class update
    let existingVars: any[] = [];
    try {
      const currentRes = await fetch(`${base}/api/websites/${websiteId}/design-system`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (currentRes.ok) {
        const currentData = await currentRes.json();
        if (Array.isArray(currentData.variables)) {
          existingVars = currentData.variables;
        }
      }
    } catch {}

    const res = await fetch(`${base}/api/websites/${websiteId}/design-system`, {
      method: "PUT",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({
        variables: existingVars,
        classes: backendClasses,
        expectedVersion,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409) {
        throw new Error(data?.message || "STALE_VERSION_CONFLICT: Design system was modified elsewhere.");
      }
      throw new Error(data?.message || "Failed to update website design system classes");
    }

    return { success: true, version: data.version };
  }

  return { success: true };
}

