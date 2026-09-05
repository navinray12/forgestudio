import React from "react";
import type { GridContainerConfig, GridBreakpoint } from "../types/atomicGrid.types";

interface GridSettingsProps {
  grid: GridContainerConfig;
  breakpoint: GridBreakpoint;
  onBreakpointChange: (bp: GridBreakpoint) => void;
  onUpdateGrid: (payload: Partial<GridContainerConfig>) => void;
}

export const GridSettings: React.FC<GridSettingsProps> = ({
  grid,
  breakpoint,
  onBreakpointChange,
  onUpdateGrid,
}) => {
  const currentResp = grid.responsive[breakpoint] || {
    columns: grid.columns,
    columnGap: grid.columnGap,
    rowGap: grid.rowGap,
  };

  const handleRespChange = (key: keyof typeof currentResp, value: any) => {
    const updatedResp = {
      ...grid.responsive,
      [breakpoint]: {
        ...currentResp,
        [key]: value,
      },
    };
    onUpdateGrid({
      responsive: updatedResp,
      ...(breakpoint === "desktop" ? { [key]: value } : {}),
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
      {/* Breakpoint Switcher */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          Responsive View
        </span>
        <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-1">
          {(["desktop", "tablet", "mobile"] as GridBreakpoint[]).map((bp) => (
            <button
              key={bp}
              type="button"
              onClick={() => onBreakpointChange(bp)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold capitalize transition cursor-pointer ${
                breakpoint === bp
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-purple-600"
              }`}
            >
              {bp === "desktop" ? "🖥️ Desktop" : bp === "tablet" ? "📱 Tablet" : "📲 Mobile"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Container Controls */}
      <div className="grid grid-cols-2 gap-3">
        {/* Columns Count */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Columns ({breakpoint})
          </label>
          <input
            type="number"
            min={1}
            max={12}
            value={currentResp.columns}
            onChange={(e) => handleRespChange("columns", Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>

        {/* Column Gap */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Column Gap
          </label>
          <input
            type="text"
            value={currentResp.columnGap}
            onChange={(e) => handleRespChange("columnGap", e.target.value)}
            placeholder="e.g. 16px"
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>

        {/* Row Gap */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Row Gap
          </label>
          <input
            type="text"
            value={currentResp.rowGap}
            onChange={(e) => handleRespChange("rowGap", e.target.value)}
            placeholder="e.g. 16px"
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>

        {/* Alignment */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Align Items
          </label>
          <select
            value={grid.alignItems}
            onChange={(e) => onUpdateGrid({ alignItems: e.target.value as any })}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="stretch">Stretch</option>
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
          </select>
        </div>
      </div>
    </div>
  );
};
