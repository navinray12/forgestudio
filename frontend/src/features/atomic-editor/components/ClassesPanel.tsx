import React, { useState, useRef } from "react";
import type { CreateClassPayload } from "../types/classes.types";
import type { ExportedClassItem, ClassConflictItem } from "../types/classExportImport.types";
import { useClasses } from "../hooks/useClasses";
import { exportClassesToJson, parseAndValidateClassesJson, detectClassConflicts } from "../utils/classExportImport.utils";
import { ClassFormModal } from "./ClassFormModal";
import { DeleteClassConfirmModal } from "./DeleteClassConfirmModal";
import { ImportClassesModal } from "./ImportClassesModal";

export const ClassesPanel: React.FC = () => {
  const {
    classes,
    filteredClasses,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    activeScopeFilter,
    setActiveScopeFilter,
    editingClass,
    setEditingClass,
    deletingClass,
    setDeletingClass,
    isFormOpen,
    setIsFormOpen,
    defaultIsGlobal,
    setDefaultIsGlobal,
    createClass,
    updateClass,
    deleteClass,
  } = useClasses();

  const [importError, setImportError] = useState<string | null>(null);

  // Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importNewItems, setImportNewItems] = useState<ExportedClassItem[]>([]);
  const [importConflicts, setImportConflicts] = useState<ClassConflictItem[]>([]);

  const handleExport = () => {
    if (classes.length === 0) {
      setImportError("No classes available to export.");
      setTimeout(() => setImportError(null), 3000);
      return;
    }
    exportClassesToJson(classes);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseAndValidateClassesJson(content);
      if (!res.isValid || !res.payload) {
        setImportError(res.error || "Invalid Classes file.");
        return;
      }

      const { newItems, conflicts } = detectClassConflicts(res.payload.classes, classes);
      setImportNewItems(newItems);
      setImportConflicts(conflicts);
      setIsImportModalOpen(true);
    };

    reader.onerror = () => {
      setImportError("Failed to read file.");
    };

    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirmImport = async (
    itemsToCreate: CreateClassPayload[],
    itemsToReplace: { id: string; payload: CreateClassPayload }[]
  ) => {
    for (const item of itemsToCreate) {
      await createClass(item);
    }
    for (const rep of itemsToReplace) {
      await updateClass(rep.id, rep.payload);
    }
  };

  const handleFormSubmit = async (payload: {
    name: string;
    styles: Record<string, any>;
    description?: string;
    isGlobal: boolean;
  }) => {
    if (editingClass) {
      await updateClass(editingClass.id, payload);
    } else {
      await createClass(payload);
    }
  };

  const globalClassesCount = classes.filter((c) => c.isGlobal || c.scope === "global").length;
  const localClassesCount = classes.filter((c) => !c.isGlobal && c.scope !== "global").length;

  return (
    <div className="flex flex-col flex-1 space-y-4">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Header & Main Actions */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🏷️</span>
            <span>CLASSES MANAGEMENT</span>
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
              title="Import classes from JSON file"
            >
              <span>📥</span>
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
              title="Export classes to JSON file"
            >
              <span>📤</span>
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingClass(null);
                setDefaultIsGlobal(activeScopeFilter === "global" ? true : activeScopeFilter === "local" ? false : true);
                setIsFormOpen(true);
              }}
              className="rounded-xl bg-purple-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition flex items-center gap-1 cursor-pointer ml-auto"
              aria-label="Create Class"
            >
              <span>+</span>
              <span>Create</span>
            </button>
          </div>
        </div>

        {/* Scope Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveScopeFilter("all")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
              activeScopeFilter === "all"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            All ({classes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveScopeFilter("global")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center flex items-center justify-center gap-1 cursor-pointer ${
              activeScopeFilter === "global"
                ? "bg-purple-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span>🌐 Global</span>
            <span className="text-[10px] opacity-80">({globalClassesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveScopeFilter("local")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center flex items-center justify-center gap-1 cursor-pointer ${
              activeScopeFilter === "local"
                ? "bg-slate-800 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span>🏠 Local</span>
            <span className="text-[10px] opacity-80">({localClassesCount})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeScopeFilter === "global" ? "Search global classes..." : "Search classes..."}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-8 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 shadow-2xs"
            aria-label="Search classes"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Loading classes...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && classes.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-6 text-center py-10 space-y-3">
          <span className="text-3xl">🌐</span>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No Global Classes yet.</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            Create site-wide Global Classes for buttons, hero typography, headings, and elevated cards.
          </p>
          <button
            type="button"
            onClick={() => {
              setDefaultIsGlobal(true);
              setIsFormOpen(true);
            }}
            className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition cursor-pointer"
          >
            + Create First Global Class
          </button>
        </div>
      )}

      {/* Search Empty State */}
      {!isLoading && !error && classes.length > 0 && filteredClasses.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-6 text-center py-8 space-y-2">
          <span className="text-2xl">🔍</span>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {activeScopeFilter === "global" ? "No Global Classes found." : "No classes found."}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {searchQuery ? `No class matched "${searchQuery}".` : "No classes in this scope filter."}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Class Cards List */}
      {!isLoading && !error && filteredClasses.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 overflow-y-auto max-h-[500px] pr-0.5">
          {filteredClasses.map((c) => {
            const isGlob = Boolean(c.isGlobal || c.scope === "global");
            const definedRulesCount = Object.keys(c.styles || {}).filter(
              (k) => (c.styles as any)[k] !== undefined
            ).length;

            return (
              <div
                key={c.id}
                className={`flex flex-col justify-between rounded-xl border p-3 shadow-2xs transition space-y-2 ${
                  isGlob
                    ? "border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/30 to-white dark:from-purple-950/20 dark:to-slate-900 hover:border-purple-400"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {c.name}
                      </h4>
                      {isGlob ? (
                        <span className="rounded-full bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 px-2 py-0.5 text-[9px] font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-0.5">
                          <span>🌐</span>
                          <span>Global Class</span>
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                          🏠 Local
                        </span>
                      )}
                      <span className="rounded-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                        {definedRulesCount} rule{definedRulesCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                      .{c.key}
                    </p>
                  </div>

                  {/* Assigned Elements Badge */}
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                    Used by {c.assignedCount || 0} element{c.assignedCount === 1 ? "" : "s"}
                  </span>
                </div>

                {c.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                    {c.description}
                  </p>
                )}

                {/* Style Rule Badges Preview */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {c.styles.backgroundColor && (
                    <span className="flex items-center gap-1 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-mono text-slate-600 dark:text-slate-400">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-slate-300"
                        style={{ backgroundColor: c.styles.backgroundColor }}
                      />
                      {c.styles.backgroundColor}
                    </span>
                  )}
                  {c.styles.fontSize && (
                    <span className="text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-mono text-slate-600 dark:text-slate-400">
                      fontSize: {c.styles.fontSize}
                    </span>
                  )}
                  {c.styles.padding && (
                    <span className="text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-mono text-slate-600 dark:text-slate-400">
                      padding: {c.styles.padding}
                    </span>
                  )}
                  {c.styles.borderRadius && (
                    <span className="text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-mono text-slate-600 dark:text-slate-400">
                      radius: {c.styles.borderRadius}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClass(c);
                      setIsFormOpen(true);
                    }}
                    className="font-semibold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                  >
                    Edit
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setDeletingClass(c)}
                    className="font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import Error Banner */}
      {importError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          ⚠️ {importError}
        </div>
      )}

      {/* Form Modal */}
      <ClassFormModal
        isOpen={isFormOpen}
        classToEdit={editingClass}
        defaultIsGlobal={defaultIsGlobal}
        onClose={() => {
          setIsFormOpen(false);
          setEditingClass(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteClassConfirmModal
        isOpen={Boolean(deletingClass)}
        atomicClass={deletingClass}
        onClose={() => setDeletingClass(null)}
        onConfirmDelete={async (id) => {
          await deleteClass(id);
        }}
      />

      {/* Import Classes Preview & Conflict Modal */}
      <ImportClassesModal
        isOpen={isImportModalOpen}
        newItems={importNewItems}
        initialConflicts={importConflicts}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImport={handleConfirmImport}
      />
    </div>
  );
};
