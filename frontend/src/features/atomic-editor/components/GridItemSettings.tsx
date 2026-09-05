import React from "react";
import type { GridItemPlacement } from "../types/atomicGrid.types";

interface GridItemSettingsProps {
  item: GridItemPlacement;
  maxColumns: number;
  onUpdateItem: (updated: GridItemPlacement) => void;
}

export const GridItemSettings: React.FC<GridItemSettingsProps> = ({
  item,
  maxColumns,
  onUpdateItem,
}) => {
  const handleChange = (key: keyof GridItemPlacement, value: number) => {
    onUpdateItem({
      ...item,
      [key]: Math.max(1, value),
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 p-4">
      <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800/60 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
          <span>🧩</span>
          <span>Item Placement: {item.elementName}</span>
        </span>
        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
          Max Cols: {maxColumns}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Column Start */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Column Start
          </label>
          <input
            type="number"
            min={1}
            max={maxColumns}
            value={item.columnStart}
            onChange={(e) => handleChange("columnStart", parseInt(e.target.value) || 1)}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>

        {/* Column Span */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Column Span
          </label>
          <input
            type="number"
            min={1}
            max={maxColumns}
            value={item.columnSpan}
            onChange={(e) => handleChange("columnSpan", parseInt(e.target.value) || 1)}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>

        {/* Row Start */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Row Start
          </label>
          <input
            type="number"
            min={1}
            value={item.rowStart}
            onChange={(e) => handleChange("rowStart", parseInt(e.target.value) || 1)}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>

        {/* Row Span */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Row Span
          </label>
          <input
            type="number"
            min={1}
            value={item.rowSpan}
            onChange={(e) => handleChange("rowSpan", parseInt(e.target.value) || 1)}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>
      </div>
    </div>
  );
};
