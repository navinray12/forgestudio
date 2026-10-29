import React, { useState, useEffect } from "react";
import type { LoopContainerConfig, LoopDataSourceType, DynamicFieldBinding } from "../types/atomicLoop.types";
import { validateStaticDataJson } from "../utils/loopValidation.utils";

interface LoopDataSourceSelectorProps {
  loop: LoopContainerConfig;
  onUpdateLoop: (updated: Partial<LoopContainerConfig>) => void;
  websiteId?: string;
}

interface CptOption {
  id: string;
  name: string;
  slug: string;
  fields: Array<{ id: string; name: string; slug: string; key?: string; type: string }>;
  _count?: { entries: number };
}

export const LoopDataSourceSelector: React.FC<LoopDataSourceSelectorProps> = ({
  loop,
  onUpdateLoop,
  websiteId: propWebsiteId,
}) => {
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [cpts, setCpts] = useState<CptOption[]>([]);
  const [loadingCpts, setLoadingCpts] = useState<boolean>(false);
  const [cptError, setCptError] = useState<string | null>(null);
  const [entryCount, setEntryCount] = useState<number | null>(null);

  // Resolve current active website ID
  const websiteId = React.useMemo(() => {
    if (propWebsiteId) return propWebsiteId;
    if (typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/(?:editor|websites|site)\/([a-f0-9-]{36}|[a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1];
      return localStorage.getItem("forgestudio_active_website_id") || localStorage.getItem("websiteId") || "";
    }
    return "";
  }, [propWebsiteId]);

  // Fetch real CPT metadata from backend
  useEffect(() => {
    if (loop.dataSourceType !== "cpt" || !websiteId) return;

    let isMounted = true;
    setLoadingCpts(true);
    setCptError(null);

    fetch(`/api/cpt/websites/${websiteId}/types`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((resData) => {
        if (!isMounted) return;
        const list = resData.data || [];
        setCpts(list);
        if (list.length > 0 && !loop.cptId) {
          onUpdateLoop({ cptId: list[0].id, cptSlug: list[0].slug });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setCptError(err.message || "Failed to load website Custom Post Types.");
      })
      .finally(() => {
        if (isMounted) setLoadingCpts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [loop.dataSourceType, websiteId]);

  // Fetch count of entries when selected CPT changes
  useEffect(() => {
    if (loop.dataSourceType !== "cpt" || !loop.cptId) {
      setEntryCount(null);
      return;
    }

    let isMounted = true;
    fetch(`/api/cpt/types/${loop.cptId}/entries?limit=100`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) {
          const count = data.pagination?.total ?? (data.data?.length || 0);
          setEntryCount(count);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [loop.dataSourceType, loop.cptId]);

  const handleJsonChange = (raw: string) => {
    const val = validateStaticDataJson(raw);
    if (!val.isValid) {
      setJsonError(val.error || "Invalid JSON array.");
    } else {
      setJsonError(null);
    }
    onUpdateLoop({ staticDataJson: raw });
  };

  const selectedCpt = cpts.find((c) => c.id === loop.cptId || c.slug === loop.cptSlug) || cpts[0];
  const availableFields = selectedCpt?.fields || [];

  const handleBindingChange = (elementKey: string, itemPropertyKey: string) => {
    const currentBindings: DynamicFieldBinding[] = loop.template?.bindings || [];
    const filtered = currentBindings.filter((b) => b.elementKey !== elementKey);
    const updated = [...filtered, { elementKey, itemPropertyKey }];
    onUpdateLoop({
      template: {
        ...(loop.template || { id: "tpl-default", name: "Default" }),
        bindings: updated,
      },
    });
  };

  const getBoundKey = (elementKey: string, fallback: string) => {
    const binding = (loop.template?.bindings || []).find((b) => b.elementKey === elementKey);
    return binding?.itemPropertyKey || fallback;
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <span>🗄️</span>
          <span>Data Source Configuration</span>
        </span>
        {entryCount !== null && (
          <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
            {entryCount} {entryCount === 1 ? "Record" : "Records"} Found
          </span>
        )}
      </div>

      {/* Collection Source Dropdown */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          Collection Source
        </label>
        <select
          value={loop.dataSourceType}
          onChange={(e) => onUpdateLoop({ dataSourceType: e.target.value as LoopDataSourceType })}
          className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
        >
          <option value="cpt">🗂️ Dynamic Custom Post Type (CMS)</option>
          <option value="cms_products">🛍️ CMS Products Collection (Sample)</option>
          <option value="cms_blog">📰 CMS Blog Articles Collection (Sample)</option>
          <option value="static">📝 Static JSON Dataset (Custom Array)</option>
        </select>
      </div>

      {/* CPT Source Configuration */}
      {loop.dataSourceType === "cpt" && (
        <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          {loadingCpts && (
            <div className="text-xs text-slate-400 py-2 flex items-center gap-2">
              <span className="animate-spin">⏳</span> Loading Custom Post Types...
            </div>
          )}

          {cptError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-600">
              {cptError}
            </div>
          )}

          {!loadingCpts && cpts.length === 0 && !cptError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 space-y-1">
              <p className="font-bold">No Custom Post Types Found</p>
              <p className="text-[11px]">
                Create a Custom Post Type (e.g. Portfolio, Testimonials, Team) in the CMS Manager first.
              </p>
            </div>
          )}

          {cpts.length > 0 && (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Select Custom Post Type
                </label>
                <select
                  value={loop.cptId || ""}
                  onChange={(e) => {
                    const chosen = cpts.find((c) => c.id === e.target.value);
                    if (chosen) {
                      onUpdateLoop({ cptId: chosen.id, cptSlug: chosen.slug });
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
                >
                  {cpts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug}) — {c._count?.entries || 0} entries
                    </option>
                  ))}
                </select>
              </div>

              {/* Query Controls: Sort, Limit, Status */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Order By</label>
                  <select
                    value={loop.sortBy || "updatedAt"}
                    onChange={(e) => onUpdateLoop({ sortBy: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="updatedAt">Last Updated</option>
                    <option value="createdAt">Creation Date</option>
                    <option value="title">Title (Alphabetical)</option>
                    {availableFields.map((f) => (
                      <option key={f.id} value={f.slug || f.key}>
                        Field: {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Direction</label>
                  <select
                    value={loop.sortOrder || "desc"}
                    onChange={(e) => onUpdateLoop({ sortOrder: e.target.value as "asc" | "desc" })}
                    className="w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="desc">Descending (Newest first)</option>
                    <option value="asc">Ascending (Oldest first)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Item Limit</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={loop.itemsLimit ?? 6}
                    onChange={(e) => onUpdateLoop({ itemsLimit: Number(e.target.value) || 6 })}
                    className="w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Status</label>
                  <select
                    value={loop.statusFilter || "PUBLISHED"}
                    onChange={(e) => onUpdateLoop({ statusFilter: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="PUBLISHED">Published Only</option>
                    <option value="ALL">All Editorial States</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Field Mapping Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Field Binding Mappings
                </span>
                <div className="space-y-2 text-xs">
                  {/* Card Title */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 w-24">Card Title:</span>
                    <select
                      value={getBoundKey("title", "title")}
                      onChange={(e) => handleBindingChange("title", e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-2 py-1 text-xs outline-none"
                    >
                      <option value="title">Entry Title (Standard)</option>
                      {availableFields.map((f) => (
                        <option key={f.id} value={f.slug || f.key}>
                          {f.name} ({f.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Card Image */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 w-24">Card Image:</span>
                    <select
                      value={getBoundKey("image", "featuredImage")}
                      onChange={(e) => handleBindingChange("image", e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-2 py-1 text-xs outline-none"
                    >
                      <option value="featuredImage">Featured Image</option>
                      <option value="image">Image Field</option>
                      {availableFields.map((f) => (
                        <option key={f.id} value={f.slug || f.key}>
                          {f.name} ({f.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Card Description */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 w-24">Description:</span>
                    <select
                      value={getBoundKey("description", "description")}
                      onChange={(e) => handleBindingChange("description", e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-2 py-1 text-xs outline-none"
                    >
                      <option value="description">Description Field</option>
                      <option value="excerpt">Excerpt Field</option>
                      {availableFields.map((f) => (
                        <option key={f.id} value={f.slug || f.key}>
                          {f.name} ({f.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Badge / Category */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 w-24">Badge:</span>
                    <select
                      value={getBoundKey("badge", "category")}
                      onChange={(e) => handleBindingChange("badge", e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-2 py-1 text-xs outline-none"
                    >
                      <option value="category">Category</option>
                      {availableFields.map((f) => (
                        <option key={f.id} value={f.slug || f.key}>
                          {f.name} ({f.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Static JSON Input */}
      {loop.dataSourceType === "static" && (
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Static JSON Array</span>
            {jsonError && <span className="text-[10px] text-red-500 font-bold">{jsonError}</span>}
          </label>
          <textarea
            rows={5}
            value={loop.staticDataJson || `[\n  { "title": "Item 1", "price": "$10" },\n  { "title": "Item 2", "price": "$20" }\n]`}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-3 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>
      )}
    </div>
  );
};
