import React from "react";
import type { LoopContainerConfig } from "../types/atomicLoop.types";

interface LoopItemSettingsProps {
  loop: LoopContainerConfig;
  onUpdateLoop: (updated: Partial<LoopContainerConfig>) => void;
}

export const LoopItemSettings: React.FC<LoopItemSettingsProps> = ({
  loop,
  onUpdateLoop,
}) => {
  return (
    <div className="space-y-3.5 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800/60 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
          <span>⚙️</span>
          <span>Loop & Template Settings</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Collection Items Limit */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Items to Display Limit
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={loop.itemsLimit || 3}
            onChange={(e) => onUpdateLoop({ itemsLimit: Number(e.target.value) || 1 })}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>

        {/* Empty State Text */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Empty State Text
          </label>
          <input
            type="text"
            value={loop.emptyStateText}
            onChange={(e) => onUpdateLoop({ emptyStateText: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>
      </div>
    </div>
  );
};
