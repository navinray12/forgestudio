export type GridBreakpoint = "desktop" | "tablet" | "mobile";

export interface ResponsiveGridSettings {
  columns: number;
  columnGap: string;
  rowGap: string;
}

export interface GridItemPlacement {
  id: string;
  elementName: string;
  elementType: string;
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
}

export interface GridContainerConfig {
  id: string;
  name: string;
  category?: string;
  columns: number;
  rows: string; // e.g. "auto" | "1fr 1fr"
  columnGap: string;
  rowGap: string;
  alignItems: "start" | "center" | "end" | "stretch";
  justifyContent: "start" | "center" | "end" | "space-between" | "space-around" | "space-evenly";
  responsive: Record<GridBreakpoint, ResponsiveGridSettings>;
  items: GridItemPlacement[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGridPayload {
  name: string;
  columns?: number;
  columnGap?: string;
  rowGap?: string;
  category?: string;
}
