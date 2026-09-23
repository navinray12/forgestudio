import React from "react";
import type { AtomicSectionConfig } from "../types/atomicEditor.types";
import { VariablesPanel } from "./VariablesPanel";
import { ClassesPanel } from "./ClassesPanel";
import { GlobalElementsPanel } from "./GlobalElementsPanel";
import { ReusableComponentsPanel } from "./ReusableComponentsPanel";
import { AtomicGridPanel } from "./AtomicGridPanel";
import { AtomicFormPanel } from "./AtomicFormPanel";
import { AtomicLoopPanel } from "./AtomicLoopPanel";

interface AtomicEditorContentProps {
  sectionConfig: AtomicSectionConfig;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onInsertGlobalElement?: (globalElementId: string) => void;
  onInsertComponent?: (componentId: string) => void;
}

export const AtomicEditorContent: React.FC<AtomicEditorContentProps> = ({
  sectionConfig,
  searchQuery,
  onSearchChange,
  isLoading,
  error,
  onInsertGlobalElement,
  onInsertComponent,
}) => {
  if (sectionConfig.id === "variables") {
    return (
      <div className="flex flex-col flex-1 p-4 overflow-hidden">
        <VariablesPanel />
      </div>
    );
  }

  if (sectionConfig.id === "classes") {
    return (
      <div className="flex flex-col flex-1 p-4 overflow-hidden">
        <ClassesPanel />
      </div>
    );
  }

  if (sectionConfig.id === "global-elements") {
    return (
      <div className="flex flex-col flex-1 p-4 overflow-hidden">
        <GlobalElementsPanel onInsertGlobalElement={onInsertGlobalElement} />
      </div>
    );
  }

  if (sectionConfig.id === "components") {
    return (
      <div className="flex flex-col flex-1 p-4 overflow-hidden">
        <ReusableComponentsPanel onInsertComponent={onInsertComponent} />
      </div>
    );
  }

  if (sectionConfig.id === "grid") {
    return (
      <div className="flex flex-col flex-1 p-4 overflow-hidden">
        <AtomicGridPanel />
      </div>
    );
  }

  if (sectionConfig.id === "forms") {
    return (
      <div className="flex flex-col flex-1 p-4 overflow-hidden">
        <AtomicFormPanel />
      </div>
    );
  }

  if (sectionConfig.id === "loops") {
    return (
      <div className="flex flex-col flex-1 p-4 overflow-hidden">
        <AtomicLoopPanel />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 space-y-4 p-4">
      {/* Section Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{sectionConfig.icon}</span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
            {sectionConfig.label}
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {sectionConfig.description}
        </p>
      </div>

      {/* Search / Filter Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Search ${sectionConfig.label.toLowerCase()}...`}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-8 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 shadow-2xs"
          aria-label={`Search ${sectionConfig.label.toLowerCase()}`}
        />
        <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Loading Atomic Editor...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Clean Foundation Empty State */}
      {!isLoading && !error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-6 text-center py-10 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 text-2xl shadow-xs">
            {sectionConfig.icon}
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              No items available yet.
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              The Atomic Editor foundation for <strong>{sectionConfig.label}</strong> is active and ready for system design tokens.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
