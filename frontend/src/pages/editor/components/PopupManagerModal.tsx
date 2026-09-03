import { useState } from "react";
import type { PopupConfig, PopupLayoutMode } from "../../../types/popup.types";
import { POPUP_TEMPLATES, createDefaultPopup } from "../../../types/popup.types";

interface PopupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  popups: PopupConfig[];
  onSelectPopupForEdit: (popupId: string) => void;
  onCreatePopup: (newPopup: PopupConfig) => void;
  onUpdatePopup: (popupId: string, updater: (p: PopupConfig) => PopupConfig) => void;
  onDeletePopup: (popupId: string) => void;
  onDuplicatePopup: (popupId: string) => void;
}

export default function PopupManagerModal({
  isOpen,
  onClose,
  popups,
  onSelectPopupForEdit,
  onCreatePopup,
  onUpdatePopup,
  onDeletePopup,
  onDuplicatePopup,
}: PopupManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"popups" | "templates">("popups");
  const [newPopupName, setNewPopupName] = useState("");
  const [selectedLayout, setSelectedLayout] = useState<PopupLayoutMode>("modal");
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  if (!isOpen) return null;

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPopupName.trim() || "My New Popup";
    const popup = createDefaultPopup(name, selectedLayout);
    onCreatePopup(popup);
    setNewPopupName("");
    setIsCreatingCustom(false);
    onSelectPopupForEdit(popup.id);
  };

  const handleUseTemplate = (templateId: string) => {
    const tmpl = POPUP_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    const popup = tmpl.create();
    onCreatePopup(popup);
    onSelectPopupForEdit(popup.id);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <path d="M14 9h4" />
                <path d="M14 15h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Popup & Conversion Engine</h2>
              <p className="text-xs text-slate-500">Manage high-converting modals, off-canvas slide-ins, and hello bars</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg bg-slate-200/70 p-1 text-xs font-semibold">
              <button
                onClick={() => {
                  setActiveTab("popups");
                  setIsCreatingCustom(false);
                }}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === "popups" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Popups ({popups.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab("templates");
                  setIsCreatingCustom(false);
                }}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === "templates" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Templates
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "popups" && (
            <div>
              {isCreatingCustom ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Create New Custom Popup</h3>
                  <form onSubmit={handleCreateCustom} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Popup Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Summer Flash Sale Modal"
                        value={newPopupName}
                        onChange={(e) => setNewPopupName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2">Select Layout Mode</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { id: "modal", label: "Center Modal", desc: "Classic focal lightbox" },
                          { id: "slide-in", label: "Off-Canvas Slide-In", desc: "Corner drawer notification" },
                          { id: "hello-bar", label: "Hello Bar", desc: "Full-width header/footer alert" },
                          { id: "full-screen", label: "Full-Screen Takeover", desc: "Maximum immersion overlay" },
                        ].map((mode) => (
                          <div
                            key={mode.id}
                            onClick={() => setSelectedLayout(mode.id as PopupLayoutMode)}
                            className={`cursor-pointer rounded-xl border p-3.5 transition text-left ${
                              selectedLayout === mode.id
                                ? "border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <span className="block text-xs font-bold text-slate-800">{mode.label}</span>
                            <span className="block text-[11px] text-slate-500 mt-1 leading-tight">{mode.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreatingCustom(false)}
                        className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                      >
                        Create & Open Designer
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Configured Popups ({popups.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("templates")}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                      Browse Templates
                    </button>
                    <button
                      onClick={() => setIsCreatingCustom(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                    >
                      <span>+</span> Add Custom Popup
                    </button>
                  </div>
                </div>
              )}

              {popups.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No popups created yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    Create modal lightboxes, off-canvas notification drawers, or top hello bars to capture leads and boost conversion rates.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsCreatingCustom(true)}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                    >
                      + Create Blank Popup
                    </button>
                    <button
                      onClick={() => setActiveTab("templates")}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                      Start with Template
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {popups.map((popup) => {
                    const views = popup.viewsCount || 0;
                    const clicks = popup.clicksCount || 0;
                    const conversionRate = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";

                    return (
                      <div
                        key={popup.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-md transition gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold uppercase text-xs">
                            {popup.layoutMode === "modal" && "MOD"}
                            {popup.layoutMode === "slide-in" && "SLD"}
                            {popup.layoutMode === "hello-bar" && "BAR"}
                            {popup.layoutMode === "full-screen" && "FUL"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-800">{popup.name}</h4>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  popup.isActive !== false
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                {popup.isActive !== false ? "Active" : "Paused"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <span className="capitalize">{popup.layoutMode}</span>
                              <span>•</span>
                              <span>
                                {popup.triggers.map((t) => t.type).join(", ") || "No triggers"}
                              </span>
                              <span>•</span>
                              <span>{popup.targeting.frequencyCap}</span>
                            </div>
                          </div>
                        </div>

                        {/* Conversion Metrics & Actions */}
                        <div className="flex items-center gap-6 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                          {/* F-290 Analytics */}
                          <div className="flex items-center gap-4 text-center">
                            <div>
                              <span className="block text-xs font-bold text-slate-700">{views}</span>
                              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Views</span>
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-blue-600">{clicks}</span>
                              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Clicks</span>
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-emerald-600">{conversionRate}%</span>
                              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Conv. Rate</span>
                            </div>
                          </div>

                          {/* Quick Controls */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                onUpdatePopup(popup.id, (p) => ({ ...p, isActive: p.isActive === false ? true : false }));
                              }}
                              title={popup.isActive !== false ? "Pause Popup" : "Activate Popup"}
                              className={`rounded-lg p-2 text-xs font-bold transition ${
                                popup.isActive !== false
                                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {popup.isActive !== false ? "⏸" : "▶"}
                            </button>
                            <button
                              onClick={() => onDuplicatePopup(popup.id)}
                              title="Duplicate Popup"
                              className="rounded-lg bg-slate-100 p-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                            >
                              📋
                            </button>
                            <button
                              onClick={() => onDeletePopup(popup.id)}
                              title="Delete Popup"
                              className="rounded-lg bg-red-50 p-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                            >
                              🗑
                            </button>
                            <button
                              onClick={() => {
                                onSelectPopupForEdit(popup.id);
                                onClose();
                              }}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
                            >
                              Design Canvas →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "templates" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Conversion-Optimized Templates</h3>
                  <p className="text-xs text-slate-500">Choose a proven pre-configured layout to get started immediately</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {POPUP_TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-blue-400 hover:shadow-lg transition"
                  >
                    <div className="h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      <img src={tpl.previewImg} alt={tpl.name} className="w-full h-full object-cover" />
                      <span className="absolute top-2 right-2 rounded-full bg-slate-900/80 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                        {tpl.category}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{tpl.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">{tpl.description}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-400 capitalize">Layout: {tpl.layoutMode}</span>
                        <button
                          onClick={() => {
                            handleUseTemplate(tpl.id);
                            onClose();
                          }}
                          className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                        >
                          Use Template
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
