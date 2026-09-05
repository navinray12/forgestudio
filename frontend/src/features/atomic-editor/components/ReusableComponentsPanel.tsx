import React, { useState } from "react";
import type { ReusableComponentDefinition } from "../types/reusableComponents.types";
import { useReusableComponents } from "../hooks/useReusableComponents";
import { ReusableComponentFormModal } from "./ReusableComponentFormModal";
import { DeleteComponentConfirmModal } from "./DeleteComponentConfirmModal";
import { ControlledComponentEditor } from "./ControlledComponentEditor";
import { ComponentPropertyLockModal } from "./ComponentPropertyLockModal";
import { useControlledComponent } from "../hooks/useControlledComponent";

interface ReusableComponentsPanelProps {
  onInsertComponent?: (componentId: string) => void;
}

export const ReusableComponentsPanel: React.FC<ReusableComponentsPanelProps> = ({
  onInsertComponent,
}) => {
  const {
    filteredComponents,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    editingComponent,
    setEditingComponent,
    deletingComponent,
    setDeletingComponent,
    isFormOpen,
    setIsFormOpen,
    createComponent,
    updateComponent,
    duplicateComponent,
    deleteComponent,
  } = useReusableComponents();

  const [activeInstanceComponent, setActiveInstanceComponent] = useState<ReusableComponentDefinition | null>(null);

  const {
    allowedKeys,
    isLockModalOpen,
    setIsLockModalOpen,
    updateLockSettings,
  } = useControlledComponent(activeInstanceComponent);

  const handleFormSubmit = async (payload: any) => {
    if (editingComponent) {
      await updateComponent(editingComponent.id, payload);
    } else {
      await createComponent(payload);
    }
  };

  if (activeInstanceComponent) {
    return (
      <div className="flex flex-col flex-1 space-y-4">
        <ControlledComponentEditor
          component={activeInstanceComponent}
          onBack={() => setActiveInstanceComponent(null)}
        />
        <ComponentPropertyLockModal
          isOpen={isLockModalOpen}
          component={activeInstanceComponent}
          allowedKeys={allowedKeys}
          onClose={() => setIsLockModalOpen(false)}
          onSave={updateLockSettings}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 space-y-4">
      {/* Header & Create Action */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🧩</span>
            <span>REUSABLE COMPONENTS</span>
          </h3>
          <button
            type="button"
            onClick={() => {
              setEditingComponent(null);
              setIsFormOpen(true);
            }}
            className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition flex items-center gap-1.5 cursor-pointer"
            aria-label="Create Component"
          >
            <span>+</span>
            <span>Create Component</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
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
          <span>Loading Reusable Components...</span>
        </div>
      ) : filteredComponents.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-6">
          <span className="text-3xl mb-2">🧩</span>
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            {searchQuery ? "No Reusable Components found" : "No Reusable Components Yet"}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mt-1">
            {searchQuery
              ? `No components matched "${searchQuery}". Try a different search.`
              : "Reusable components let you save multi-element UI structures and reuse them across your website."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => {
                setEditingComponent(null);
                setIsFormOpen(true);
              }}
              className="mt-4 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition cursor-pointer"
            >
              + Create First Component
            </button>
          )}
        </div>
      ) : (
        /* Component Cards Grid */
        <div className="grid grid-cols-1 gap-3">
          {filteredComponents.map((item) => (
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
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      {item.elementCount} elements
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Used by 6 instances
                </span>
              </div>

              {/* Tree Snippet Preview */}
              <div className="text-[11px] p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
                  <span>📦 {item.rootElement.name}</span>
                </div>
                {item.rootElement.children?.slice(0, 2).map((child) => (
                  <div key={child.id} className="pl-3 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span>└─ {child.name}</span>
                    <span className="font-mono text-[9px] text-slate-400">({child.type})</span>
                  </div>
                ))}
                {item.rootElement.children && item.rootElement.children.length > 2 && (
                  <div className="pl-3 text-[9px] text-slate-400 italic">
                    + {item.rootElement.children.length - 2} more child elements
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onInsertComponent?.(item.id)}
                    className="rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-1 font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white transition cursor-pointer"
                  >
                    + Insert
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInstanceComponent(item)}
                    className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 font-bold text-slate-700 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-purple-900 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>🎛️</span>
                    <span>Instance Editor</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingComponent(item);
                      setIsFormOpen(true);
                    }}
                    className="font-semibold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                  >
                    Edit
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => duplicateComponent(item.id)}
                    className="font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 cursor-pointer"
                  >
                    Duplicate
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setDeletingComponent(item)}
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

      {/* Form Modal */}
      <ReusableComponentFormModal
        isOpen={isFormOpen}
        componentToEdit={editingComponent}
        onClose={() => {
          setIsFormOpen(false);
          setEditingComponent(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteComponentConfirmModal
        isOpen={Boolean(deletingComponent)}
        component={deletingComponent}
        usageCount={6}
        onClose={() => setDeletingComponent(null)}
        onConfirmDelete={async (id) => {
          await deleteComponent(id);
          setDeletingComponent(null);
        }}
      />
    </div>
  );
};

