import React from "react";
import { useGlobalElements } from "../hooks/useGlobalElements";
import { GlobalElementFormModal } from "./GlobalElementFormModal";
import { DeleteGlobalElementConfirmModal } from "./DeleteGlobalElementConfirmModal";

interface GlobalElementsPanelProps {
  onInsertGlobalElement?: (globalElementId: string) => void;
}

export const GlobalElementsPanel: React.FC<GlobalElementsPanelProps> = ({
  onInsertGlobalElement,
}) => {
  const {
    filteredGlobalElements,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    editingGlobalElement,
    setEditingGlobalElement,
    deletingGlobalElement,
    setDeletingGlobalElement,
    isFormOpen,
    setIsFormOpen,
    createGlobalElement,
    updateGlobalElement,
    deleteGlobalElement,
  } = useGlobalElements();

  const handleFormSubmit = async (payload: any) => {
    if (editingGlobalElement) {
      await updateGlobalElement(editingGlobalElement.id, payload);
    } else {
      await createGlobalElement(payload);
    }
  };

  return (
    <div className="flex flex-col flex-1 space-y-4">
      {/* Header & Create Action */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🌐</span>
            <span>GLOBAL ELEMENTS LIBRARY</span>
          </h3>
          <button
            type="button"
            onClick={() => {
              setEditingGlobalElement(null);
              setIsFormOpen(true);
            }}
            className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition flex items-center gap-1.5 cursor-pointer"
            aria-label="Create Global Element"
          >
            <span>+</span>
            <span>Create Global Element</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Global Elements..."
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 pl-8"
          />
          <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <span>Loading Global Elements...</span>
        </div>
      ) : filteredGlobalElements.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-6">
          <span className="text-3xl mb-2">🌐</span>
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            {searchQuery ? "No Global Elements found" : "No Global Elements Yet"}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mt-1">
            {searchQuery
              ? `No elements matched "${searchQuery}". Try a different keyword.`
              : "Global Elements let you define reusable website elements once and sync updates across pages."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => {
                setEditingGlobalElement(null);
                setIsFormOpen(true);
              }}
              className="mt-4 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition cursor-pointer"
            >
              + Create First Global Element
            </button>
          )}
        </div>
      ) : (
        /* Global Elements Cards Grid */
        <div className="grid grid-cols-1 gap-3">
          {filteredGlobalElements.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs hover:border-purple-400 dark:hover:border-purple-600 transition space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      {item.name}
                    </span>
                    <span className="text-[9px] font-bold text-purple-700 bg-purple-100 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 uppercase">
                      {item.elementType}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Used by 3 instances
                </span>
              </div>

              {/* Element Preview Pill */}
              <div className="text-[11px] p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-300 truncate">
                {item.content || `<${item.elementType} />`}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                <button
                  type="button"
                  onClick={() => onInsertGlobalElement?.(item.id)}
                  className="rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2.5 py-1 font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white transition cursor-pointer"
                >
                  + Insert Instance
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGlobalElement(item);
                      setIsFormOpen(true);
                    }}
                    className="font-semibold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                  >
                    Edit
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setDeletingGlobalElement(item)}
                    className="font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      <GlobalElementFormModal
        isOpen={isFormOpen}
        elementToEdit={editingGlobalElement}
        onClose={() => {
          setIsFormOpen(false);
          setEditingGlobalElement(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteGlobalElementConfirmModal
        isOpen={Boolean(deletingGlobalElement)}
        element={deletingGlobalElement}
        usageCount={3}
        onClose={() => setDeletingGlobalElement(null)}
        onConfirmDelete={async (id) => {
          await deleteGlobalElement(id);
          setDeletingGlobalElement(null);
        }}
      />
    </div>
  );
};
