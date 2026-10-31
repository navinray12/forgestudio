import type { AtomicClass } from "../types/classes.types";

const STORAGE_KEY = "forgestudio_atomic_classes";
const apiUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:5000";

export const DEFAULT_CLASSES: AtomicClass[] = [
  {
    id: "cls-heading-primary",
    name: "Heading Primary",
    key: "heading-primary",
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
    assignedCount: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cls-button-global",
    name: "Global Action Button",
    key: "button-global",
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
    description: "Global standard action button style",
    assignedCount: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cls-card-global",
    name: "Global Card Container",
    key: "card-global",
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
    assignedCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cls-button-primary",
    name: "Primary Button",
    key: "button-primary",
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
    assignedCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getClassStorageKey(websiteId?: string): string {
  return websiteId ? `${STORAGE_KEY}_${websiteId}` : STORAGE_KEY;
}

/**
 * Maps a canonical GlobalClass from website editorData into AtomicClass format.
 */
export function globalClassToAtomicClass(gc: any): AtomicClass {
  const key = typeof gc.className === "string" ? gc.className.replace(/^\.+/, "") : "class";
  return {
    id: gc.id || `cls-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: gc.name || gc.className || "Class",
    key,
    styles: gc.styles || {},
    description: gc.description || "",
    isGlobal: true,
    scope: "global",
    assignedCount: 0,
    createdAt: gc.createdAt || new Date().toISOString(),
    updatedAt: gc.updatedAt || new Date().toISOString(),
  };
}

/**
 * Maps an AtomicClass into canonical GlobalClass format for website persistence.
 */
export function atomicClassToGlobalClass(ac: AtomicClass): any {
  const className = (ac.key || ac.name || "class")
    .replace(/^\.+/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-");
  return {
    id: ac.id,
    name: ac.name,
    className,
    description: ac.description || "",
    styles: ac.styles || {},
  };
}

export async function fetchClasses(websiteId?: string): Promise<AtomicClass[]> {
  const storageKey = getClassStorageKey(websiteId);

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
        const rawClasses = Array.isArray(data.classes) ? data.classes : [];
        const converted = rawClasses.map(globalClassToAtomicClass);
        try {
          localStorage.setItem(storageKey, JSON.stringify(converted));
        } catch (_) {
          /* ignore localStorage write failure in restricted context */
        }
        return converted;
      }
    } catch (_err) {
      // Fallback to local storage on network/offline error
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
      const editorDataRaw = localStorage.getItem(`forgestudio_editor_${websiteId}`);
      if (editorDataRaw) {
        const editorData = JSON.parse(editorDataRaw);
        if (Array.isArray(editorData.globalClasses)) {
          const converted = editorData.globalClasses.map(globalClassToAtomicClass);
          return converted;
        }
      }
    } catch (_) {
      /* ignore malformed cache read failure */
    }

    // Return empty list for a clean website with no classes (prevent cross-site pollution)
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
  return DEFAULT_CLASSES;
}

export async function saveClasses(classes: AtomicClass[], websiteId?: string): Promise<void> {
  const storageKey = getClassStorageKey(websiteId);

  // 1. Immediately persist to scoped localStorage
  try {
    localStorage.setItem(storageKey, JSON.stringify(classes));
  } catch (e) {
    console.error("Failed to persist classes to storage", e);
  }

  if (websiteId) {
    const globalClasses = classes.map(atomicClassToGlobalClass);

    // 2. Dispatch reactive event for WebsiteEditor & Canvas live synchronization
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fs-design-system-updated", {
            detail: { websiteId, classes: globalClasses },
          })
        );
      }
    } catch (_) {
      /* ignore event dispatch failure in non-browser context */
    }

    // 3. Persist to backend database via canonical endpoint
    try {
      const res = await fetch(`${apiUrl}/api/websites/${websiteId}/design-system`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ classes: globalClasses }),
      });
      if (!res.ok && res.status !== 404) {
        await fetch(`${apiUrl}/api/v1/websites/${websiteId}/design-system`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ classes: globalClasses }),
        });
      }
    } catch (e) {
      console.warn("Failed to persist classes to backend:", e);
    }
  }
}
