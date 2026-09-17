import React, { useState } from "react";
import type { PageConfig, NavMenuItem, SitePartsConfig } from "../types";
import {
  generateSlug,
  validateSlug,
  duplicatePage,
  checkPageReferences,
  safeDeletePage,
} from "../utils/pageManagerService";

interface PageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageConfig[];
  activePageId: string;
  homePageId: string;
  onSwitchPage: (pageId: string) => void;
  onUpdatePages: (updatedPages: PageConfig[], newHomePageId?: string) => void;
  navigation?: NavMenuItem[];
  siteParts?: SitePartsConfig;
}

export const PageManagerModal: React.FC<PageManagerModalProps> = ({
  isOpen,
  onClose,
  pages,
  activePageId,
  homePageId,
  onSwitchPage,
  onUpdatePages,
  navigation = [],
  siteParts,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [createError, setCreateError] = useState("");

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editError, setEditError] = useState("");

  const [deleteWarningPage, setDeleteWarningPage] = useState<{
    page: PageConfig;
    references: string[];
  } | null>(null);

  if (!isOpen) return null;

  const filteredPages = pages.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartCreate = () => {
    setIsCreatingPage(true);
    setNewPageName("");
    setNewPageSlug("");
    setCreateError("");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawName = newPageName.trim();
    if (!rawName) {
      setCreateError("Page name is required.");
      return;
    }

    const initialSlug = newPageSlug.trim() || generateSlug(rawName, pages.map((p) => p.slug));
    const validation = validateSlug(initialSlug, pages);

    if (!validation.isValid) {
      setCreateError(validation.error || "Invalid slug.");
      return;
    }

    const newId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPage: PageConfig = {
      id: newId,
      name: rawName,
      slug: validation.slug,
      isHome: pages.length === 0,
      elements: [],
      pageSettings: {
        title: rawName,
        path: validation.slug,
        description: "",
      },
      customCss: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...pages, newPage];
    onUpdatePages(updated);
    setIsCreatingPage(false);
    onSwitchPage(newId);
  };

  const handleStartEdit = (page: PageConfig) => {
    setEditingPageId(page.id);
    setEditName(page.name);
    setEditSlug(page.slug);
    setEditError("");
  };

  const handleSaveEdit = (pageId: string) => {
    const rawName = editName.trim();
    if (!rawName) {
      setEditError("Page name cannot be empty.");
      return;
    }

    const isCurrentHome = pageId === homePageId;
    let targetSlug = editSlug.trim();

    // Home page slug can be "/"
    if (isCurrentHome && (targetSlug === "/" || targetSlug === "")) {
      targetSlug = "/";
    } else {
      const validation = validateSlug(targetSlug, pages, pageId);
      if (!validation.isValid) {
        setEditError(validation.error || "Invalid slug.");
        return;
      }
      targetSlug = validation.slug;
    }

    const updated = pages.map((p) => {
      if (p.id === pageId) {
        return {
          ...p,
          name: rawName,
          slug: targetSlug,
          pageSettings: {
            ...(p.pageSettings || {}),
            title: rawName,
            path: targetSlug,
          },
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    onUpdatePages(updated);
    setEditingPageId(null);
  };

  const handleSetHome = (pageId: string) => {
    const updated = pages.map((p) => ({
      ...p,
      isHome: p.id === pageId,
      slug: p.id === pageId ? "/" : p.slug === "/" ? generateSlug(p.name, pages.filter(x => x.id !== p.id).map(x => x.slug)) : p.slug,
    }));
    onUpdatePages(updated, pageId);
  };

  const handleDuplicate = (page: PageConfig) => {
    const duplicated = duplicatePage(page, pages);
    const updated = [...pages, duplicated];
    onUpdatePages(updated);
  };

  const handlePromptDelete = (page: PageConfig) => {
    if (pages.length <= 1) {
      alert("Cannot delete the only remaining page.");
      return;
    }

    const refCheck = checkPageReferences(page.id, pages, navigation, siteParts);
    if (refCheck.count > 0 || page.id === homePageId) {
      setDeleteWarningPage({
        page,
        references: [
          ...(page.id === homePageId ? ["⚠️ This is currently the Home page. Another page will become the new Home page."] : []),
          ...refCheck.descriptions,
        ],
      });
      return;
    }

    // Direct safe delete if no references
    executeDelete(page.id);
  };

  const executeDelete = (pageId: string) => {
    const res = safeDeletePage(pageId, pages, homePageId);
    if (!res.success) {
      alert(res.error || "Failed to delete page.");
      return;
    }

    onUpdatePages(res.updatedPages, res.newHomePageId);
    if (activePageId === pageId) {
      onSwitchPage(res.newHomePageId);
    }
    setDeleteWarningPage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold">
              📄
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Manage Website Pages</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {pages.length} {pages.length === 1 ? "page" : "pages"}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Create, rename, duplicate, reorder, or delete pages in your website.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-slate-800 bg-slate-900/50">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search pages by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-blue-500 transition"
            />
          </div>
          <button
            type="button"
            onClick={handleStartCreate}
            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 flex items-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
          >
            <span>+</span>
            <span>New Page</span>
          </button>
        </div>

        {/* Create Page inline drawer */}
        {isCreatingPage && (
          <form onSubmit={handleCreateSubmit} className="border-b border-slate-800 bg-blue-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300">✨ Add New Website Page</span>
              <button
                type="button"
                onClick={() => setIsCreatingPage(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Page Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pricing, Blog, Services"
                  value={newPageName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewPageName(val);
                    if (!newPageSlug || newPageSlug === generateSlug(newPageName, pages.map(p => p.slug))) {
                      setNewPageSlug(generateSlug(val, pages.map(p => p.slug)));
                    }
                  }}
                  autoFocus
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Slug / Route</label>
                <input
                  type="text"
                  placeholder="/pricing"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
            {createError && <p className="text-xs font-semibold text-red-400">{createError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingPage(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm"
              >
                Create Page
              </button>
            </div>
          </form>
        )}

        {/* Pages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredPages.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              No pages match "{searchQuery}".
            </div>
          ) : (
            filteredPages.map((page) => {
              const isHome = page.id === homePageId || page.isHome || page.slug === "/";
              const isActive = page.id === activePageId;
              const isEditing = editingPageId === page.id;

              return (
                <div
                  key={page.id}
                  className={`rounded-xl border transition p-3.5 flex items-center justify-between gap-3 ${
                    isActive
                      ? "border-blue-500/50 bg-blue-950/20 shadow-xs"
                      : "border-slate-800 bg-slate-800/40 hover:bg-slate-800/70"
                  }`}
                >
                  {isEditing ? (
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white"
                          placeholder="Page Name"
                        />
                        <input
                          type="text"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          disabled={isHome}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-mono text-white disabled:opacity-50"
                          placeholder="/slug"
                        />
                      </div>
                      {editError && <p className="text-[11px] text-red-400">{editError}</p>}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(page.id)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPageId(null)}
                          className="px-2.5 py-1 rounded border border-slate-700 text-slate-300 text-[11px] hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-lg shrink-0">{isHome ? "🏠" : "📄"}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white truncate">{page.name}</span>
                          {isHome && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                              ★ Home
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
                              Editing Now
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                          <span>{page.slug}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-[10px] font-sans text-slate-400">
                            {page.elements?.length || 0} {(page.elements?.length || 0) === 1 ? "element" : "elements"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchPage(page.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                          title="Open and edit this page"
                        >
                          Edit Canvas
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartEdit(page)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Rename page or edit slug"
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(page)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Duplicate page"
                      >
                        ⧉
                      </button>

                      {!isHome && (
                        <button
                          type="button"
                          onClick={() => handleSetHome(page.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                          title="Set as Home page (/)"
                        >
                          ★
                        </button>
                      )}

                      {pages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handlePromptDelete(page)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition"
                          title="Delete page"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Modal / Warning Drawer */}
        {deleteWarningPage && (
          <div className="border-t border-red-900/60 bg-red-950/40 p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
              <span>⚠️</span>
              <span>Confirm Page Deletion: "{deleteWarningPage.page.name}"</span>
            </div>
            {deleteWarningPage.references.length > 0 && (
              <div className="rounded-lg bg-black/40 border border-red-900/40 p-2.5 space-y-1">
                <span className="text-[11px] font-bold text-red-200">
                  This page has {deleteWarningPage.references.length} incoming reference(s):
                </span>
                <ul className="list-disc list-inside text-[10px] text-red-300 space-y-0.5">
                  {deleteWarningPage.references.map((ref, idx) => (
                    <li key={idx}>{ref}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[11px] text-red-200">
              Are you sure you want to permanently delete this page? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteWarningPage(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDelete(deleteWarningPage.page.id)}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md"
              >
                Delete Page
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950/60 px-6 py-3 flex items-center justify-between text-xs text-slate-400">
          <span>💡 Tip: Click ★ to assign any page as the Home page.</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-1.5 font-bold text-white hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
