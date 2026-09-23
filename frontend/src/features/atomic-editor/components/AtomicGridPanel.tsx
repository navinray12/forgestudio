import React, { useState } from "react";
import { useAtomicGrid } from "../hooks/useAtomicGrid";
import { GridVisualizer } from "./GridVisualizer";
import { GridSettings } from "./GridSettings";
import { GridItemSettings } from "./GridItemSettings";
import type { GridItemPlacement } from "../types/atomicGrid.types";

export const AtomicGridPanel: React.FC = () => {
  const {
    filteredGrids,
    activeGrid,
    setActiveGrid,
    activeBreakpoint,
    setActiveBreakpoint,
    createGrid,
    updateActiveGrid,
    deleteGrid,
  } = useAtomicGrid();

  const [selectedItem, setSelectedItem] = useState<GridItemPlacement | null>(null);
  const [newGridName, setNewGridName] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGridName.trim()) return;
    await createGrid({ name: newGridName.trim(), columns: 3 });
    setNewGridName("");
    setIsCreating(false);
  };

  const handleUpdateItem = (updatedItem: GridItemPlacement) => {
    if (!activeGrid) return;
    const updatedItems = activeGrid.items.map((it) => (it.id === updatedItem.id ? updatedItem : it));
    updateActiveGrid({ items: updatedItems });
    setSelectedItem(updatedItem);
  };

  return (
    <div className="flex flex-col flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <span>📐</span>
          <span>ATOMIC GRID LAYOUT SYSTEM</span>
        </h3>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition flex items-center gap-1 cursor-pointer"
        >
          <span>+</span>
          <span>Create Grid</span>
        </button>
      </div>

      {/* Inline Create Input */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="flex items-center gap-2 p-3 rounded-xl border border-purple-300 bg-purple-50/50 dark:bg-purple-950/30">
          <input
            type="text"
            required
            value={newGridName}
            onChange={(e) => setNewGridName(e.target.value)}
            placeholder="Grid Layout Name e.g. Hero 4-Column Grid"
            className="flex-1 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-700 cursor-pointer"
          >
            Save Grid
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

      {/* Grid selector dropdown */}
      <div className="flex items-center gap-2">
        <select
          value={activeGrid?.id || ""}
          onChange={(e) => {
            const found = filteredGrids.find((g) => g.id === e.target.value);
            if (found) {
              setActiveGrid(found);
              setSelectedItem(null);
            }
          }}
          className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
        >
          {filteredGrids.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.columns} Cols)
            </option>
          ))}
        </select>
        {activeGrid && (
          <button
            type="button"
            onClick={() => deleteGrid(activeGrid.id)}
            className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white transition cursor-pointer"
          >
            Delete
          </button>
        )}
      </div>

      {activeGrid ? (
        <div className="space-y-4">
          {/* Visual Overlay */}
          <GridVisualizer
            grid={activeGrid}
            breakpoint={activeBreakpoint}
            selectedItemId={selectedItem?.id}
            onSelectItem={(it) => setSelectedItem(it)}
          />

          {/* Item Placement Controls when an item is selected */}
          {selectedItem && (
            <GridItemSettings
              item={selectedItem}
              maxColumns={activeGrid.responsive[activeBreakpoint]?.columns || activeGrid.columns}
              onUpdateItem={handleUpdateItem}
            />
          )}

          {/* Grid Container Settings */}
          <GridSettings
            grid={activeGrid}
            breakpoint={activeBreakpoint}
            onBreakpointChange={setActiveBreakpoint}
            onUpdateGrid={updateActiveGrid}
          />
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-slate-400">
          No Grid layouts available. Click "+ Create Grid" to begin.
        </div>
      )}
    </div>
  );
};
