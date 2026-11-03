import React, { useRef, useEffect } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Monitor,
  Tablet,
  Smartphone,
  Undo,
  Redo,
  History as HistoryIcon,
  Copy,
  Layers,
  Search,
  Sparkles,
  Palette,
  FileText,
  MessageSquare,
  Code2,
  Eye,
  Rocket,
  Save,
  RefreshCw,
} from "lucide-react";
import type { DeviceMode, ThemeBuilderScope } from "../types";
import { AutosaveStatusIndicator, type AutosaveStatus } from "../../../features/autosave";

export interface EditorHeaderToolbarProps {
  websiteName?: string;
  themeMode?: "light" | "dark";
  onQuitEditor: () => void;
  // Pages & Scope
  pages: Array<{ id: string; name: string; slug: string }>;
  activePageId: string;
  homePageId: string;
  onSwitchPage: (pageId: string) => void;
  onOpenPageManager: () => void;
  isPageSelectorOpen: boolean;
  setIsPageSelectorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  canvasMode: ThemeBuilderScope;
  onSwitchCanvasMode: (mode: ThemeBuilderScope) => void;
  isScopeDropdownOpen: boolean;
  setIsScopeDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  // Viewport Device
  activeDevice: DeviceMode;
  onSelectDevice: (device: DeviceMode) => void;
  // History & Undo/Redo
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenRevisionHistory: () => void;
  // Autosave & Save
  autosaveStatus: AutosaveStatus;
  autosaveLastSavedAt: number | null;
  autosaveError: string | null;
  saveMessage?: string;
  errorMessage?: string;
  isSaving: boolean;
  onSave: () => void;
  // Canvas Theme
  canvasTheme: "light" | "dark";
  onToggleCanvasTheme: () => void;
  // Collaborators
  canvasPeers?: Array<{ socketId: string; user: { name: string; color: string } }>;
  isRestrictedMode?: boolean;
  // Selected Element Quick Actions
  selectedId: string | null;
  onReorderSelected?: (direction: "up" | "down") => void;
  onCopySelected?: (e: React.MouseEvent) => void;
  onDuplicateSelected?: (e: React.MouseEvent) => void;
  onSaveAsComponentSelected?: () => void;
  onReplaceTemplateSelected?: () => void;
  // Preview & Publish
  isPreview: boolean;
  onTogglePreview: () => void;
  onOpenPublishModal: () => void;
  publishingStatus?: string;
  // Tools & Modals
  onOpenFinder: () => void;
  onOpenSeoModal: () => void;
  onOpenVariablesModal: () => void;
  onOpenClassModal: () => void;
  isDesignNotesOpen: boolean;
  onToggleDesignNotes: () => void;
  devModalMode: string | null;
  onToggleDevMode: () => void;
  onOpenExperimentModal: () => void;
  onToggleFullScreenCanvas: () => void;
}

