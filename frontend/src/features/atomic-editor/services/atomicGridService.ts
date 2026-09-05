import type { GridContainerConfig, CreateGridPayload } from "../types/atomicGrid.types";

const STORAGE_KEY = "forge_studio_atomic_grids";

const INITIAL_GRID_PRESETS: GridContainerConfig[] = [
  {
    id: "grid-3-column",
    name: "3-Column Standard Grid",
    category: "Standard Layouts",
    columns: 3,
    rows: "auto",
    columnGap: "24px",
    rowGap: "24px",
    alignItems: "stretch",
    justifyContent: "start",
    responsive: {
      desktop: { columns: 3, columnGap: "24px", rowGap: "24px" },
      tablet: { columns: 2, columnGap: "16px", rowGap: "16px" },
      mobile: { columns: 1, columnGap: "12px", rowGap: "12px" },
    },
    items: [
      { id: "item-1", elementName: "Card 1", elementType: "container", columnStart: 1, rowStart: 1, columnSpan: 1, rowSpan: 1 },
      { id: "item-2", elementName: "Card 2", elementType: "container", columnStart: 2, rowStart: 1, columnSpan: 1, rowSpan: 1 },
      { id: "item-3", elementName: "Card 3", elementType: "container", columnStart: 3, rowStart: 1, columnSpan: 1, rowSpan: 1 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grid-hero-split",
    name: "Hero 1-2 Split Grid",
    category: "Hero Sections",
    columns: 3,
    rows: "auto",
    columnGap: "32px",
    rowGap: "24px",
    alignItems: "center",
    justifyContent: "start",
    responsive: {
      desktop: { columns: 3, columnGap: "32px", rowGap: "24px" },
      tablet: { columns: 1, columnGap: "20px", rowGap: "20px" },
      mobile: { columns: 1, columnGap: "16px", rowGap: "16px" },
    },
    items: [
      { id: "item-hero-left", elementName: "Hero Text & CTA", elementType: "container", columnStart: 1, rowStart: 1, columnSpan: 2, rowSpan: 1 },
      { id: "item-hero-right", elementName: "Hero Image Block", elementType: "image", columnStart: 3, rowStart: 1, columnSpan: 1, rowSpan: 1 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class AtomicGridService {
  /**
   * Retrieves all grid container definitions
   */
  static getGrids(): GridContainerConfig[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.saveGrids(INITIAL_GRID_PRESETS);
        return INITIAL_GRID_PRESETS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_GRID_PRESETS;
    } catch {
      return INITIAL_GRID_PRESETS;
    }
  }

  /**
   * Persists grid container definitions
   */
  static saveGrids(grids: GridContainerConfig[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(grids));
    } catch (err) {
      console.error("Failed to save atomic grids:", err);
    }
  }

  /**
   * Creates a new Grid Layout definition
   */
  static createGrid(payload: CreateGridPayload): GridContainerConfig {
    const list = this.getGrids();
    const cols = payload.columns || 3;
    const colGap = payload.columnGap || "16px";
    const rowGap = payload.rowGap || "16px";

    const newGrid: GridContainerConfig = {
      id: `grid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: payload.name.trim(),
      category: payload.category || "Custom Grids",
      columns: cols,
      rows: "auto",
      columnGap: colGap,
      rowGap: rowGap,
      alignItems: "stretch",
      justifyContent: "start",
      responsive: {
        desktop: { columns: cols, columnGap: colGap, rowGap: rowGap },
        tablet: { columns: Math.max(1, cols - 1), columnGap: colGap, rowGap: rowGap },
        mobile: { columns: 1, columnGap: colGap, rowGap: rowGap },
      },
      items: [
        { id: `item-node-1`, elementName: "Grid Cell 1", elementType: "container", columnStart: 1, rowStart: 1, columnSpan: 1, rowSpan: 1 },
        { id: `item-node-2`, elementName: "Grid Cell 2", elementType: "container", columnStart: 2, rowStart: 1, columnSpan: 1, rowSpan: 1 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.push(newGrid);
    this.saveGrids(list);
    return newGrid;
  }

  /**
   * Updates an existing Grid Container
   */
  static updateGrid(id: string, payload: Partial<GridContainerConfig>): GridContainerConfig {
    const list = this.getGrids();
    const idx = list.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`Grid with ID "${id}" not found.`);

    const updated: GridContainerConfig = {
      ...list[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    list[idx] = updated;
    this.saveGrids(list);
    return updated;
  }

  /**
   * Deletes a Grid Container
   */
  static deleteGrid(id: string): void {
    const list = this.getGrids();
    const filtered = list.filter((g) => g.id !== id);
    this.saveGrids(filtered);
  }
}
