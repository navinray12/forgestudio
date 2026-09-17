import React from "react";
import { useAtomicEditor } from "../hooks/useAtomicEditor";
import { AtomicEditorNavigation } from "./AtomicEditorNavigation";
import { AtomicEditorContent } from "./AtomicEditorContent";

interface AtomicEditorProps {
  onClose?: () => void;
  onInsertGlobalElement?: (globalElementId: string) => void;
  onInsertComponent?: (componentId: string) => void;
}

export const AtomicEditor: React.FC<AtomicEditorProps> = ({
  onClose,
  onInsertGlobalElement,
  onInsertComponent,
}) => {
  const {
    sections,
    activeSection,
    setActiveSection,
    currentSectionConfig,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
  } = useAtomicEditor();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/80 dark:bg-slate-900/80">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚛️</span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
            ATOMIC EDITOR
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Atomic Editor"
          >
            ✕
          </button>
        )}
      </div>

      {/* Section Navigation Tabs */}
      <AtomicEditorNavigation
        sections={sections}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />

      {/* Main Section Content */}
      <AtomicEditorContent
        sectionConfig={currentSectionConfig}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLoading={isLoading}
        error={error}
        onInsertGlobalElement={onInsertGlobalElement}
        onInsertComponent={onInsertComponent}
      />
    </div>
  );
};
