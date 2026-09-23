import React, { useState } from "react";
import type { ExportedVariableItem, VariableConflictItem, ConflictResolutionMode } from "../types/variableExportImport.types";
import type { CreateVariablePayload } from "../types/variables.types";

interface ImportVariablesModalProps {
  isOpen: boolean;
  newItems: ExportedVariableItem[];
  initialConflicts: VariableConflictItem[];
  onClose: () => void;
  onConfirmImport: (
    itemsToCreate: CreateVariablePayload[],
    itemsToReplace: { id: string; payload: CreateVariablePayload }[]
  ) => Promise<void>;
}

export const ImportVariablesModal: React.FC<ImportVariablesModalProps> = ({
  isOpen,
  newItems,
  initialConflicts,
  onClose,
  onConfirmImport,
}) => {
  const [conflicts, setConflicts] = useState<VariableConflictItem[]>(initialConflicts);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const updateConflictResolution = (index: number, mode: ConflictResolutionMode) => {
    setConflicts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], resolution: mode };
      return copy;
    });
  };

  const handleConfirm = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const itemsToCreate: CreateVariablePayload[] = [];
      const itemsToReplace: { id: string; payload: CreateVariablePayload }[] = [];

      // 1. Add new items
      for (const item of newItems) {
        itemsToCreate.push({
          name: item.name,
          key: item.key,
          value: item.value,
          type: item.type,
          description: item.description,
        });
      }

      // 2. Process conflicts according to chosen strategy
      for (const c of conflicts) {
        if (c.resolution === "keep_existing") {
          // Skip imported item
          continue;
        } else if (c.resolution === "replace_existing" && c.existingItem) {
          itemsToReplace.push({
            id: c.existingItem.id,
            payload: {
              name: c.importedItem.name,
              key: c.importedItem.key,
              value: c.importedItem.value,
              type: c.importedItem.type,
              description: c.importedItem.description,
            },
          });
        } else if (c.resolution === "create_new") {
          itemsToCreate.push({
            name: `${c.importedItem.name} (Imported)`,
            key: `${c.importedItem.key}-imported`,
            value: c.importedItem.value,
            type: c.importedItem.type,
            description: c.importedItem.description,
          });
        }
      }

      await onConfirmImport(itemsToCreate, itemsToReplace);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to import variables.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 id="import-modal-title" className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>📥</span>
            <span>IMPORT VARIABLES PREVIEW</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">New</span>
            <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{newItems.length}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Conflicts</span>
            <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{conflicts.length}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Total File</span>
            <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{newItems.length + conflicts.length}</p>
          </div>
        </div>

        {/* New Variables List */}
        {newItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>✓ Ready to Import ({newItems.length})</span>
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950/40">
              {newItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-none">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{item.name}</span>
                    <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400">--{item.key}</span>
                  </div>
                  <span className="font-mono text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflict Resolution Section */}
        {conflicts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>⚠ Conflicts Detected ({conflicts.length})</span>
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 bg-amber-50/30 dark:bg-amber-950/20">
              {conflicts.map((c, idx) => (
                <div key={idx} className="space-y-1.5 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{c.importedItem.name}</span>
                    <span className="font-mono text-[10px] text-purple-600">--{c.importedItem.key}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
                    <div>Existing: <span className="text-slate-700 dark:text-slate-300 font-bold">{c.existingItem?.value}</span></div>
                    <div>Imported: <span className="text-purple-600 font-bold">{c.importedItem.value}</span></div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => updateConflictResolution(idx, "replace_existing")}
                      className={`flex-1 py-1 text-[10px] font-bold rounded cursor-pointer transition ${
                        c.resolution === "replace_existing"
                          ? "bg-amber-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Replace Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => updateConflictResolution(idx, "keep_existing")}
                      className={`flex-1 py-1 text-[10px] font-bold rounded cursor-pointer transition ${
                        c.resolution === "keep_existing"
                          ? "bg-slate-700 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Keep Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => updateConflictResolution(idx, "create_new")}
                      className={`flex-1 py-1 text-[10px] font-bold rounded cursor-pointer transition ${
                        c.resolution === "create_new"
                          ? "bg-purple-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Create as New
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Confirm & Import</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
