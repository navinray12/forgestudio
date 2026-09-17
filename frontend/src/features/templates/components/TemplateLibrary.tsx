import React, { useState } from "react";
import type { Template } from "../types/template.types";
import { TEMPLATE_CATEGORIES } from "../types/template.types";
import { useTemplateLibrary } from "../hooks/useTemplateLibrary";
import { TemplateCard } from "./TemplateCard";
import { TemplatePreviewModal } from "./TemplatePreviewModal";
import { GlobalWidgetLibrary } from "../../global-widget/components/GlobalWidgetLibrary";
import { SaveGlobalWidgetDialog } from "../../global-widget/components/SaveGlobalWidgetDialog";
import { WebsiteKitLibrary } from "../../website-kits/components/WebsiteKitLibrary";
import { RenameTemplateDialog } from "./RenameTemplateDialog";
import { DeleteTemplateConfirmDialog } from "./DeleteTemplateConfirmDialog";
import { ShareTemplateDialog } from "./ShareTemplateDialog";
import { ImportTemplateDialog } from "./ImportTemplateDialog";
import { TransferTemplateDialog } from "./TransferTemplateDialog";
import { exportTemplateAsJson } from "../utils/templateExport";
import { sanitizeAndRegenerateElementIds } from "../utils/templateValidation";
import { saveAsTemplate } from "../services/templateService";

