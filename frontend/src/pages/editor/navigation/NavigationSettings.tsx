import React from "react";
import type { EditorElement, ElementStyles, ContainerLayout, Breakpoint } from "../WebsiteEditor";

interface NavigationSettingsProps {
  selectedElement: EditorElement;
  activeBreakpointId: string;
  breakpoints: Breakpoint[];
  updateSelectedStyle: (key: keyof ElementStyles, value: any) => void;
  updateSelectedProp: (key: keyof EditorElement, value: any) => void;
  renderResponsiveLabel: (label: string, styleKey?: keyof ElementStyles, layoutKey?: keyof ContainerLayout) => React.ReactNode;
}

export const NavigationSettingsPanel: React.FC<NavigationSettingsProps> = ({
  selectedElement,
  updateSelectedStyle,
  updateSelectedProp,
  renderResponsiveLabel,
}) => {
  const styles = selectedElement.styles || {};

  return (
    <div className="space-y-4 text-xs">
      {/* ---------------------------------------------------- */}
      {/* 1. F-223: Nav Menu Settings                          */}
      {/* ---------------------------------------------------- */}
      {selectedElement.type === "nav-menu" && (
        <div className="space-y-3">
          <div>
            {renderResponsiveLabel("Menu Layout", "navLayout")}
            <select
              value={styles.navLayout || "horizontal"}
              onChange={(e) => updateSelectedStyle("navLayout", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="horizontal">Horizontal (Top Bar)</option>
              <option value="vertical">Vertical (Sidebar / Stack)</option>
            </select>
          </div>

          <div>
            {renderResponsiveLabel("Alignment", "navAlign")}
            <select
              value={styles.navAlign || "space-between"}
              onChange={(e) => updateSelectedStyle("navAlign", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="left">Left Align</option>
              <option value="center">Center Align</option>
              <option value="right">Right Align</option>
              <option value="space-between">Space Between</option>
            </select>
          </div>

          <div>
            {renderResponsiveLabel("Hover Animation Effect", "navHoverEffect")}
            <select
              value={styles.navHoverEffect || "pill"}
              onChange={(e) => updateSelectedStyle("navHoverEffect", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="pill">Pill Background</option>
              <option value="underline">Modern Underline</option>
              <option value="glow">Neon / Cyan Glow</option>
              <option value="top-line">Top Border Accent</option>
              <option value="none">Simple Color Change</option>
            </select>
          </div>

          <div>
            {renderResponsiveLabel("Active Item Style", "navActiveStyle")}
            <select
              value={styles.navActiveStyle || "pill"}
              onChange={(e) => updateSelectedStyle("navActiveStyle", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="pill">Solid Filled Pill</option>
              <option value="underline">Underline</option>
              <option value="dot">Active Dot</option>
              <option value="bold">Bold Text</option>
            </select>
          </div>

          <div>
            {renderResponsiveLabel("Mobile Hamburger Breakpoint", "navMobileBreakpoint")}
            <select
              value={styles.navMobileBreakpoint || "mobile"}
              onChange={(e) => updateSelectedStyle("navMobileBreakpoint", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="mobile">Mobile Phones (&lt; 640px)</option>
              <option value="tablet">Tablets &amp; Mobile (&lt; 768px)</option>
              <option value="laptop">Laptops &amp; Smaller (&lt; 1024px)</option>
              <option value="none">Always Show Full Menu</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">LINK COLOR</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={styles.navItemColor || "#334155"}
                  onChange={(e) => updateSelectedStyle("navItemColor", e.target.value)}
                  className="h-7 w-7 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={styles.navItemColor || "#334155"}
                  onChange={(e) => updateSelectedStyle("navItemColor", e.target.value)}
                  className="w-full rounded border px-2 py-1 text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">DROPDOWN BG</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={styles.navDropdownBg || "#ffffff"}
                  onChange={(e) => updateSelectedStyle("navDropdownBg", e.target.value)}
                  className="h-7 w-7 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={styles.navDropdownBg || "#ffffff"}
                  onChange={(e) => updateSelectedStyle("navDropdownBg", e.target.value)}
                  className="w-full rounded border px-2 py-1 text-[11px]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">MENU ITEMS (JSON)</label>
            <textarea
              rows={5}
              value={selectedElement.content}
              onChange={(e) => updateSelectedProp("content", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 font-mono text-[10px] text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. F-224: WordPress Menu Settings                    */}
      {/* ---------------------------------------------------- */}
      {selectedElement.type === "wp-menu" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">WP MENU LOCATION</label>
            <select
              value={styles.wpMenuSource || "primary"}
              onChange={(e) => updateSelectedStyle("wpMenuSource", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="primary">Primary Menu</option>
              <option value="header">Header Navigation</option>
              <option value="footer">Footer Menu</option>
              <option value="secondary">Secondary / Sidebar Menu</option>
              <option value="custom">Custom WP Menu Name</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">MENU NAME / LABEL</label>
            <input
              type="text"
              value={styles.wpMenuName || "Main WordPress Menu"}
              onChange={(e) => updateSelectedStyle("wpMenuName", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">HIERARCHY DEPTH</label>
            <select
              value={styles.wpMenuDepth || "3"}
              onChange={(e) => updateSelectedStyle("wpMenuDepth", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="1">1 Level (Top Level Only)</option>
              <option value="2">2 Levels (With Submenus)</option>
              <option value="3">3 Levels (Deep Hierarchies)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SYNC STATUS</label>
            <select
              value={styles.wpMenuSyncStatus || "synced"}
              onChange={(e) => updateSelectedStyle("wpMenuSyncStatus", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="synced">Live REST API Synced</option>
              <option value="pending">Sync Pending</option>
              <option value="fallback">Local Static Fallback</option>
            </select>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. F-225: Menu Widget Settings                       */}
      {/* ---------------------------------------------------- */}
      {selectedElement.type === "menu-widget" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">DROPDOWN TRIGGER</label>
            <select
              value={styles.menuTrigger || "hover"}
              onChange={(e) => updateSelectedStyle("menuTrigger", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="hover">On Mouse Hover</option>
              <option value="click">On Mouse Click</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SUBMENU INDICATOR</label>
            <select
              value={styles.menuIndicator || "chevron"}
              onChange={(e) => updateSelectedStyle("menuIndicator", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="chevron">Chevron Down (▼)</option>
              <option value="arrow">Arrow (→)</option>
              <option value="plus">Plus Sign (+)</option>
              <option value="dot">Bullet Dot (•)</option>
              <option value="none">No Indicator</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">BADGE COLOR</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styles.menuBadgeBg || "#ef4444"}
                onChange={(e) => updateSelectedStyle("menuBadgeBg", e.target.value)}
                className="h-7 w-7 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={styles.menuBadgeBg || "#ef4444"}
                onChange={(e) => updateSelectedStyle("menuBadgeBg", e.target.value)}
                className="w-full rounded border px-2 py-1 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. F-226: Mega Menu Settings                         */}
      {/* ---------------------------------------------------- */}
      {selectedElement.type === "mega-menu" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">GRID COLUMNS</label>
            <select
              value={styles.megaMenuColumns || "3"}
              onChange={(e) => updateSelectedStyle("megaMenuColumns", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="2">2 Columns</option>
              <option value="3">3 Columns (Recommended)</option>
              <option value="4">4 Columns (Wide)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">ENABLE PROMOTIONAL CARD</label>
            <select
              value={styles.megaMenuPromoEnabled || "true"}
              onChange={(e) => updateSelectedStyle("megaMenuPromoEnabled", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="true">Enabled (Show banner/CTA)</option>
              <option value="false">Disabled (Columns only)</option>
            </select>
          </div>

          {styles.megaMenuPromoEnabled !== "false" && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">PROMO BADGE</label>
                <input
                  type="text"
                  value={styles.megaMenuPromoBadge || "SPECIAL OFFER"}
                  onChange={(e) => updateSelectedStyle("megaMenuPromoBadge", e.target.value)}
                  className="w-full rounded border px-2 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">PROMO TITLE</label>
                <input
                  type="text"
                  value={styles.megaMenuPromoTitle || "Pro UI Toolkit"}
                  onChange={(e) => updateSelectedStyle("megaMenuPromoTitle", e.target.value)}
                  className="w-full rounded border px-2 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">PROMO BUTTON TEXT</label>
                <input
                  type="text"
                  value={styles.megaMenuPromoButtonText || "Learn More →"}
                  onChange={(e) => updateSelectedStyle("megaMenuPromoButtonText", e.target.value)}
                  className="w-full rounded border px-2 py-1 text-xs"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. F-227: Breadcrumbs Settings                       */}
      {/* ---------------------------------------------------- */}
      {selectedElement.type === "breadcrumbs" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SEPARATOR STYLE</label>
            <select
              value={styles.breadcrumbSeparator || "chevron"}
              onChange={(e) => updateSelectedStyle("breadcrumbSeparator", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="chevron">Chevron (›)</option>
              <option value="slash">Slash (/)</option>
              <option value="arrow">Arrow (→)</option>
              <option value="bullet">Bullet (•)</option>
              <option value="pipe">Pipe (|)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SHOW HOME ICON</label>
            <select
              value={styles.breadcrumbHomeIcon || "true"}
              onChange={(e) => updateSelectedStyle("breadcrumbHomeIcon", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="true">Yes, show Home icon</option>
              <option value="false">No, text only</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">ACTIVE PAGE COLOR</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styles.breadcrumbActiveColor || "#2563eb"}
                onChange={(e) => updateSelectedStyle("breadcrumbActiveColor", e.target.value)}
                className="h-7 w-7 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={styles.breadcrumbActiveColor || "#2563eb"}
                onChange={(e) => updateSelectedStyle("breadcrumbActiveColor", e.target.value)}
                className="w-full rounded border px-2 py-1 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SEO SCHEMA.ORG DATA</label>
            <select
              value={styles.breadcrumbShowSchema || "true"}
              onChange={(e) => updateSelectedStyle("breadcrumbShowSchema", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="true">Enabled (Generate BreadcrumbList JSON-LD)</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. F-228: Menu Anchor Settings                       */}
      {/* ---------------------------------------------------- */}
      {selectedElement.type === "menu-anchor" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">ANCHOR ID (without #)</label>
            <input
              type="text"
              value={styles.anchorId || "features-section"}
              onChange={(e) => updateSelectedStyle("anchorId", e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
              className="w-full rounded-lg border border-slate-300 font-mono px-2.5 py-1.5 text-xs"
              placeholder="e.g. pricing, contact, features"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Link any button or menu item to #{styles.anchorId || "features-section"} to scroll directly here.
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SCROLL OFFSET (px)</label>
            <input
              type="text"
              value={styles.anchorScrollOffset || "80px"}
              onChange={(e) => updateSelectedStyle("anchorScrollOffset", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              placeholder="e.g. 80px for sticky headers"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SMOOTH SCROLL</label>
            <select
              value={styles.anchorSmoothScroll || "true"}
              onChange={(e) => updateSelectedStyle("anchorSmoothScroll", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="true">Enabled (Smooth)</option>
              <option value="false">Instant Jump</option>
            </select>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 7. F-229: Post Navigation Settings                   */}
      {/* ---------------------------------------------------- */}
      {selectedElement.type === "post-nav" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">PREVIOUS POST TITLE</label>
            <input
              type="text"
              value={styles.postNavPrevTitle || ""}
              onChange={(e) => updateSelectedStyle("postNavPrevTitle", e.target.value)}
              className="w-full rounded border px-2 py-1 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">NEXT POST TITLE</label>
            <input
              type="text"
              value={styles.postNavNextTitle || ""}
              onChange={(e) => updateSelectedStyle("postNavNextTitle", e.target.value)}
              className="w-full rounded border px-2 py-1 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SHOW THUMBNAIL IMAGES</label>
            <select
              value={styles.postNavShowImages || "true"}
              onChange={(e) => updateSelectedStyle("postNavShowImages", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="true">Yes, show post thumbnails</option>
              <option value="false">No, text &amp; arrows only</option>
            </select>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 8. F-230: Off Canvas Navigation Settings             */}
      {/* ---------------------------------------------------- */}
      {selectedElement.type === "off-canvas-nav" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">DRAWER SLIDE POSITION</label>
            <select
              value={styles.offCanvasPosition || "left"}
              onChange={(e) => updateSelectedStyle("offCanvasPosition", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="left">Slide from Left</option>
              <option value="right">Slide from Right</option>
              <option value="top">Slide from Top</option>
              <option value="bottom">Slide from Bottom</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">TRIGGER BUTTON LABEL</label>
            <input
              type="text"
              value={styles.offCanvasTriggerLabel || "Menu"}
              onChange={(e) => updateSelectedStyle("offCanvasTriggerLabel", e.target.value)}
              className="w-full rounded border px-2 py-1 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">DRAWER WIDTH</label>
            <input
              type="text"
              value={styles.offCanvasWidth || "340px"}
              onChange={(e) => updateSelectedStyle("offCanvasWidth", e.target.value)}
              className="w-full rounded border px-2 py-1 text-xs"
              placeholder="e.g. 340px, 400px, 80%"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SHOW SEARCH IN DRAWER</label>
            <select
              value={styles.offCanvasShowSearch || "true"}
              onChange={(e) => updateSelectedStyle("offCanvasShowSearch", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 9. F-231: Site Search Settings                       */}
      {/* ---------------------------------------------------- */}
      {selectedElement.type === "site-search" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SEARCH PLACEHOLDER</label>
            <input
              type="text"
              value={styles.searchPlaceholder || "Search..."}
              onChange={(e) => updateSelectedStyle("searchPlaceholder", e.target.value)}
              className="w-full rounded border px-2 py-1 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">LIVE AUTOCOMPLETE PREVIEW</label>
            <select
              value={styles.searchLiveResults || "true"}
              onChange={(e) => updateSelectedStyle("searchLiveResults", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="true">Enabled (Show instant dropdown)</option>
              <option value="false">Disabled (Input only)</option>
            </select>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 10. F-232: Search Form Settings                      */}
      {/* ---------------------------------------------------- */}
      {selectedElement.type === "search-form" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">FORM ACTION URL</label>
            <input
              type="text"
              value={styles.formActionUrl || "/search"}
              onChange={(e) => updateSelectedStyle("formActionUrl", e.target.value)}
              className="w-full rounded border px-2 py-1 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">METHOD</label>
            <select
              value={styles.formMethod || "GET"}
              onChange={(e) => updateSelectedStyle("formMethod", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="GET">GET (Standard search)</option>
              <option value="POST">POST</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">BUTTON TEXT</label>
            <input
              type="text"
              value={styles.formButtonText || "Search"}
              onChange={(e) => updateSelectedStyle("formButtonText", e.target.value)}
              className="w-full rounded border px-2 py-1 text-xs"
            />
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 11. F-233: Taxonomy Filter Settings                  */}
      {/* ---------------------------------------------------- */}
      {selectedElement.type === "taxonomy-filter" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SELECTION MODE</label>
            <select
              value={styles.taxonomySelectionMode || "single"}
              onChange={(e) => updateSelectedStyle("taxonomySelectionMode", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="single">Single Select (One active at a time)</option>
              <option value="multi">Multi-Select (Toggle multiple tags)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">SHOW ITEM COUNTS</label>
            <select
              value={styles.taxonomyShowCounts || "true"}
              onChange={(e) => updateSelectedStyle("taxonomyShowCounts", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="true">Yes, show post counts (e.g. 18)</option>
              <option value="false">No, label only</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">ACTIVE BG</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={styles.taxonomyActiveBg || "#2563eb"}
                  onChange={(e) => updateSelectedStyle("taxonomyActiveBg", e.target.value)}
                  className="h-7 w-7 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={styles.taxonomyActiveBg || "#2563eb"}
                  onChange={(e) => updateSelectedStyle("taxonomyActiveBg", e.target.value)}
                  className="w-full rounded border px-2 py-1 text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">ITEM BG</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={styles.taxonomyItemBg || "#f1f5f9"}
                  onChange={(e) => updateSelectedStyle("taxonomyItemBg", e.target.value)}
                  className="h-7 w-7 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={styles.taxonomyItemBg || "#f1f5f9"}
                  onChange={(e) => updateSelectedStyle("taxonomyItemBg", e.target.value)}
                  className="w-full rounded border px-2 py-1 text-[11px]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
