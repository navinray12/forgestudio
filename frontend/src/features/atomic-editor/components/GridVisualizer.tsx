import React from "react";
import type { GridContainerConfig, GridBreakpoint, GridItemPlacement } from "../types/atomicGrid.types";
import { generateGridStyles, generateGridItemStyles } from "../utils/gridLayout.utils";

interface GridVisualizerProps {
  grid: GridContainerConfig;
  breakpoint: GridBreakpoint;
  selectedItemId?: string | null;
  onSelectItem?: (item: GridItemPlacement) => void;
}

export const GridVisualizer: React.FC<GridVisualizerProps> = ({
  grid,
  breakpoint,
  selectedItemId,
  onSelectItem,
}) => {
  const gridStyles = generateGridStyles(grid, breakpoint);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
          <span>📐</span>
          <span>Grid Visualizer ({breakpoint.toUpperCase()})</span>
        </span>
        <span className="font-mono text-[10px]">
          {grid.responsive[breakpoint]?.columns || grid.columns} Columns | Gap: {grid.responsive[breakpoint]?.columnGap || grid.columnGap}
        </span>
      </div>

      {/* Grid Canvas Box */}
      <div
        style={gridStyles}
        className="rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/10 p-3 min-h-[160px] transition-all"
      >
        {grid.items.map((item) => {
          const itemStyles = generateGridItemStyles(item);
          const isSelected = selectedItemId === item.id;

          return (
            <div
              key={item.id}
              style={itemStyles}
              onClick={() => onSelectItem?.(item)}
              className={`group relative flex flex-col justify-between rounded-lg p-3 border text-xs font-bold transition cursor-pointer ${
                isSelected
                  ? "border-purple-600 bg-purple-100 text-purple-950 dark:bg-purple-900/60 dark:text-purple-100 shadow-md ring-2 ring-purple-500/40"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-purple-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{item.elementName}</span>
                <span className="text-[9px] font-mono font-normal opacity-70">
                  {item.elementType}
                </span>
              </div>

              {/* Span Badge */}
              <div className="mt-2 flex items-center gap-1 text-[9px] font-mono font-normal text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 w-fit">
                <span>Col: {item.columnStart} (Span {item.columnSpan})</span>
                <span>•</span>
                <span>Row: {item.rowStart} (Span {item.rowSpan})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
