import React from "react";
import type { LoopContainerConfig, LoopDataItem } from "../types/atomicLoop.types";
import { evaluateDynamicField } from "../utils/loopData.utils";

interface LoopPreviewProps {
  loop: LoopContainerConfig;
  items: LoopDataItem[];
}

export const LoopPreview: React.FC<LoopPreviewProps> = ({ loop, items }) => {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
        <span className="text-2xl">📭</span>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {loop.emptyStateText}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <span>🔁</span>
          <span>Live Rendered Loop Results ({items.length} Items)</span>
        </span>
        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold uppercase">
          Source: {loop.dataSourceType}
        </span>
      </div>

      {/* Grid of collection items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {items.map((item, index) => {
          return (
            <div
              key={item.id || index}
              className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3 space-y-2 hover:border-purple-300 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{item.image || "📦"}</span>
                <span className="rounded-full bg-purple-100 dark:bg-purple-950 px-2 py-0.5 text-[9px] font-mono font-bold text-purple-700 dark:text-purple-300">
                  Item #{index + 1}
                </span>
              </div>

              {/* Dynamic bindings */}
              {loop.template.bindings.map((b, i) => {
                const evaluated = evaluateDynamicField(
                  item,
                  b.itemPropertyKey,
                  b.staticPrefix,
                  b.staticSuffix
                );

                if (b.elementKey === "title") {
                  return (
                    <h4 key={i} className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {evaluated}
                    </h4>
                  );
                }

                if (b.elementKey === "price") {
                  return (
                    <p key={i} className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {evaluated}
                    </p>
                  );
                }

                return (
                  <p key={i} className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {evaluated}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
