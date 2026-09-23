import React, { useState, useRef, useEffect } from "react";
import { validateAndSanitizeWebsiteKitFile } from "../utils/websiteKitValidation";

interface ImportWebsiteKitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportKit: (kitData: {
    website: { name: string; description?: string; settings?: Record<string, any> };
    pages: Array<{
      id: string;
      title: string;
      path: string;
      elements: any[];
      pageSettings: Record<string, any>;
    }>;
    templates: any[];
  }) => void;
}

export const ImportWebsiteKitDialog: React.FC<ImportWebsiteKitDialogProps> = ({
  isOpen,
  onClose,
  onImportKit,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedKit, setValidatedKit] = useState<any | null>(null);
  const [previewSummary, setPreviewSummary] = useState<{
    websiteName: string;
    pageCount: number;
    elementCount: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setValidationError(null);
      setValidatedKit(null);
      setPreviewSummary(null);
      setIsImporting(false);
      setIsDragOver(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === "Escape" && !isImporting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isImporting, onClose]);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    setSelectedFile(file);
    setValidationError(null);
    setValidatedKit(null);
    setPreviewSummary(null);

    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      setValidationError("The selected file is not a valid Website Kit JSON file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = validateAndSanitizeWebsiteKitFile(content);

      if (!result.isValid || !result.websiteKit) {
        setValidationError(result.error || "The selected file is not a valid Website Kit.");
      } else {
        setValidatedKit(result.websiteKit);
        setPreviewSummary(result.summary || null);
      }
    };

    reader.onerror = () => {
      setValidationError("Failed to read the Website Kit file.");
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!validatedKit || isImporting) return;

    setIsImporting(true);
    try {
      onImportKit(validatedKit);
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || "Unable to import Website Kit.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-website-kit-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-lg">
              📦
            </span>
            <h3 id="import-website-kit-dialog-title" className="text-base font-bold">
              IMPORT WEBSITE KIT
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
            aria-label="Close import website kit dialog"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Upload a portable Website Kit JSON file to restore website pages, layout elements, global styles, and templates.
        </p>

        {/* Validation Error Alert */}
        {validationError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
            ⚠️ {validationError}
          </div>
        )}

        {/* Drag & Drop Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isImporting && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
            isDragOver
              ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40"
              : selectedFile
              ? "border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40"
              : "border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20 hover:border-blue-400 hover:bg-blue-50/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            disabled={isImporting}
            className="hidden"
            aria-label="Upload Website Kit file"
          />

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs mb-2 text-xl">
            📂
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Drag & Drop Website Kit JSON
          </p>
          <p className="text-[11px] text-slate-400 my-1 font-medium">or</p>
          <button
            type="button"
            disabled={isImporting}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
          >
            Choose File
          </button>
        </div>

        {/* Validated Summary Info */}
        {selectedFile && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
              <span className="truncate max-w-[200px]" title={selectedFile.name}>
                📄 {selectedFile.name}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  validatedKit
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                }`}
              >
                {validatedKit ? "Valid Kit ✓" : "Invalid File ✗"}
              </span>
            </div>

            {previewSummary && (
              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Website Name:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{previewSummary.websiteName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Pages Count:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{previewSummary.pageCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Elements Count:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{previewSummary.elementCount}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={!validatedKit || isImporting}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isImporting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Importing Kit...</span>
              </>
            ) : (
              <span>Import Website Kit</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
