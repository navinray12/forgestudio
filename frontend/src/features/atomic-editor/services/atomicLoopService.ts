import type { LoopContainerConfig, CreateLoopPayload } from "../types/atomicLoop.types";

const STORAGE_KEY = "forge_studio_atomic_loops";

const INITIAL_LOOP_PRESETS: LoopContainerConfig[] = [
  {
    id: "loop-products",
    name: "Product Showcase Grid",
    category: "E-Commerce",
    dataSourceType: "cms_products",
    itemsLimit: 3,
    template: {
      id: "tpl-product-card",
      name: "Product Card Template",
      bindings: [
        { elementKey: "image", itemPropertyKey: "image" },
        { elementKey: "title", itemPropertyKey: "title" },
        { elementKey: "price", itemPropertyKey: "price", staticPrefix: "Price: " },
        { elementKey: "description", itemPropertyKey: "description" },
      ],
    },
    emptyStateText: "No products currently available in collection.",
    loadingStateText: "Fetching collection items...",
    errorStateText: "Unable to load products.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "loop-blog-posts",
    name: "Blog Post Feed Loop",
    category: "Content & News",
    dataSourceType: "cms_blog",
    itemsLimit: 2,
    template: {
      id: "tpl-blog-card",
      name: "Blog Article Card",
      bindings: [
        { elementKey: "image", itemPropertyKey: "image" },
        { elementKey: "title", itemPropertyKey: "title" },
        { elementKey: "author", itemPropertyKey: "author", staticPrefix: "By " },
        { elementKey: "date", itemPropertyKey: "date" },
        { elementKey: "excerpt", itemPropertyKey: "excerpt" },
      ],
    },
    emptyStateText: "No blog articles found.",
    loadingStateText: "Loading articles...",
    errorStateText: "Failed to load blog posts.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class AtomicLoopService {
  /**
   * Gets all stored loop definitions
   */
  static getLoops(): LoopContainerConfig[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.saveLoops(INITIAL_LOOP_PRESETS);
        return INITIAL_LOOP_PRESETS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_LOOP_PRESETS;
    } catch {
      return INITIAL_LOOP_PRESETS;
    }
  }

  /**
   * Persists loop definitions to LocalStorage
   */
  static saveLoops(loops: LoopContainerConfig[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loops));
    } catch (err) {
      console.error("Failed to save atomic loops:", err);
    }
  }

  /**
   * Creates a new Loop definition
   */
  static createLoop(payload: CreateLoopPayload): LoopContainerConfig {
    const list = this.getLoops();

    const newLoop: LoopContainerConfig = {
      id: `loop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: payload.name.trim(),
      category: payload.category || "Custom Loops",
      dataSourceType: payload.dataSourceType || "cms_products",
      itemsLimit: 3,
      template: {
        id: `tpl-${Date.now()}`,
        name: `${payload.name} Template`,
        bindings: [
          { elementKey: "title", itemPropertyKey: "title" },
          { elementKey: "price", itemPropertyKey: "price" },
        ],
      },
      emptyStateText: "No items available in collection.",
      loadingStateText: "Loading items...",
      errorStateText: "Unable to load collection.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.push(newLoop);
    this.saveLoops(list);
    return newLoop;
  }

  /**
   * Updates an existing Loop definition
   */
  static updateLoop(id: string, payload: Partial<LoopContainerConfig>): LoopContainerConfig {
    const list = this.getLoops();
    const idx = list.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error(`Loop with ID "${id}" not found.`);

    const updated: LoopContainerConfig = {
      ...list[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    list[idx] = updated;
    this.saveLoops(list);
    return updated;
  }

  /**
   * Deletes a Loop definition
   */
  static deleteLoop(id: string): void {
    const list = this.getLoops();
    const filtered = list.filter((l) => l.id !== id);
    this.saveLoops(filtered);
  }
}
