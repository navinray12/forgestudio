import React, { useState } from "react";
import type { EditorElement, Breakpoint } from "../WebsiteEditor";
import type {
  NavMenuItem,
  MegaMenuColumn,
  BreadcrumbItem,
  TaxonomyItem,
  SearchSampleResult,
} from "./navigationTypes";
import {
  DEFAULT_NAV_MENU_ITEMS,
  DEFAULT_WP_MENU_ITEMS,
  DEFAULT_MEGA_MENU_COLUMNS,
  DEFAULT_BREADCRUMBS,
  DEFAULT_TAXONOMY_ITEMS,
  DEFAULT_SEARCH_RESULTS,
} from "./navigationDefaults";

interface NavigationRendererProps {
  element: EditorElement;
  activeBreakpointId: string;
  breakpoints: Breakpoint[];
  isPreview?: boolean;
  onUpdateElement?: (updater: (el: EditorElement) => EditorElement) => void;
}

// Helper to safely parse JSON content with fallback
function parseJson<T>(content: string, fallback: T): T {
  try {
    if (!content || content.trim() === "") return fallback;
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

// ==========================================================
// 1. F-223: Nav Menu Renderer
// ==========================================================
export const NavMenuRenderer: React.FC<NavigationRendererProps> = ({ element, activeBreakpointId }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const items = parseJson<NavMenuItem[]>(element.content, DEFAULT_NAV_MENU_ITEMS);

  const styles = element.styles;
  const isMobile = activeBreakpointId === "mobile" || activeBreakpointId === "mobile-portrait";
  const isTablet = activeBreakpointId === "tablet" || activeBreakpointId === "tablet-portrait";
  const triggerMobile =
    styles.navMobileBreakpoint === "laptop" ||
    styles.navMobileBreakpoint === "tablet" && (isTablet || isMobile) ||
    (styles.navMobileBreakpoint === "mobile" || !styles.navMobileBreakpoint) && isMobile;

  const hoverClass =
    styles.navHoverEffect === "pill"
      ? "hover:bg-blue-50 hover:text-blue-600 rounded-lg px-3 py-1.5 transition-all"
      : styles.navHoverEffect === "underline"
      ? "hover:underline underline-offset-8 hover:text-blue-600 py-1.5 transition-all"
      : styles.navHoverEffect === "glow"
      ? "hover:text-sky-400 hover:drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] py-1.5 transition-all"
      : styles.navHoverEffect === "top-line"
      ? "border-t-2 border-transparent hover:border-blue-600 hover:text-blue-600 pt-1 py-1.5 transition-all"
      : "hover:text-blue-600 py-1.5 transition-colors";

  return (
    <div className="w-full relative select-none">
      {/* Mobile / Compact Hamburger Bar */}
      {triggerMobile ? (
        <div className="flex items-center justify-between py-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Navigation Menu
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
            <span>{mobileMenuOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      ) : (
        /* Desktop Horizontal / Vertical Navigation Bar */
        <nav
          className={`flex items-center ${
            styles.navLayout === "vertical"
              ? "flex-col items-start space-y-2"
              : styles.navAlign === "center"
              ? "justify-center space-x-6"
              : styles.navAlign === "right"
              ? "justify-end space-x-6"
              : styles.navAlign === "space-between"
              ? "justify-between w-full"
              : "justify-start space-x-6"
          }`}
          style={{ gap: styles.navItemSpacing || "16px" }}
        >
          {items.map((item, idx) => {
            const isFirst = idx === 0;
            const hasChildren = item.children && item.children.length > 0;
            const isDropdownOpen = activeDropdown === item.id;

            return (
              <div
                key={item.id || idx}
                className="relative group"
                onMouseEnter={() => hasChildren && setActiveDropdown(item.id)}
                onMouseLeave={() => hasChildren && setActiveDropdown(null)}
              >
                <a
                  href={item.url || "#"}
                  onClick={(e) => {
                    if (hasChildren) {
                      e.preventDefault();
                      setActiveDropdown(isDropdownOpen ? null : item.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${hoverClass} ${
                    isFirst && styles.navActiveStyle === "pill"
                      ? "bg-blue-600 text-white rounded-lg px-3 py-1.5 shadow-sm hover:text-white"
                      : isFirst && styles.navActiveStyle === "underline"
                      ? "text-blue-600 underline underline-offset-8"
                      : isFirst && styles.navActiveStyle === "dot"
                      ? "text-blue-600 font-bold"
                      : ""
                  }`}
                  style={{
                    color: isFirst && styles.navActiveStyle === "pill" ? "#ffffff" : styles.navItemColor || undefined,
                  }}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-xs"
                      style={{ backgroundColor: item.badgeColor || "#ef4444" }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {hasChildren && (
                    <svg
                      className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </a>

                {/* Submenu Dropdown */}
                {hasChildren && isDropdownOpen && (
                  <div
                    className="absolute top-full left-0 z-50 mt-1.5 w-56 rounded-xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{
                      backgroundColor: styles.navDropdownBg || "#ffffff",
                      boxShadow: styles.navDropdownShadow || "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <div className="space-y-1">
                      {item.children?.map((sub) => (
                        <a
                          key={sub.id}
                          href={sub.url || "#"}
                          className="flex flex-col rounded-lg px-3 py-2 text-left hover:bg-slate-50 transition group/sub"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 group-hover/sub:text-blue-600">
                              {sub.label}
                            </span>
                            {sub.badge && (
                              <span className="rounded bg-blue-100 px-1 py-0.2 text-[8px] font-extrabold text-blue-700">
                                {sub.badge}
                              </span>
                            )}
                          </div>
                          {sub.description && (
                            <span className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">
                              {sub.description}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      )}

      {/* Mobile Drawer Flyout */}
      {triggerMobile && mobileMenuOpen && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1 divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="pt-1.5 first:pt-0">
                <a
                  href={item.url || "#"}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    {item.icon && <span>{item.icon}</span>}
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </a>
                {item.children && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-100 pl-2">
                    {item.children.map((sub) => (
                      <a
                        key={sub.id}
                        href={sub.url || "#"}
                        className="block rounded px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-blue-600"
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================================
// 2. F-224: WordPress Menu Renderer
// ==========================================================
export const WpMenuRenderer: React.FC<NavigationRendererProps> = ({ element }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const items = parseJson<NavMenuItem[]>(element.content, DEFAULT_WP_MENU_ITEMS);
  const styles = element.styles;

  return (
    <div className="w-full relative select-none">
      {/* WordPress Menu Status Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] font-semibold text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0073aa] text-[9px] font-black text-white">
            W
          </span>
          <span className="text-white font-bold">{styles.wpMenuName || "WordPress Primary Menu"}</span>
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
            {styles.wpMenuSyncStatus === "synced" ? "● Synced" : "○ Local Fallback"}
          </span>
        </div>
        <span className="text-slate-500 text-[9px] uppercase tracking-wider">
          Source: {styles.wpMenuSource || "primary"} (Depth: {styles.wpMenuDepth || "3"})
        </span>
      </div>

      {/* WP Menu Navigation Links */}
      <nav className="flex flex-wrap items-center gap-4 text-xs font-semibold">
        {items.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isDropdownOpen = activeDropdown === item.id;

          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => hasChildren && setActiveDropdown(item.id)}
              onMouseLeave={() => hasChildren && setActiveDropdown(null)}
            >
              <a
                href={item.url || "#"}
                onClick={(e) => {
                  if (hasChildren) {
                    e.preventDefault();
                    setActiveDropdown(isDropdownOpen ? null : item.id);
                  }
                }}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-slate-200 hover:text-sky-400 hover:bg-white/5 transition"
                style={{ color: styles.navItemColor || undefined }}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="rounded bg-sky-500/30 text-sky-300 px-1.5 py-0.2 text-[9px] font-bold">
                    {item.badge}
                  </span>
                )}
                {hasChildren && (
                  <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </a>

              {/* WordPress Submenu Dropdown */}
              {hasChildren && isDropdownOpen && (
                <div
                  className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-slate-700 bg-slate-800 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
                  style={{ backgroundColor: styles.navDropdownBg || "#1e293b" }}
                >
                  {item.children?.map((sub) => (
                    <a
                      key={sub.id}
                      href={sub.url || "#"}
                      className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
                    >
                      <span>{sub.label}</span>
                      {sub.badge && (
                        <span className="text-[8px] font-bold text-amber-400 bg-amber-400/10 px-1 rounded">
                          {sub.badge}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

// ==========================================================
// 3. F-225: Menu Widget Renderer
// ==========================================================
export const MenuWidgetRenderer: React.FC<NavigationRendererProps> = ({ element }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const items = parseJson<NavMenuItem[]>(element.content, DEFAULT_NAV_MENU_ITEMS);
  const styles = element.styles;

  return (
    <div className="w-full relative select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
          <span>Menu Widget Controls</span>
        </div>

        <nav className="flex items-center gap-2">
          {items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = activeDropdown === item.id;

            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => styles.menuTrigger !== "click" && hasChildren && setActiveDropdown(item.id)}
                onMouseLeave={() => styles.menuTrigger !== "click" && hasChildren && setActiveDropdown(null)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasChildren) setActiveDropdown(isOpen ? null : item.id);
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white hover:text-blue-600 hover:shadow-sm transition"
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className="rounded-full px-1.5 py-0.2 text-[8px] font-black text-white"
                      style={{ backgroundColor: styles.menuBadgeBg || "#ef4444" }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {hasChildren && styles.menuIndicator !== "none" && (
                    <span className="text-[10px] text-slate-400">
                      {styles.menuIndicator === "arrow"
                        ? "→"
                        : styles.menuIndicator === "plus"
                        ? "+"
                        : styles.menuIndicator === "dot"
                        ? "•"
                        : "▼"}
                    </span>
                  )}
                </button>

                {/* Submenu Dropdown */}
                {hasChildren && isOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                    {item.children?.map((sub) => (
                      <a
                        key={sub.id}
                        href={sub.url || "#"}
                        className="flex flex-col rounded-lg px-3 py-2 text-left hover:bg-blue-50 transition group"
                      >
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                          {sub.label}
                        </span>
                        {sub.description && (
                          <span className="text-[10px] text-slate-400">{sub.description}</span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

// ==========================================================
// 4. F-226: Mega Menu Renderer
// ==========================================================
export const MegaMenuRenderer: React.FC<NavigationRendererProps> = ({ element }) => {
  const [isOpen, setIsOpen] = useState(false);
  const columns = parseJson<MegaMenuColumn[]>(element.content, DEFAULT_MEGA_MENU_COLUMNS);
  const styles = element.styles;

  const colCount = Number(styles.megaMenuColumns || 3);
  const gridClass =
    colCount === 2
      ? "grid-cols-2"
      : colCount === 4
      ? "grid-cols-4"
      : "grid-cols-3";

  return (
    <div className="w-full relative select-none">
      {/* Mega Menu Top Trigger Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            onMouseEnter={() => setIsOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95"
          >
            <span>Mega Menu Explorer</span>
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <span className="hidden sm:inline-block text-xs font-medium text-slate-400">
            Hover or click button to preview large multi-column dropdown
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
          <a href="#features" className="hover:text-blue-600 transition">Features</a>
          <a href="#pricing" className="hover:text-blue-600 transition">Pricing</a>
          <a href="#contact" className="hover:text-blue-600 transition">Contact</a>
        </div>
      </div>

      {/* Large Multi-Column Mega Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute top-full left-0 z-50 mt-3 w-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-3 duration-200"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Multi-Column Links Section */}
            <div className={`grid ${gridClass} gap-6 flex-1`}>
              {columns.map((col) => (
                <div key={col.id} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    {col.icon && <span>{col.icon}</span>}
                    <span>{col.title}</span>
                  </div>
                  <div className="space-y-1">
                    {col.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url || "#"}
                        className="group flex flex-col rounded-lg p-2 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600">
                            {link.label}
                          </span>
                          {link.badge && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[8px] font-black text-blue-700">
                              {link.badge}
                            </span>
                          )}
                        </div>
                        {link.description && (
                          <span className="text-[10px] text-slate-400 line-clamp-1">
                            {link.description}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Optional Promotional Card / Banner */}
            {styles.megaMenuPromoEnabled !== "false" && (
              <div className="w-full lg:w-64 shrink-0 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 p-4 text-white shadow-md flex flex-col justify-between">
                <div>
                  <span className="inline-block rounded-full bg-blue-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-300">
                    {styles.megaMenuPromoBadge || "PROMO"}
                  </span>
                  <h4 className="mt-2 text-sm font-extrabold leading-snug">
                    {styles.megaMenuPromoTitle || "Pro UI Toolkit"}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">
                    {styles.megaMenuPromoText || "Access all responsive components & presets."}
                  </p>
                </div>
                <a
                  href={styles.megaMenuPromoButtonUrl || "#"}
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-blue-500 transition"
                >
                  {styles.megaMenuPromoButtonText || "Learn More →"}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================================
// 5. F-227: Breadcrumbs Renderer
// ==========================================================
export const BreadcrumbsRenderer: React.FC<NavigationRendererProps> = ({ element }) => {
  const items = parseJson<BreadcrumbItem[]>(element.content, DEFAULT_BREADCRUMBS);
  const styles = element.styles;

  const renderSeparator = () => {
    switch (styles.breadcrumbSeparator) {
      case "arrow":
        return <span className="mx-2 text-slate-400">→</span>;
      case "bullet":
        return <span className="mx-2 text-slate-400">•</span>;
      case "pipe":
        return <span className="mx-2 text-slate-400">|</span>;
      case "slash":
        return <span className="mx-2 text-slate-400">/</span>;
      case "chevron":
      default:
        return (
          <svg className="mx-1.5 h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        );
    }
  };

  return (
    <div className="w-full flex items-center justify-between select-none">
      <nav aria-label="Breadcrumb" className="flex items-center flex-wrap text-xs">
        {items.map((crumb, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === items.length - 1;

          return (
            <React.Fragment key={crumb.id || idx}>
              {idx > 0 && renderSeparator()}
              {isLast ? (
                <span
                  className="font-bold truncate max-w-[200px]"
                  style={{ color: styles.breadcrumbActiveColor || "#2563eb" }}
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <a
                  href={crumb.url || "#"}
                  className="flex items-center gap-1 font-medium text-slate-500 hover:text-blue-600 transition"
                >
                  {isFirst && styles.breadcrumbHomeIcon !== "false" && (
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  )}
                  <span>{crumb.label}</span>
                </a>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {styles.breadcrumbShowSchema !== "false" && (
        <span className="hidden sm:inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">
          <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
          </svg>
          Schema.org JSON-LD Active
        </span>
      )}
    </div>
  );
};

// ==========================================================
// 6. F-228: Menu Anchor Renderer
// ==========================================================
export const MenuAnchorRenderer: React.FC<NavigationRendererProps> = ({ element, isPreview }) => {
  const styles = element.styles;
  const anchorId = styles.anchorId || "features-section";

  if (isPreview) {
    return (
      <div
        id={anchorId}
        style={{ scrollMarginTop: styles.anchorScrollOffset || "80px" }}
        className="w-full h-0 pointer-events-none"
      />
    );
  }

  return (
    <div
      id={anchorId}
      className="w-full rounded-xl border border-dashed border-indigo-300 bg-indigo-50/70 p-3 my-2 flex items-center justify-between text-indigo-900 select-none shadow-xs"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
          ⚓
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold font-mono text-indigo-700">#{anchorId}</span>
            <span className="rounded bg-indigo-200 px-1.5 py-0.2 text-[9px] font-bold text-indigo-800">
              Anchor Pin
            </span>
          </div>
          <span className="text-[10px] text-indigo-600">
            Scroll Offset: {styles.anchorScrollOffset || "80px"} | Smooth: {styles.anchorSmoothScroll || "true"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const el = document.getElementById(anchorId);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
        className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 shadow-xs transition"
      >
        Test Jump
      </button>
    </div>
  );
};

// ==========================================================
// 7. F-229: Post Navigation Renderer
// ==========================================================
export const PostNavigationRenderer: React.FC<NavigationRendererProps> = ({ element }) => {
  const styles = element.styles;

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
      {/* Previous Post Card */}
      <a
        href={styles.postNavPrevUrl || "#"}
        className="group flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
        style={{ backgroundColor: styles.postNavCardBg || "#ffffff" }}
      >
        {styles.postNavShowImages !== "false" && styles.postNavPrevImage && (
          <img
            src={styles.postNavPrevImage}
            alt="Previous Post Thumbnail"
            className="h-12 w-12 rounded-lg object-cover border border-slate-100 shrink-0 group-hover:scale-105 transition-transform"
          />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors">
            {styles.postNavPrevLabel || "← Previous Post"}
          </span>
          <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 mt-0.5">
            {styles.postNavPrevTitle || "Previous Article Title"}
          </h4>
        </div>
      </a>

      {/* Next Post Card */}
      <a
        href={styles.postNavNextUrl || "#"}
        className="group flex items-center justify-end text-right gap-3.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
        style={{ backgroundColor: styles.postNavCardBg || "#ffffff" }}
      >
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors">
            {styles.postNavNextLabel || "Next Post →"}
          </span>
          <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 mt-0.5">
            {styles.postNavNextTitle || "Next Article Title"}
          </h4>
        </div>
        {styles.postNavShowImages !== "false" && styles.postNavNextImage && (
          <img
            src={styles.postNavNextImage}
            alt="Next Post Thumbnail"
            className="h-12 w-12 rounded-lg object-cover border border-slate-100 shrink-0 group-hover:scale-105 transition-transform"
          />
        )}
      </a>
    </div>
  );
};

// ==========================================================
// 8. F-230: Off Canvas Navigation Renderer
// ==========================================================
export const OffCanvasNavRenderer: React.FC<NavigationRendererProps> = ({ element }) => {
  const [isOpen, setIsOpen] = useState(false);
  const items = parseJson<NavMenuItem[]>(element.content, DEFAULT_NAV_MENU_ITEMS);
  const styles = element.styles;

  return (
    <div className="relative inline-block select-none">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition active:scale-95"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>{styles.offCanvasTriggerLabel || "Menu"}</span>
      </button>

      {/* Off-Canvas Slide Drawer & Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          style={{ backgroundColor: styles.offCanvasOverlayColor || "rgba(15, 23, 42, 0.6)" }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="h-full bg-slate-900 text-white p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200"
            style={{
              width: styles.offCanvasWidth || "340px",
              backgroundColor: styles.offCanvasBgColor || "#0f172a",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-sm font-extrabold text-white">
                  {styles.offCanvasTitle || "Forge Navigation"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                >
                  ✕
                </button>
              </div>

              {/* Optional Search in Drawer */}
              {styles.offCanvasShowSearch !== "false" && (
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Search navigation..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Navigation Links */}
              <div className="mt-6 space-y-2">
                {items.map((item) => (
                  <a
                    key={item.id}
                    href={item.url || "#"}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[8px] font-bold text-blue-400">
                        {item.badge}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>

            {/* Drawer Footer Socials */}
            {styles.offCanvasShowSocials !== "false" && (
              <div className="border-t border-slate-800 pt-4 text-center text-xs text-slate-500">
                <p className="text-[10px]">Follow our updates</p>
                <div className="mt-2 flex justify-center gap-3 text-slate-400 font-bold">
                  <span>Twitter</span> • <span>GitHub</span> • <span>Discord</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================================
// 9. F-231: Site Search Renderer
// ==========================================================
export const SiteSearchRenderer: React.FC<NavigationRendererProps> = ({ element }) => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const sampleResults = parseJson<SearchSampleResult[]>(element.content, DEFAULT_SEARCH_RESULTS);
  const styles = element.styles;

  const filtered = query.trim()
    ? sampleResults.filter((r) =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.snippet.toLowerCase().includes(query.toLowerCase())
      )
    : sampleResults;

  return (
    <div className="w-full relative select-none">
      {/* Search Input Bar */}
      <div className="flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
        <svg className="h-4 w-4 text-slate-400 shrink-0 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={styles.searchPlaceholder || "Search site..."}
          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-slate-400 hover:text-slate-600 text-xs px-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Live Search Autocomplete Results Dropdown Preview */}
      {isFocused && (
        <div className="absolute top-full left-0 z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Results ({filtered.length})</span>
            <span className="text-blue-600">Press ↵ to view all</span>
          </div>
          <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-xs text-slate-400">No results found for &quot;{query}&quot;</p>
            ) : (
              filtered.map((item) => (
                <a
                  key={item.id}
                  href={item.url || "#"}
                  className="group flex flex-col rounded-lg p-2 hover:bg-slate-50 transition text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                      {item.title}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[8px] font-extrabold text-slate-500">
                      {item.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{item.snippet}</span>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================================
// 10. F-232: Search Form Renderer
// ==========================================================
export const SearchFormRenderer: React.FC<NavigationRendererProps> = ({ element }) => {
  const styles = element.styles;

  return (
    <form
      action={styles.formActionUrl || "/search"}
      method={styles.formMethod || "GET"}
      onSubmit={(e) => e.preventDefault()}
      className="w-full flex items-center gap-2 select-none"
    >
      <div className="flex-1 flex items-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
        <input
          type="text"
          name={styles.formParamName || "q"}
          placeholder={styles.formPlaceholder || "Search..."}
          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
        />
      </div>

      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95 shrink-0"
        style={{
          backgroundColor: styles.formButtonBg || "#2563eb",
          color: styles.formButtonTextColor || "#ffffff",
        }}
      >
        {styles.formButtonIcon !== "false" && (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
        <span>{styles.formButtonText || "Search"}</span>
      </button>
    </form>
  );
};

// ==========================================================
// 11. F-233: Taxonomy Filter Renderer
// ==========================================================
export const TaxonomyFilterRenderer: React.FC<NavigationRendererProps> = ({ element }) => {
  const items = parseJson<TaxonomyItem[]>(element.content, DEFAULT_TAXONOMY_ITEMS);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(["all"]);
  const styles = element.styles;

  const handleToggle = (slug: string) => {
    if (styles.taxonomySelectionMode === "multi") {
      if (slug === "all") {
        setSelectedSlugs(["all"]);
      } else {
        const withoutAll = selectedSlugs.filter((s) => s !== "all");
        if (withoutAll.includes(slug)) {
          const next = withoutAll.filter((s) => s !== slug);
          setSelectedSlugs(next.length ? next : ["all"]);
        } else {
          setSelectedSlugs([...withoutAll, slug]);
        }
      }
    } else {
      setSelectedSlugs([slug]);
    }
  };

  return (
    <div className="w-full flex items-center flex-wrap gap-2 select-none">
      {items.map((tax) => {
        const isActive = selectedSlugs.includes(tax.slug);

        return (
          <button
            key={tax.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle(tax.slug);
            }}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            style={{
              backgroundColor: isActive
                ? styles.taxonomyActiveBg || "#2563eb"
                : styles.taxonomyItemBg || "#f1f5f9",
              color: isActive
                ? styles.taxonomyActiveTextColor || "#ffffff"
                : styles.taxonomyItemTextColor || "#475569",
            }}
          >
            <span>{tax.name}</span>
            {styles.taxonomyShowCounts !== "false" && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {tax.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ==========================================================
// Main Dispatcher Component
// ==========================================================
export const NavigationElementRenderer: React.FC<NavigationRendererProps> = (props) => {
  switch (props.element.type) {
    case "nav-menu":
      return <NavMenuRenderer {...props} />;
    case "wp-menu":
      return <WpMenuRenderer {...props} />;
    case "menu-widget":
      return <MenuWidgetRenderer {...props} />;
    case "mega-menu":
      return <MegaMenuRenderer {...props} />;
    case "breadcrumbs":
      return <BreadcrumbsRenderer {...props} />;
    case "menu-anchor":
      return <MenuAnchorRenderer {...props} />;
    case "post-nav":
      return <PostNavigationRenderer {...props} />;
    case "off-canvas-nav":
      return <OffCanvasNavRenderer {...props} />;
    case "site-search":
      return <SiteSearchRenderer {...props} />;
    case "search-form":
      return <SearchFormRenderer {...props} />;
    case "taxonomy-filter":
      return <TaxonomyFilterRenderer {...props} />;
    default:
      return null;
  }
};
