import React, { useState, useRef } from "react";
import type { VariableType, CreateVariablePayload } from "../types/variables.types";
import type { ExportedVariableItem, VariableConflictItem } from "../types/variableExportImport.types";
import { useVariables } from "../hooks/useVariables";
import { copyVariableReference } from "../utils/variable.utils";
import { exportVariablesToJson, parseAndValidateVariablesJson, detectVariableConflicts } from "../utils/variableExportImport.utils";
import { VariableFormModal } from "./VariableFormModal";
import { DeleteVariableConfirmModal } from "./DeleteVariableConfirmModal";
import { ImportVariablesModal } from "./ImportVariablesModal";

const TYPE_PILLS: Array<{ id: VariableType | "All"; label: string }> = [
  { id: "All", label: "All" },
  { id: "color", label: "Color 🎨" },
  { id: "font", label: "Font 🔤" },
  { id: "spacing", label: "Spacing 📐" },
  { id: "number", label: "Size 🔢" },
];

export const VariablesPanel: React.FC = () => {
  const {
    variables,
    filteredVariables,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    editingVariable,
    setEditingVariable,
    deletingVariable,
    setDeletingVariable,
    isFormOpen,
    setIsFormOpen,
    createVariable,
    updateVariable,
    deleteVariable,
  } = useVariables();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importNewItems, setImportNewItems] = useState<ExportedVariableItem[]>([]);
  const [importConflicts, setImportConflicts] = useState<VariableConflictItem[]>([]);

  const handleCopyRef = async (key: string) => {
    const success = await copyVariableReference(key);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleExport = () => {
    if (variables.length === 0) {
      setImportError("No variables available to export.");
      setTimeout(() => setImportError(null), 3000);
      return;
    }
    exportVariablesToJson(variables);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseAndValidateVariablesJson(content);
      if (!res.isValid || !res.payload) {
        setImportError(res.error || "Invalid Variables file.");
        return;
      }

      const { newItems, conflicts } = detectVariableConflicts(res.payload.variables, variables);
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
    itemsToCreate: CreateVariablePayload[],
    itemsToReplace: { id: string; payload: CreateVariablePayload }[]
  ) => {
    for (const item of itemsToCreate) {
      await createVariable(item);
    }
    for (const rep of itemsToReplace) {
      await updateVariable(rep.id, rep.payload);
    }
  };

  const handleFormSubmit = async (payload: {
    name: string;
    type: VariableType;
    value: string;
    description?: string;
  }) => {
    if (editingVariable) {
      await updateVariable(editingVariable.id, payload);
    } else {
      await createVariable(payload);
    }
  };

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

      {/* Top Action & Search */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🎨</span>
            <span>VARIABLES MANAGEMENT</span>
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
              title="Import variables from JSON file"
            >
              <span>📥</span>
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
              title="Export variables to JSON file"
            >
              <span>📤</span>
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingVariable(null);
                setIsFormOpen(true);
              }}
              className="rounded-xl bg-purple-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition flex items-center gap-1 cursor-pointer ml-auto"
              aria-label="Create variable"
            >
              <span>+</span>
              <span>Create</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search variables..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-8 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 shadow-2xs"
            aria-label="Search variables"
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

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TYPE_PILLS.map((pill) => {
            const isActive = selectedType === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedType(pill.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Copy Toast Indicator */}
      {copiedKey && (
        <div className="rounded-xl border border-purple-300 bg-purple-50 dark:bg-purple-950/60 p-2.5 text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2 animate-in fade-in shadow-2xs">
          <span>📋</span>
          <span>Copied reference <code className="font-mono text-purple-700 dark:text-purple-300">var({copiedKey})</code> to clipboard!</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Loading variables...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Empty State when no variables */}
      {!isLoading && !error && variables.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-6 text-center py-10 space-y-3">
          <span className="text-3xl">🎨</span>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No variables yet.</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
            Create reusable design tokens for colors, typography, and spacing.
          </p>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition cursor-pointer"
          >
            + Create First Variable
          </button>
        </div>
      )}

      {/* Search Empty State */}
      {!isLoading && !error && variables.length > 0 && filteredVariables.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-6 text-center py-8 space-y-2">
          <span className="text-2xl">🔍</span>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No variables found.</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            No variable matched "{searchQuery}".
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedType("All");
            }}
            className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Variables Card List */}
      {!isLoading && !error && filteredVariables.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 overflow-y-auto max-h-[500px] pr-0.5">
          {filteredVariables.map((v) => (
            <div
              key={v.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3 shadow-2xs transition hover:border-purple-300 dark:hover:border-purple-700 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {v.name}
                    </h4>
                    <span className="rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                      {v.type}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                    {v.key}
                  </p>
                </div>

                {/* Value Swatch / Badge */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {v.type === "color" && (
                    <span
                      className="h-5 w-5 rounded-full border border-slate-300 dark:border-slate-600 shadow-2xs"
                      style={{ backgroundColor: v.value }}
                      title={v.value}
                    />
                  )}
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                    {v.value}
                  </span>
                </div>
              </div>

              {v.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                  {v.description}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleCopyRef(v.key)}
                  className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  title="Copy var() reference"
                >
                  <span>📋</span>
                  <span>Copy var()</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVariable(v);
                      setIsFormOpen(true);
                    }}
                    className="font-semibold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                  >
                    Edit
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setDeletingVariable(v)}
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

      {/* Import Error Banner */}
      {importError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          ⚠️ {importError}
        </div>
      )}

      {/* Form Modal */}
      <VariableFormModal
        isOpen={isFormOpen}
        variableToEdit={editingVariable}
        onClose={() => {
          setIsFormOpen(false);
          setEditingVariable(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteVariableConfirmModal
        isOpen={Boolean(deletingVariable)}
        variable={deletingVariable}
        onClose={() => setDeletingVariable(null)}
        onConfirmDelete={async (id) => {
          await deleteVariable(id);
        }}
      />

      {/* Import Variables Preview & Conflict Modal */}
      <ImportVariablesModal
        isOpen={isImportModalOpen}
        newItems={importNewItems}
        initialConflicts={importConflicts}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImport={handleConfirmImport}
      />
    </div>
  );
};
