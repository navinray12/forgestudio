import React, { useState } from "react";
import type { LoopContainerConfig, LoopDataSourceType } from "../types/atomicLoop.types";
import { validateStaticDataJson } from "../utils/loopValidation.utils";

interface LoopDataSourceSelectorProps {
  loop: LoopContainerConfig;
  onUpdateLoop: (updated: Partial<LoopContainerConfig>) => void;
}

export const LoopDataSourceSelector: React.FC<LoopDataSourceSelectorProps> = ({
  loop,
  onUpdateLoop,
}) => {
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonChange = (raw: string) => {
    const val = validateStaticDataJson(raw);
    if (!val.isValid) {
      setJsonError(val.error || "Invalid JSON array.");
    } else {
      setJsonError(null);
    }
    onUpdateLoop({ staticDataJson: raw });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <span>🗄️</span>
          <span>Data Source Configuration</span>
        </span>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          Collection Source
        </label>
        <select
          value={loop.dataSourceType}
          onChange={(e) => onUpdateLoop({ dataSourceType: e.target.value as LoopDataSourceType })}
          className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
        >
          <option value="cms_products">CMS Products Collection (Sample)</option>
          <option value="cms_blog">CMS Blog Articles Collection (Sample)</option>
          <option value="static">Static JSON Dataset (Custom Array)</option>
        </select>
      </div>

      {loop.dataSourceType === "static" && (
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Static JSON Array</span>
            {jsonError && <span className="text-[10px] text-red-500 font-bold">{jsonError}</span>}
          </label>
          <textarea
            rows={5}
            value={loop.staticDataJson || `[\n  { "title": "Item 1", "price": "$10" },\n  { "title": "Item 2", "price": "$20" }\n]`}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-3 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>
      )}
    </div>
  );
};
