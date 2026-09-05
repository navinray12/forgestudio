import type { AtomicClass } from "../types/classes.types";

const STORAGE_KEY = "forgestudio_atomic_classes";

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

export async function fetchClasses(): Promise<AtomicClass[]> {
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

export async function saveClasses(classes: AtomicClass[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
  } catch (e) {
    console.error("Failed to persist classes to storage", e);
  }
}
