import type { AtomicVariable } from "../types/variables.types";

const STORAGE_KEY = "forgestudio_atomic_variables";

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

export async function fetchVariables(): Promise<AtomicVariable[]> {
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

export async function saveVariables(variables: AtomicVariable[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(variables));
  } catch (e) {
    console.error("Failed to persist variables to storage", e);
  }
}
