import React, { useState, useRef, useEffect } from "react";
import type { CreateTemplatePayload, Template } from "../types/template.types";
import { validateAndSanitizeTemplateFile } from "../utils/templateValidation";

interface ImportTemplateDialogProps {
  isOpen: boolean;
  existingTemplateNames: string[];
  onClose: () => void;
  onImport: (payload: CreateTemplatePayload) => Promise<Template>;
}

export const ImportTemplateDialog: React.FC<ImportTemplateDialogProps> = ({
  isOpen,
  existingTemplateNames,
  onClose,
  onImport,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedPayload, setValidatedPayload] = useState<CreateTemplatePayload | null>(null);
  const [previewSummary, setPreviewSummary] = useState<{
    name: string;
    type: string;
    category: string;
    elementCount: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setValidationError(null);
      setValidatedPayload(null);
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
    setValidatedPayload(null);
    setPreviewSummary(null);

    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      setValidationError("This template file is not supported.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = validateAndSanitizeTemplateFile(content, existingTemplateNames);

      if (!result.isValid || !result.payload) {
        setValidationError(result.error || "Invalid template file.");
      } else {
        setValidatedPayload(result.payload);
        setPreviewSummary(result.summary || null);
      }
    };

    reader.onerror = () => {
      setValidationError("Invalid template file.");
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

  const handleImportSubmit = async () => {
    if (!validatedPayload || isImporting) return;

    setIsImporting(true);
    setValidationError(null);

    try {
      await onImport(validatedPayload);
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || "Unable to import this template.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-template-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700 text-lg">
              📥
            </span>
            <h3 id="import-template-dialog-title" className="text-base font-bold text-slate-900">
              IMPORT TEMPLATE
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
            aria-label="Close import dialog"
          >
            ✕
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-slate-500 font-medium">
          Upload a supported template file to add it to your Template Library.
        </p>

        {/* Validation Error Alert */}
        {validationError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium leading-relaxed">
            ⚠️ {validationError}
          </div>
        )}

        {/* Drag & Drop Upload Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isImporting && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
            isDragOver
              ? "border-purple-500 bg-purple-50/70"
              : selectedFile
              ? "border-slate-300 bg-slate-50/60"
              : "border-slate-200 bg-slate-50/40 hover:border-purple-400 hover:bg-purple-50/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            disabled={isImporting}
            className="hidden"
            aria-label="Upload template file"
          />

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-purple-600 shadow-xs mb-2 text-xl">
            📂
          </div>
          <p className="text-xs font-bold text-slate-700">
            Drag & Drop Template
          </p>
          <p className="text-[11px] text-slate-400 my-1 font-medium">or</p>
          <button
            type="button"
            disabled={isImporting}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
          >
            Choose File
          </button>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">
            Supported format: .json
          </p>
        </div>

        {/* Selected File & Validated Preview Info */}
        {selectedFile && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 border-b border-slate-200/60 pb-2">
              <span className="truncate max-w-[200px]" title={selectedFile.name}>
                📄 {selectedFile.name}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  validatedPayload
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {validatedPayload ? "Ready to Import ✓" : "Invalid File ✗"}
              </span>
            </div>

            {previewSummary && (
              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Template Name:</span>
                  <span className="font-bold text-slate-800">{previewSummary.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <span className="font-semibold text-purple-700">{previewSummary.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Elements Count:</span>
                  <span className="font-mono text-slate-800">{previewSummary.elementCount}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={!validatedPayload || isImporting}
            className="rounded-xl border border-purple-600 bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isImporting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Importing template...</span>
              </>
            ) : (
              <span>Import Template</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
