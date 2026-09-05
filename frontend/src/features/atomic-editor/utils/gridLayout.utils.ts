import type { GridContainerConfig, GridItemPlacement, GridBreakpoint } from "../types/atomicGrid.types";

/**
 * Generates inline CSS style object for a Grid Container based on responsive breakpoint
 */
export function generateGridStyles(grid: GridContainerConfig, breakpoint: GridBreakpoint = "desktop"): React.CSSProperties {
  const resp = grid.responsive[breakpoint] || {
    columns: grid.columns,
    columnGap: grid.columnGap,
    rowGap: grid.rowGap,
  };

  return {
    display: "grid",
    gridTemplateColumns: `repeat(${Math.max(1, resp.columns)}, 1fr)`,
    gridTemplateRows: grid.rows || "auto",
    columnGap: resp.columnGap || grid.columnGap,
    rowGap: resp.rowGap || grid.rowGap,
    alignItems: grid.alignItems || "stretch",
    justifyContent: grid.justifyContent || "start",
  };
}

/**
 * Generates inline CSS style object for an individual Grid Item
 */
export function generateGridItemStyles(item: GridItemPlacement): React.CSSProperties {
  return {
    gridColumn: `${item.columnStart} / span ${Math.max(1, item.columnSpan)}`,
    gridRow: `${item.rowStart} / span ${Math.max(1, item.rowSpan)}`,
  };
}
