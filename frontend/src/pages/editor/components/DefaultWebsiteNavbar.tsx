import React, { useState } from "react";
import { Menu, X, Edit3, Globe, ArrowRight } from "lucide-react";
import type { PageConfig } from "../types";

export interface DefaultWebsiteNavbarProps {
  websiteName?: string;
  pages: PageConfig[];
  activePageId?: string;
  isPreview?: boolean;
  activeDevice?: "desktop" | "tablet" | "mobile";
  onNavigatePage: (page: PageConfig) => void;
  onEditHeader?: () => void;
}

export const DefaultWebsiteNavbar: React.FC<DefaultWebsiteNavbarProps> = ({
  websiteName = "ForgeStudio",
  pages = [],
  activePageId,
  isPreview = false,
  activeDevice = "desktop",
  onNavigatePage,
  onEditHeader,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Fallback nav links if pages array is empty
  const navPages: PageConfig[] =
    pages.length > 0
      ? pages
      : [
          { id: "home", name: "Home", slug: "/", elements: [], isHome: true },
          { id: "about", name: "About", slug: "/about", elements: [] },
          { id: "services", name: "Services", slug: "/services", elements: [] },
          { id: "contact", name: "Contact", slug: "/contact", elements: [] },
        ];

  const isMobileView = activeDevice === "mobile" || activeDevice === "tablet";

  return (
    <header className="relative w-full select-none">
      <div className="w-full rounded-2xl border border-slate-200/90 bg-white/95 px-5 py-3.5 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-slate-300">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div
            className={`flex items-center gap-3 ${
              isPreview ? "cursor-pointer" : ""
            }`}
            onClick={() => {
              if (isPreview) {
                const homePage = navPages.find((p) => p.isHome) || navPages[0];
                if (homePage) onNavigatePage(homePage);
              }
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-base shadow-md shadow-blue-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <span className="block font-black text-slate-900 text-sm tracking-tight leading-tight">
                {websiteName || "ForgeStudio"}
              </span>
              <span className="block text-[10px] font-medium text-slate-500">
                Official Website
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          {!isMobileView && (
            <nav
              className="hidden md:flex items-center gap-1.5"
              aria-label="Website Main Navigation"
            >
              {navPages.map((page) => {
                const isActive = page.id === activePageId;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigatePage(page);
                    }}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-50 text-blue-600 font-bold shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {page.name}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Actions & Mobile Toggle */}
          <div className="flex items-center gap-2">
            {/* CTA Button */}
            <button
              type="button"
              onClick={() => {
                const contactPage = navPages.find((p) =>
                  p.name.toLowerCase().includes("contact")
                );
                if (contactPage) {
                  onNavigatePage(contactPage);
                } else if (onEditHeader && !isPreview) {
                  onEditHeader();
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-black transition-colors cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick Edit Header Button in Canvas Mode */}
            {!isPreview && onEditHeader && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditHeader();
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-900 border border-purple-200 px-2.5 py-1.5 text-xs font-bold shadow-2xs transition cursor-pointer"
                title="Customize website navigation and header widgets"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Customize</span>
              </button>
            )}

            {/* Mobile / Tablet Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={`rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 transition cursor-pointer ${
                isMobileView ? "inline-flex" : "md:hidden inline-flex"
              }`}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="mt-3.5 border-t border-slate-100 pt-3 pb-1 space-y-1 animate-fadeIn">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
              Pages & Navigation
            </div>
            {navPages.map((page) => {
              const isActive = page.id === activePageId;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => {
                    onNavigatePage(page);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{page.name}</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {page.slug || (page.isHome ? "/" : `/${page.name.toLowerCase()}`)}
                  </span>
                </button>
              );
            })}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const contactPage = navPages.find((p) =>
                    p.name.toLowerCase().includes("contact")
                  );
                  if (contactPage) onNavigatePage(contactPage);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white shadow-sm hover:bg-black transition cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