interface TemplateLibraryProps {
  apiUrl: string;
  onInsertTemplate: (template: Template) => void;
  onOpenSaveTemplate?: () => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  apiUrl,
  onInsertTemplate,
  onOpenSaveTemplate,
}) => {
  const {
    templates,
    filteredTemplates,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    pendingFavoriteIds,
    toggleFavoriteItem,
    toggleShareItem,
    previewTemplate,
    openPreview,
    closePreview,
    renameTemplateItem,
    deleteTemplateItem,
    importTemplateItem,
    duplicateTemplateItem,
    refetchTemplates,
  } = useTemplateLibrary({ apiUrl });

  const [renameModalTemplate, setRenameModalTemplate] = useState<Template | null>(null);
  const [deleteModalTemplate, setDeleteModalTemplate] = useState<Template | null>(null);
  const [shareModalTemplate, setShareModalTemplate] = useState<Template | null>(null);
  const [transferModalTemplate, setTransferModalTemplate] = useState<Template | null>(null);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isSaveGlobalWidgetOpen, setIsSaveGlobalWidgetOpen] = useState<boolean>(false);

  const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);
  const [exportErrorNotice, setExportErrorNotice] = useState<string | null>(null);

  const handleConfirmTransfer = async (
    template: Template,
    _targetWebsiteId: string,
    targetWebsiteName: string
  ) => {
    const rawElements = template.templateData?.elements || [];
    const safeElements = sanitizeAndRegenerateElementIds(rawElements);
    const safePageSettings = JSON.parse(JSON.stringify(template.templateData?.pageSettings || {}));

    await saveAsTemplate(apiUrl, {
      name: `${template.name} (Transferred)`,
      description: template.description || "",
      type: template.type || "PAGE",
      category: template.category || "Other",
      templateData: {
        elements: safeElements,
        pageSettings: safePageSettings,
      },
    });

    refetchTemplates();
    setExportSuccessNotice(`Template "${template.name}" transferred to website project "${targetWebsiteName}" successfully!`);
    setTimeout(() => setExportSuccessNotice(null), 4000);
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const duplicated = await duplicateTemplateItem(template);
      setExportSuccessNotice(`Template "${template.name}" duplicated successfully as "${duplicated.name}".`);
      setTimeout(() => setExportSuccessNotice(null), 3500);
    } catch (err: any) {
      setExportErrorNotice("Unable to duplicate this template.");
      setTimeout(() => setExportErrorNotice(null), 3500);
    }
  };

  const handleExportTemplate = (template: Template) => {

    try {
      exportTemplateAsJson(template);
      setExportSuccessNotice(`Template "${template.name}" exported successfully.`);
      setTimeout(() => setExportSuccessNotice(null), 3000);
    } catch (err: any) {
      setExportErrorNotice("Unable to export this template.");
      setTimeout(() => setExportErrorNotice(null), 3000);
    }
  };

  const handleSaveRename = async (templateId: string, name: string, description?: string, category?: string) => {
    await renameTemplateItem(templateId, name, description, category);
  };

  const handleConfirmDelete = async (templateId: string) => {
    await deleteTemplateItem(templateId);
  };

  const handleToggleShare = async (templateId: string, isShared: boolean) => {
    const updated = await toggleShareItem(templateId, isShared);
    setShareModalTemplate(updated);
    return updated;
  };

  const categoryFilterList = [
    { id: "ALL", label: "All" },
    { id: "WEBSITE_KIT", label: "📦 Website Kits" },
    { id: "GLOBAL_WIDGET", label: "🌐 Global Widgets" },
    { id: "PRO", label: "👑 Pro Templates" },
    { id: "FAVORITES", label: "⭐ Favorites" },
    { id: "POPUP", label: "💬 Popup Templates" },
    ...TEMPLATE_CATEGORIES.map((cat) => ({ id: cat, label: cat })),
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header & Actions */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>📚</span>
              <span>Template Library</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              {templates.length} Saved
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {onOpenSaveTemplate && (
              <button
                type="button"
                onClick={onOpenSaveTemplate}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition shadow-2xs cursor-pointer"
                aria-label="Create popup template"
                title="Create Popup Template"
              >
                <span>💬</span>
                <span>+ Popup</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition shadow-2xs cursor-pointer"
              aria-label="Import template file"
              title="Import Template"
            >
              <span>📥</span>
              <span>Import</span>
            </button>
          </div>
        </div>

        {/* Temporary Export Feedback Toast */}
        {exportSuccessNotice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 animate-in fade-in duration-150 flex items-center gap-2">
            <span>✓</span>
            <span>{exportSuccessNotice}</span>
          </div>
        )}
        {exportErrorNotice && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 animate-in fade-in duration-150 flex items-center gap-2">
            <span>⚠️</span>
            <span>{exportErrorNotice}</span>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-8 pr-7 text-xs font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition shadow-xs"
            aria-label="Search templates input"
          />
          <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1 max-h-28 overflow-y-auto pr-1">
          {categoryFilterList.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                selectedCategory.toLowerCase() === cat.id.toLowerCase()
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Body States */}
      <div className="flex-1 overflow-y-auto pr-0.5 space-y-3">
        {/* Dedicated Website Kits Tab View */}
        {selectedCategory === "WEBSITE_KIT" && (
          <WebsiteKitLibrary
            apiUrl={apiUrl}
            onKitApplied={() => {
              // Trigger template refetch if needed
              refetchTemplates();
            }}
          />
        )}

        {/* Dedicated Global Widgets Tab View */}
        {selectedCategory === "GLOBAL_WIDGET" && (
          <GlobalWidgetLibrary
            apiUrl={apiUrl}
            onInsertWidget={(widget) =>
              onInsertTemplate({
                id: widget.id,
                userId: widget.userId,
                name: widget.name,
                description: widget.description,
                type: "GLOBAL_WIDGET",
                category: widget.category,
                templateData: { elements: widget.elements, pageSettings: {} },
                createdAt: widget.createdAt,
                updatedAt: widget.updatedAt,
              })
            }
            onOpenSaveDialog={() => setIsSaveGlobalWidgetOpen(true)}
          />
        )}

        {/* Loading State */}
        {selectedCategory !== "GLOBAL_WIDGET" && selectedCategory !== "WEBSITE_KIT" && isLoading && (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 w-full animate-pulse rounded-xl bg-slate-100 border border-slate-200 p-3 flex flex-col justify-between"
              >
                <div className="h-16 w-full rounded-lg bg-slate-200/80" />
                <div className="h-3 w-3/4 rounded bg-slate-200/80 mt-2" />
                <div className="h-3 w-1/2 rounded bg-slate-200/80" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-center space-y-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h4 className="text-xs font-bold text-rose-900">Unable to load templates.</h4>
              <p className="text-[11px] text-rose-600 mt-1 font-medium">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={refetchTemplates}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-xs cursor-pointer"
            >
              <span>🔄</span>
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Global Empty State (User has no saved templates at all) */}
        {!isLoading && !error && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center py-10 space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 text-2xl shadow-xs">
              🧱
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">No templates yet</h4>
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                Save a design as a template or import a template file to use it here.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
              >
                Import Template File
              </button>
              {onOpenSaveTemplate && (
                <button
                  type="button"
                  onClick={onOpenSaveTemplate}
                  className="rounded-xl border border-purple-600 bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition cursor-pointer"
                >
                  Save Current Design
                </button>
              )}
            </div>
          </div>
        )}

        {/* Favorites Empty State (Requirement 8: No favorite templates) */}
        {!isLoading && !error && templates.length > 0 && selectedCategory === "FAVORITES" && filteredTemplates.length === 0 && !searchQuery.trim() && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50/50 p-6 text-center py-8 space-y-2">
            <span className="text-3xl text-amber-500">⭐</span>
            <h4 className="text-xs font-bold text-slate-800">No favorite templates yet</h4>
            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
              Mark templates as favorites to quickly find them here.
            </p>
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className="mt-1 text-xs font-bold text-purple-600 hover:underline cursor-pointer"
            >
              View All Templates
            </button>
          </div>
        )}

        {/* Popup Empty State */}
        {!isLoading && !error && selectedCategory === "POPUP" && filteredTemplates.length === 0 && !searchQuery.trim() && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50/50 p-6 text-center py-8 space-y-3">
            <span className="text-3xl">💬</span>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">No popup templates yet.</h4>
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                Create a popup template to reuse it across your website.
              </p>
            </div>
            {onOpenSaveTemplate && (
              <button
                type="button"
                onClick={onOpenSaveTemplate}
                className="mt-1 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>💬</span>
                <span>+ Create Popup</span>
              </button>
            )}
          </div>
        )}

        {/* Pro Templates Empty State */}
        {!isLoading && !error && selectedCategory === "PRO" && filteredTemplates.length === 0 && !searchQuery.trim() && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-amber-300 bg-amber-50/60 p-6 text-center py-8 space-y-2">
            <span className="text-3xl">👑</span>
            <h4 className="text-xs font-bold text-slate-800">No Pro Templates available.</h4>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Check back soon for new curated premium templates.
            </p>
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className="mt-1 text-xs font-bold text-purple-600 hover:underline cursor-pointer"
            >
              View All Templates
            </button>
          </div>
        )}

        {/* Category Empty State */}
        {!isLoading && !error && templates.length > 0 && selectedCategory !== "FAVORITES" && selectedCategory !== "PRO" && selectedCategory !== "POPUP" && selectedCategory !== "ALL" && filteredTemplates.length === 0 && !searchQuery.trim() && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/60 p-6 text-center py-8 space-y-2">
            <span className="text-2xl">📂</span>
            <h4 className="text-xs font-bold text-slate-800">No templates in this category</h4>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Try another category or import a new template.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
              >
                Show All Templates
              </button>
            </div>
          </div>
        )}

        {/* Search Empty State */}
        {!isLoading && !error && templates.length > 0 && filteredTemplates.length === 0 && searchQuery.trim() !== "" && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center py-8 space-y-2">
            <span className="text-2xl">🔍</span>
            <h4 className="text-xs font-bold text-slate-800">
              {selectedCategory === "PRO" ? "No Pro Templates found." : "No templates found"}
            </h4>
            <p className="text-[11px] text-slate-500">
              No template matched your search "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
              }}
              className="text-xs font-bold text-purple-600 hover:underline pt-1 cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Templates Grid List */}
        {!isLoading && !error && filteredTemplates.length > 0 && (
          <div className="space-y-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={openPreview}
                onInsert={onInsertTemplate}
                onShare={(tmpl) => setShareModalTemplate(tmpl)}
                onExport={handleExportTemplate}
                onDuplicate={handleDuplicateTemplate}
                onTransfer={(tmpl) => setTransferModalTemplate(tmpl)}
                onToggleFavorite={(tmpl) => toggleFavoriteItem(tmpl.id)}
                isPendingFavorite={pendingFavoriteIds.has(template.id)}
                onRename={(tmpl) => setRenameModalTemplate(tmpl)}
                onDelete={(tmpl) => setDeleteModalTemplate(tmpl)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        onClose={closePreview}
        onInsert={onInsertTemplate}
      />

      {/* F-328 Import Template Dialog */}
      <ImportTemplateDialog
        isOpen={isImportOpen}
        existingTemplateNames={templates.map((t) => t.name)}
        onClose={() => setIsImportOpen(false)}
        onImport={importTemplateItem}
      />

      {/* F-337 Transfer Template Dialog */}
      <TransferTemplateDialog
        isOpen={Boolean(transferModalTemplate)}
        template={transferModalTemplate}
        apiUrl={apiUrl}
        onClose={() => setTransferModalTemplate(null)}
        onTransfer={handleConfirmTransfer}
      />

      {/* F-327 Share Template Dialog */}
      <ShareTemplateDialog
        isOpen={Boolean(shareModalTemplate)}
        template={shareModalTemplate}
        onClose={() => setShareModalTemplate(null)}
        onToggleShare={handleToggleShare}
      />

      {/* F-324 / F-325 Rename & Edit Template Dialog */}
      <RenameTemplateDialog
        isOpen={Boolean(renameModalTemplate)}
        template={renameModalTemplate}
        onClose={() => setRenameModalTemplate(null)}
        onSave={handleSaveRename}
      />

      {/* Save Global Widget Dialog */}
      <SaveGlobalWidgetDialog
        isOpen={isSaveGlobalWidgetOpen}
        isSaving={false}
        onClose={() => setIsSaveGlobalWidgetOpen(false)}
        onSave={async (name, desc, elems) => {
          try {
            await saveAsTemplate(apiUrl, {
              name,
              description: desc,
              type: "GLOBAL_WIDGET",
              category: "Global Widget",
              templateData: { elements: elems, pageSettings: {} },
            });
            setIsSaveGlobalWidgetOpen(false);
            refetchTemplates();
          } catch (e) {
            // Error handled inside dialog
          }
        }}
      />

      {/* F-324 Delete Template Confirmation Dialog */}
      <DeleteTemplateConfirmDialog
        isOpen={Boolean(deleteModalTemplate)}
        template={deleteModalTemplate}
        onClose={() => setDeleteModalTemplate(null)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};
