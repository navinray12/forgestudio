import React from "react";
import type { AtomicEditorSection, AtomicSectionConfig } from "../types/atomicEditor.types";

interface AtomicEditorNavigationProps {
  sections: AtomicSectionConfig[];
  activeSection: AtomicEditorSection;
  onSelectSection: (section: AtomicEditorSection) => void;
}

export const AtomicEditorNavigation: React.FC<AtomicEditorNavigationProps> = ({
  sections,
  activeSection,
  onSelectSection,
}) => {
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-1.5 overflow-x-auto no-scrollbar">
      {sections.map((sec) => {
        const isActive = activeSection === sec.id;
        return (
          <button
            key={sec.id}
            type="button"
            onClick={() => onSelectSection(sec.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              isActive
                ? "bg-purple-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
            aria-label={`Select ${sec.label} section`}
            aria-selected={isActive}
          >
            <span>{sec.icon}</span>
            <span>{sec.label}</span>
          </button>
        );
      })}
    </div>
  );
};
