import type { LoopContainerConfig, CreateLoopPayload } from "../types/atomicLoop.types";

const STORAGE_KEY = "forge_studio_atomic_loops";
const STORAGE_VERSION = 2;
const MAX_LOOPS = 500;
const MAX_NAME_LENGTH = 120;
const MAX_CATEGORY_LENGTH = 80;
const MAX_ITEMS_LIMIT = 100;

type PersistedLoopState = {
  version: number;
  loops: LoopContainerConfig[];
};

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

function isBrowserStorageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function normalizeLoop(loop: LoopContainerConfig): LoopContainerConfig {
  const now = new Date().toISOString();
  const itemLimit = Number.isFinite(loop.itemsLimit)
    ? Math.min(Math.max(Math.floor(loop.itemsLimit ?? 3), 1), MAX_ITEMS_LIMIT)
    : 3;

  return {
    ...loop,
    id: normalizeText(loop.id, createId("loop"), 200),
    name: normalizeText(loop.name, "Untitled Loop", MAX_NAME_LENGTH),
    category: loop.category
      ? normalizeText(loop.category, "Custom Loops", MAX_CATEGORY_LENGTH)
      : "Custom Loops",
    dataSourceType: loop.dataSourceType || "static",
    itemsLimit: itemLimit,
    template: {
      ...loop.template,
      id: normalizeText(loop.template?.id, createId("tpl"), 200),
      name: normalizeText(loop.template?.name, "Loop Template", MAX_NAME_LENGTH),
      bindings: Array.isArray(loop.template?.bindings)
        ? loop.template.bindings.filter(
            (binding) =>
              typeof binding?.elementKey === "string" &&
              typeof binding?.itemPropertyKey === "string",
          )
        : [],
    },
    emptyStateText: normalizeText(loop.emptyStateText, "No items available.", 500),
    loadingStateText: normalizeText(loop.loadingStateText, "Loading items...", 500),
    errorStateText: normalizeText(loop.errorStateText, "Unable to load items.", 500),
    createdAt: loop.createdAt || now,
    updatedAt: loop.updatedAt || now,
  };
}

function cloneLoops(loops: LoopContainerConfig[]): LoopContainerConfig[] {
  return loops.map((loop) => normalizeLoop(loop));
}

export class AtomicLoopService {
  /**
   * Gets all stored loop definitions. Invalid/corrupt browser storage is ignored
   * and replaced with safe built-in presets.
   */
  static getLoops(): LoopContainerConfig[] {
    if (!isBrowserStorageAvailable()) return cloneLoops(INITIAL_LOOP_PRESETS);

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const presets = cloneLoops(INITIAL_LOOP_PRESETS);
        this.saveLoops(presets);
        return presets;
      }

      const parsed: unknown = JSON.parse(raw);
      const loops = Array.isArray(parsed)
        ? parsed
        : (parsed as PersistedLoopState)?.version === STORAGE_VERSION &&
            Array.isArray((parsed as PersistedLoopState).loops)
          ? (parsed as PersistedLoopState).loops
          : null;

      if (!loops) return cloneLoops(INITIAL_LOOP_PRESETS);

      return cloneLoops(loops as LoopContainerConfig[]).slice(0, MAX_LOOPS);
    } catch {
      return cloneLoops(INITIAL_LOOP_PRESETS);
    }
  }

  /**
   * Persists loop definitions as a versioned draft cache. Server persistence
   * should be layered above this service for multi-user SaaS deployments.
   */
  static saveLoops(loops: LoopContainerConfig[]): void {
    if (!isBrowserStorageAvailable()) return;

    try {
      const safeLoops = cloneLoops(loops).slice(0, MAX_LOOPS);
      const state: PersistedLoopState = {
        version: STORAGE_VERSION,
        loops: safeLoops,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can fail in private/restricted browser contexts. The editor
      // remains usable because callers receive their in-memory result.
    }
  }

  /**
   * Creates a new Loop definition with normalized, bounded user input.
   */
  static createLoop(payload: CreateLoopPayload): LoopContainerConfig {
    const name = normalizeText(payload.name, "Untitled Loop", MAX_NAME_LENGTH);
    const category = normalizeText(payload.category, "Custom Loops", MAX_CATEGORY_LENGTH);
    const list = this.getLoops();

    if (list.length >= MAX_LOOPS) {
      throw new Error(`A maximum of ${MAX_LOOPS} loop definitions is supported.`);
    }

    const now = new Date().toISOString();
    const newLoop: LoopContainerConfig = {
      id: createId("loop"),
      name,
      category,
      dataSourceType: payload.dataSourceType || "cms_products",
      itemsLimit: 3,
      template: {
        id: createId("tpl"),
        name: `${name} Template`.slice(0, MAX_NAME_LENGTH),
        bindings: [
          { elementKey: "title", itemPropertyKey: "title" },
          { elementKey: "price", itemPropertyKey: "price" },
        ],
      },
      emptyStateText: "No items available in collection.",
      loadingStateText: "Loading items...",
      errorStateText: "Unable to load collection.",
      createdAt: now,
      updatedAt: now,
    };

    list.push(newLoop);
    this.saveLoops(list);
    return normalizeLoop(newLoop);
  }

  /**
   * Updates an existing Loop definition without mutating the caller payload.
   */
  static updateLoop(id: string, payload: Partial<LoopContainerConfig>): LoopContainerConfig {
    const list = this.getLoops();
    const idx = list.findIndex((loop) => loop.id === id);
    if (idx === -1) throw new Error(`Loop with ID "${id}" not found.`);

    const updated = normalizeLoop({
      ...list[idx],
      ...payload,
      id: list[idx].id,
      createdAt: list[idx].createdAt,
      updatedAt: new Date().toISOString(),
    });

    list[idx] = updated;
    this.saveLoops(list);
    return updated;
  }

  /**
   * Deletes a Loop definition. Missing IDs are treated as a no-op so delete
   * operations remain idempotent for collaborative/editor retry flows.
   */
  static deleteLoop(id: string): void {
    const list = this.getLoops();
    this.saveLoops(list.filter((loop) => loop.id !== id));
  }
}