export const EditorHeaderToolbar: React.FC<EditorHeaderToolbarProps> = ({
  websiteName = "ForgeStudio",
  themeMode = "dark",
  onQuitEditor,
  pages,
  activePageId,
  homePageId,
  onSwitchPage,
  onOpenPageManager,
  isPageSelectorOpen,
  setIsPageSelectorOpen,
  canvasMode,
  onSwitchCanvasMode,
  isScopeDropdownOpen,
  setIsScopeDropdownOpen,
  activeDevice,
  onSelectDevice,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenRevisionHistory,
  autosaveStatus,
  autosaveLastSavedAt,
  autosaveError,
  saveMessage,
  errorMessage,
  isSaving,
  onSave,
  canvasTheme,
  onToggleCanvasTheme,
  canvasPeers = [],
  isRestrictedMode = false,
  selectedId,
  onReorderSelected,
  onCopySelected,
  onDuplicateSelected,
  onSaveAsComponentSelected,
  onReplaceTemplateSelected,
  isPreview,
  onTogglePreview,
  onOpenPublishModal,
  publishingStatus,
  onOpenFinder,
  onOpenSeoModal,
  onOpenVariablesModal,
  onOpenClassModal,
  isDesignNotesOpen,
  onToggleDesignNotes,
  devModalMode,
  onToggleDevMode,
  onOpenExperimentModal,
  onToggleFullScreenCanvas,
}) => {
  const scopeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (scopeDropdownRef.current && !scopeDropdownRef.current.contains(event.target as Node)) {
        setIsScopeDropdownOpen(false);
      }
    };
    if (isScopeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isScopeDropdownOpen, setIsScopeDropdownOpen]);

  return (
    <header
      role="banner"
      className={`relative w-full h-13 shrink-0 flex items-center justify-between px-3 md:px-4 shadow-md transition overflow-x-auto ${
        themeMode === "light"
          ? "bg-white border-b border-slate-200 text-slate-800"
          : "bg-[#0b1329] text-white"
      }`}
    >
      {/* 1. Left Region: Back / Project / Page / Scope */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0 min-w-0">
        <button
          type="button"
          onClick={onQuitEditor}
          className="w-8 h-8 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition flex items-center justify-center shadow-sm cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500"
          title="Back to Dashboard"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <span className="text-xs font-bold text-white tracking-wide border-l border-slate-700/80 pl-2.5 hidden sm:inline-block max-w-[90px] md:max-w-[130px] truncate">
          {websiteName}
        </span>

        {/* Page Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsPageSelectorOpen(!isPageSelectorOpen)}
            className="h-8 px-2.5 text-xs font-semibold text-white bg-slate-800/90 hover:bg-slate-700/90 rounded-lg border border-slate-700/80 transition flex items-center gap-1.5 shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Switch Active Page or Manage Site Pages"
            aria-label="Switch Active Page"
            aria-expanded={isPageSelectorOpen}
            aria-haspopup="listbox"
          >
            <span className="text-amber-400 text-xs">📄</span>
            <span className="max-w-[70px] sm:max-w-[110px] truncate font-bold">
              {pages.find((p) => p.id === activePageId)?.name || "Page"}
            </span>
            {homePageId === activePageId && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-bold hidden md:inline">
                Home
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isPageSelectorOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-fadeIn">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                <span>Site Pages</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPageSelectorOpen(false);
                    onOpenPageManager();
                  }}
                  className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer text-[10px]"
                >
                  Manage All ⚙️
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {pages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSwitchPage(p.id);
                      setIsPageSelectorOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition cursor-pointer ${
                      p.id === activePageId ? "bg-blue-600/20 text-blue-300 font-bold" : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{p.id === homePageId ? "🏠" : "📄"}</span>
                      <span className="truncate">{p.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{p.slug}</span>
                  </button>
                ))}
              </div>
              <div className="p-1.5 border-t border-slate-800 bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsPageSelectorOpen(false);
                    onOpenPageManager();
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-blue-400 hover:bg-blue-900/30 rounded-lg flex items-center gap-1.5 transition font-semibold cursor-pointer"
                >
                  <span>➕</span>
                  <span>Add / Manage Pages...</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scope Switcher */}
        <div className="relative" ref={scopeDropdownRef}>
          <button
            type="button"
            onClick={() => setIsScopeDropdownOpen((prev) => !prev)}
            className="h-8 px-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 hover:text-white rounded-lg border border-slate-700/80 transition flex items-center gap-1 shadow-sm cursor-pointer"
            title="Switch Canvas Scope (Page / Header / Footer / Single / Archive / 404 / Search)"
            aria-label="Switch Canvas Scope"
          >
            <span className="text-xs">
              {canvasMode === "page" && "📄"}
              {canvasMode === "header" && "🌐"}
              {canvasMode === "footer" && "🌐"}
              {canvasMode === "single" && "📰"}
              {canvasMode === "archive" && "📚"}
              {canvasMode === "404" && "⚠️"}
              {canvasMode === "search-results" && "🔍"}
            </span>
            <span className="capitalize font-semibold hidden md:inline">
              {canvasMode === "404" ? "404 Page" : canvasMode === "search-results" ? "Search Results" : canvasMode}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isScopeDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-44 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-fadeIn">
              {(
                [
                  { mode: "page", label: "Page Content", icon: "📄" },
                  { mode: "header", label: "Global Header", icon: "🌐" },
                  { mode: "footer", label: "Global Footer", icon: "🌐" },
                  { mode: "single", label: "Single Post Template", icon: "📰" },
                  { mode: "archive", label: "Archive Template", icon: "📚" },
                  { mode: "404", label: "404 Not Found Page", icon: "⚠️" },
                  { mode: "search-results", label: "Search Results Layout", icon: "🔍" },
                ] as const
              ).map(({ mode, label, icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    onSwitchCanvasMode(mode as ThemeBuilderScope);
                    setIsScopeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition cursor-pointer hover:bg-slate-800 ${
                    canvasMode === mode ? "bg-blue-600/20 text-blue-300 font-bold" : "text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span>{label}</span>
                  </div>
                  {canvasMode === mode && <span className="text-blue-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Center Region: Viewport Switcher */}
      <div className="hidden lg:flex items-center justify-center pointer-events-auto">
        <div className="flex items-center gap-0.5 bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/80 shadow-sm">
          <button
            type="button"
            onClick={() => onSelectDevice("desktop")}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition cursor-pointer ${
              activeDevice === "desktop"
                ? "bg-blue-600 text-white shadow-xs font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
            title="Desktop View"
            aria-label="Desktop View"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectDevice("tablet")}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition cursor-pointer ${
              activeDevice === "tablet"
                ? "bg-blue-600 text-white shadow-xs font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
            title="Tablet View"
            aria-label="Tablet View"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectDevice("mobile")}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition cursor-pointer ${
              activeDevice === "mobile"
                ? "bg-blue-600 text-white shadow-xs font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
            title="Mobile View"
            aria-label="Mobile View"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Right Region: Undo/Redo, Autosave, Save Button, Actions */}
      <div className="flex items-center justify-end gap-1.5 md:gap-2 shrink-0">
        {saveMessage && (
          <span className="text-xs font-medium text-emerald-400 shrink-0 hidden xl:inline">
            ✓ {saveMessage}
          </span>
        )}
        {errorMessage && (
          <span className="text-xs font-medium text-red-400 shrink-0 hidden xl:inline">
            {errorMessage}
          </span>
        )}

        {/* History Group */}
        <div className="flex items-center gap-0.5 bg-[#16203a] p-0.5 rounded-lg border border-slate-700/80 shrink-0">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpenRevisionHistory}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition border-l border-slate-700/80 cursor-pointer"
            title="Revision History"
            aria-label="Revision History"
            data-testid="revision-history-button"
          >
            <HistoryIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selected Element Quick Actions */}
        {selectedId && onReorderSelected && (
          <div className="hidden xl:flex items-center gap-0.5 bg-[#16203a] p-0.5 rounded-lg border border-blue-500/40 shrink-0">
            <button
              type="button"
              onClick={() => onReorderSelected("up")}
              className="w-6 h-6 flex items-center justify-center text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
              title="Move Up"
              aria-label="Move Up"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => onReorderSelected("down")}
              className="w-6 h-6 flex items-center justify-center text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
              title="Move Down"
              aria-label="Move Down"
            >
              ▼
            </button>
            {onCopySelected && (
              <button
                type="button"
                onClick={onCopySelected}
                className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
                title="Copy (Ctrl+C)"
                aria-label="Copy Element"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
            {onDuplicateSelected && (
              <button
                type="button"
                onClick={onDuplicateSelected}
                className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
                title="Duplicate (Ctrl+D)"
                aria-label="Duplicate Element"
              >
                <Layers className="w-3 h-3" />
              </button>
            )}
            {onSaveAsComponentSelected && (
              <button
                type="button"
                onClick={onSaveAsComponentSelected}
                className="w-6 h-6 flex items-center justify-center text-purple-300 bg-purple-900/40 hover:bg-purple-800 rounded cursor-pointer"
                title="Save as Reusable Component"
                aria-label="Save Component"
              >
                🧩
              </button>
            )}
            {onReplaceTemplateSelected && (
              <button
                type="button"
                onClick={onReplaceTemplateSelected}
                className="w-6 h-6 flex items-center justify-center text-amber-300 bg-amber-900/40 hover:bg-amber-800 rounded cursor-pointer"
                title="Replace with Template"
                aria-label="Replace with Template"
              >
                🔄
              </button>
            )}
          </div>
        )}

        {/* Autosave Status Indicator */}
        <div className="shrink-0">
          <AutosaveStatusIndicator
            status={autosaveStatus}
            lastSavedAt={autosaveLastSavedAt}
            errorMessage={autosaveError}
          />
        </div>

        {/* Utility Tools */}
        <div className="flex items-center gap-1 border-l border-slate-700/80 pl-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenFinder}
            className="w-7 h-7 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition flex items-center justify-center shadow-xs cursor-pointer"
            title="Search (Ctrl+K)"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onOpenSeoModal}
            className="w-7 h-7 rounded-lg border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 hover:text-white transition flex items-center justify-center shadow-xs cursor-pointer"
            title="SEO & Quality Audit"
            aria-label="SEO & Quality Audit"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </button>

          <button
            type="button"
            onClick={onOpenVariablesModal}
            className="w-7 h-7 rounded-lg border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 hover:text-white transition flex items-center justify-center shadow-xs cursor-pointer"
            title="Design Variables & CSS Tokens"
            aria-label="Tokens"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
          </button>

          <button
            type="button"
            onClick={onToggleCanvasTheme}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
              canvasTheme === "dark"
                ? "bg-indigo-950/60 text-indigo-300 border-indigo-700/80 shadow-sm"
                : "bg-amber-950/30 text-amber-300 border-amber-700/60"
            }`}
            title="Toggle Dynamic Canvas Theme"
          >
            <span>{canvasTheme === "dark" ? "🌙 Dark" : "☀️ Light"}</span>
          </button>

          {canvasPeers.length > 0 && (
            <div
              className="flex items-center -space-x-1.5 overflow-hidden pl-1 pr-1"
              title={`${canvasPeers.length} collaborator(s) online`}
            >
              {canvasPeers.map((peer) => (
                <div
                  key={peer.socketId}
                  title={`${peer.user.name} is currently editing`}
                  className="relative flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-extrabold text-white ring-2 ring-slate-900 shadow-sm transition hover:z-20 hover:scale-110"
                  style={{ backgroundColor: peer.user.color }}
                >
                  {peer.user.name.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          )}

          {isRestrictedMode && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-xs">
              <span>Client Mode (Content Only)</span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenClassModal}
            className="w-7 h-7 rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-white transition flex items-center justify-center shadow-xs cursor-pointer"
            title="Global Utility Classes"
            aria-label="Classes"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          <button
            type="button"
            onClick={onToggleDesignNotes}
            className={`w-7 h-7 rounded-lg border transition flex items-center justify-center shadow-xs cursor-pointer ${
              isDesignNotesOpen
                ? "bg-purple-600/30 text-purple-200 border-purple-500/60"
                : "text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80"
            }`}
            title="Collaborative Design Notes"
            aria-label="Notes"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleDevMode}
            className={`w-7 h-7 rounded-lg border transition flex items-center justify-center shadow-xs cursor-pointer ${
              devModalMode === "export-code"
                ? "bg-blue-600 text-white border-blue-500"
                : "text-blue-300 bg-blue-900/40 hover:bg-blue-800/60 border-blue-700/60"
            }`}
            title="Developer Mode"
            aria-label="Developer Mode"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onOpenExperimentModal}
            className="px-3 py-1 text-xs font-semibold rounded-lg border text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border-purple-800/60 transition flex items-center gap-1.5 cursor-pointer"
            title="A/B Split Testing & Conversion Experiments"
          >
            <span>🧪</span>
            <span>A/B Tests</span>
          </button>

          <button
            type="button"
            onClick={onToggleFullScreenCanvas}
            className="w-7 h-7 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition flex items-center justify-center shadow-xs cursor-pointer"
            title="Toggle Full Screen Canvas"
            aria-label="Toggle Full Screen Canvas"
          >
            <span>⛶</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-700/80 mx-0.5 shrink-0" />

        {/* Primary Actions: Preview, Save, Publish */}
        <button
          type="button"
          onClick={onTogglePreview}
          className={`w-8 h-8 rounded-lg border transition flex items-center justify-center shadow-sm cursor-pointer shrink-0 ${
            isPreview
              ? "bg-amber-500/20 text-amber-300 border-amber-500/60 hover:bg-amber-500/30"
              : "bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700/80 hover:text-white"
          }`}
          title={isPreview ? "Exit Preview (Ctrl+P)" : "Preview"}
          aria-label={isPreview ? "Exit Preview" : "Preview"}
          data-testid="preview-button"
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="h-8 px-3 rounded-lg border border-blue-500 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save (Ctrl+S)"
          aria-label="Save"
          data-testid="manual-save-button"
        >
          {isSaving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Save</span>
        </button>

        <button
          type="button"
          onClick={onOpenPublishModal}
          className="h-8 px-3.5 relative rounded-lg border border-emerald-500/50 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
          title="Publish Website"
          aria-label="Publish"
          data-testid="publish-button"
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>Publish</span>
          {publishingStatus === "PUBLISHED" && (
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse ring-1 ring-emerald-950"></span>
          )}
        </button>
      </div>
    </header>
  );
};
