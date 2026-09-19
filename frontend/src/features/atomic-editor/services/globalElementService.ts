import type { GlobalElementDefinition, CreateGlobalElementPayload } from "../types/globalElements.types";

const STORAGE_KEY = "forge_studio_global_elements";

const INITIAL_PRESETS: GlobalElementDefinition[] = [
  {
    id: "global-elem-primary-cta",
    name: "Primary CTA Button",
    elementType: "button",
    content: "Get Started Now →",
    styles: {
      backgroundColor: "var(--primary-color)",
      color: "#ffffff",
      padding: "14px 28px",
      borderRadius: "12px",
      fontWeight: "700",
      fontSize: "15px",
    },
    classes: ["btn-primary-glow"],
    description: "Main website high-conversion call-to-action button definition.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "global-elem-feature-badge",
    name: "Feature Tag Badge",
    elementType: "badge",
    content: "⚡ NEW FEATURE",
    styles: {
      backgroundColor: "#f3e8ff",
      color: "#7c3aed",
      padding: "4px 12px",
      borderRadius: "9999px",
      fontSize: "11px",
      fontWeight: "800",
    },
    classes: ["badge-purple"],
    description: "Reusable pill tag badge for product highlights.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "global-elem-contact-card",
    name: "Contact Card Box",
    elementType: "container",
    content: "Need help? Contact support@forgestudio.com",
    styles: {
      backgroundColor: "#0f172a",
      color: "#f8fafc",
      padding: "24px",
      borderRadius: "16px",
      fontSize: "14px",
    },
    classes: ["card-dark-glass"],
    description: "Reusable dark support info box container.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class GlobalElementService {
  /**
   * Retrieves all global element definitions from local storage
   */
  static getGlobalElements(): GlobalElementDefinition[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.saveGlobalElements(INITIAL_PRESETS);
        return INITIAL_PRESETS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_PRESETS;
    } catch {
      return INITIAL_PRESETS;
    }
  }

  /**
   * Persists global element definitions
   */
  static saveGlobalElements(elements: GlobalElementDefinition[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
    } catch (err) {
      console.error("Failed to save global elements:", err);
    }
  }

  /**
   * Creates a new Global Element
   */
  static createGlobalElement(payload: CreateGlobalElementPayload): GlobalElementDefinition {
    const list = this.getGlobalElements();
    const newElement: GlobalElementDefinition = {
      id: `global-elem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: payload.name.trim(),
      elementType: payload.elementType,
      content: payload.content || "",
      styles: payload.styles || {},
      classes: payload.classes || [],
      description: payload.description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.push(newElement);
    this.saveGlobalElements(list);
    return newElement;
  }

  /**
   * Updates an existing Global Element
   */
  static updateGlobalElement(
    id: string,
    payload: Partial<CreateGlobalElementPayload>
  ): GlobalElementDefinition {
    const list = this.getGlobalElements();
    const idx = list.findIndex((item) => item.id === id);
    if (idx === -1) {
      throw new Error(`Global Element with ID "${id}" not found.`);
    }

    const updated: GlobalElementDefinition = {
      ...list[idx],
      name: payload.name !== undefined ? payload.name.trim() : list[idx].name,
      elementType: payload.elementType !== undefined ? payload.elementType : list[idx].elementType,
      content: payload.content !== undefined ? payload.content : list[idx].content,
      styles: payload.styles !== undefined ? payload.styles : list[idx].styles,
      classes: payload.classes !== undefined ? payload.classes : list[idx].classes,
      description: payload.description !== undefined ? payload.description : list[idx].description,
      updatedAt: new Date().toISOString(),
    };

    list[idx] = updated;
    this.saveGlobalElements(list);
    return updated;
  }

  /**
   * Deletes a Global Element by ID
   */
  static deleteGlobalElement(id: string): void {
    const list = this.getGlobalElements();
    const filtered = list.filter((item) => item.id !== id);
    this.saveGlobalElements(filtered);
  }
}
