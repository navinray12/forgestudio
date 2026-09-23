import React, { useState } from "react";
import { useAtomicLoop } from "../hooks/useAtomicLoop";
import { LoopPreview } from "./LoopPreview";
import { LoopDataSourceSelector } from "./LoopDataSourceSelector";
import { LoopItemSettings } from "./LoopItemSettings";

export const AtomicLoopPanel: React.FC = () => {
  const {
    filteredLoops,
    activeLoop,
    activeLoopItems,
    setActiveLoop,
    createLoop,
    updateActiveLoop,
    deleteLoop,
  } = useAtomicLoop();

  const [newLoopName, setNewLoopName] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoopName.trim()) return;
    await createLoop({ name: newLoopName.trim() });
    setNewLoopName("");
    setIsCreating(false);
  };

  return (
    <div className="flex flex-col flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <span>🔁</span>
          <span>ATOMIC LOOPS SYSTEM</span>
        </h3>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition flex items-center gap-1 cursor-pointer"
        >
          <span>+</span>
          <span>Create Loop</span>
        </button>
      </div>

      {/* Inline Create Input */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="flex items-center gap-2 p-3 rounded-xl border border-purple-300 bg-purple-50/50 dark:bg-purple-950/30">
          <input
            type="text"
            required
            value={newLoopName}
            onChange={(e) => setNewLoopName(e.target.value)}
            placeholder="Loop Name e.g. Team Members Grid"
            className="flex-1 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-700 cursor-pointer"
          >
            Save Loop
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Loop selector dropdown */}
      <div className="flex items-center gap-2">
        <select
          value={activeLoop?.id || ""}
          onChange={(e) => {
            const found = filteredLoops.find((l) => l.id === e.target.value);
            if (found) {
              setActiveLoop(found);
            }
          }}
          className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
        >
          {filteredLoops.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.dataSourceType})
            </option>
          ))}
        </select>
        {activeLoop && (
          <button
            type="button"
            onClick={() => deleteLoop(activeLoop.id)}
            className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white transition cursor-pointer"
          >
            Delete
          </button>
        )}
      </div>

      {activeLoop ? (
        <div className="space-y-4">
          {/* Live Preview */}
          <LoopPreview loop={activeLoop} items={activeLoopItems} />

          {/* Data Source Selector */}
          <LoopDataSourceSelector loop={activeLoop} onUpdateLoop={updateActiveLoop} />

          {/* Item & Limit Settings */}
          <LoopItemSettings loop={activeLoop} onUpdateLoop={updateActiveLoop} />
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-slate-400">
          No Loops available. Click "+ Create Loop" to begin.
        </div>
      )}
    </div>
  );
};
