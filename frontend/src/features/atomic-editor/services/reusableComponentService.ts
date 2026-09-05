import type { ReusableComponentDefinition, CreateReusableComponentPayload, ComponentElementNode } from "../types/reusableComponents.types";

const STORAGE_KEY = "forge_studio_reusable_components";

function countNodes(node: ComponentElementNode): number {
  if (!node) return 0;
  let count = 1;
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => {
      count += countNodes(child);
    });
  }
  return count;
}

const INITIAL_PRESETS: ReusableComponentDefinition[] = [
  {
    id: "comp-pricing-card",
    name: "Pricing Card",
    category: "Cards",
    description: "Complete pricing tier box with container, title, price badge, and CTA button.",
    elementCount: 4,
    rootElement: {
      id: "node-root-pricing",
      type: "container",
      name: "Pricing Box Container",
      styles: {
        backgroundColor: "#0f172a",
        color: "#ffffff",
        padding: "32px",
        borderRadius: "20px",
      },
      classes: ["card-dark-glass"],
      children: [
        {
          id: "node-heading",
          type: "heading",
          name: "Plan Title",
          content: "Pro Tier",
          styles: { fontSize: "24px", fontWeight: "800", color: "#ffffff" },
        },
        {
          id: "node-price",
          type: "paragraph",
          name: "Price Tag",
          content: "$49 / month",
          styles: { fontSize: "28px", fontWeight: "900", color: "var(--primary-color)" },
        },
        {
          id: "node-button",
          type: "button",
          name: "Subscribe Button",
          content: "Choose Pro Plan →",
          styles: {
            backgroundColor: "var(--primary-color)",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "10px",
          },
        },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-feature-card",
    name: "Feature Card Block",
    category: "Features",
    description: "Reusable 3-element feature showcase block.",
    elementCount: 3,
    rootElement: {
      id: "node-root-feature",
      type: "container",
      name: "Feature Card Container",
      styles: {
        backgroundColor: "#ffffff",
        padding: "24px",
        borderRadius: "16px",
        borderWidth: "1px",
        borderColor: "#e2e8f0",
      },
      children: [
        {
          id: "node-feat-title",
          type: "heading",
          name: "Feature Heading",
          content: "⚡ Instant Performance",
          styles: { fontSize: "18px", fontWeight: "700" },
        },
        {
          id: "node-feat-desc",
          type: "paragraph",
          name: "Feature Description",
          content: "Sub-millisecond latency edge execution engine for web applications.",
          styles: { fontSize: "13px", color: "#64748b" },
        },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class ReusableComponentService {
  /**
   * Retrieves all reusable component definitions
   */
  static getComponents(): ReusableComponentDefinition[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.saveComponents(INITIAL_PRESETS);
        return INITIAL_PRESETS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_PRESETS;
    } catch {
      return INITIAL_PRESETS;
    }
  }

  /**
   * Persists component definitions
   */
  static saveComponents(components: ReusableComponentDefinition[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
    } catch (err) {
      console.error("Failed to save reusable components:", err);
    }
  }

  /**
   * Creates a new Reusable Component definition
   */
  static createComponent(payload: CreateReusableComponentPayload): ReusableComponentDefinition {
    const list = this.getComponents();
    const newComponent: ReusableComponentDefinition = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: payload.name.trim(),
      category: payload.category || "General",
      description: payload.description || "",
      elementCount: countNodes(payload.rootElement),
      rootElement: payload.rootElement,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.push(newComponent);
    this.saveComponents(list);
    return newComponent;
  }

  /**
   * Updates an existing Reusable Component definition
   */
  static updateComponent(
    id: string,
    payload: Partial<CreateReusableComponentPayload>
  ): ReusableComponentDefinition {
    const list = this.getComponents();
    const idx = list.findIndex((item) => item.id === id);
    if (idx === -1) {
      throw new Error(`Reusable Component with ID "${id}" not found.`);
    }

    const updated: ReusableComponentDefinition = {
      ...list[idx],
      name: payload.name !== undefined ? payload.name.trim() : list[idx].name,
      category: payload.category !== undefined ? payload.category : list[idx].category,
      description: payload.description !== undefined ? payload.description : list[idx].description,
      rootElement: payload.rootElement !== undefined ? payload.rootElement : list[idx].rootElement,
      elementCount: payload.rootElement ? countNodes(payload.rootElement) : list[idx].elementCount,
      updatedAt: new Date().toISOString(),
    };

    list[idx] = updated;
    this.saveComponents(list);
    return updated;
  }

  /**
   * Duplicates an existing Reusable Component
   */
  static duplicateComponent(id: string): ReusableComponentDefinition {
    const list = this.getComponents();
    const target = list.find((item) => item.id === id);
    if (!target) {
      throw new Error(`Component with ID "${id}" not found.`);
    }

    const duplicated: ReusableComponentDefinition = {
      ...target,
      id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${target.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.push(duplicated);
    this.saveComponents(list);
    return duplicated;
  }

  /**
   * Deletes a Reusable Component by ID
   */
  static deleteComponent(id: string): void {
    const list = this.getComponents();
    const filtered = list.filter((item) => item.id !== id);
    this.saveComponents(filtered);
  }
}
