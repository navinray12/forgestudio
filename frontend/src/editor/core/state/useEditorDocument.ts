import { useMemo } from "react";
import type { ForgeEditorDocument, PageConfig, EditorElement, GlobalStylesConfig } from "../types";
import { getActivePage, getPageById, getPageElements } from "../selectors/documentSelectors";

export interface UseEditorDocumentOptions {
  /**
   * Optional full or partial ForgeEditorDocument object.
   */
  document?: Partial<ForgeEditorDocument> | null;
  /**
   * Active page ID pointer.
   */
  activePageId?: string;
  /**
   * Standalone pages array if passing pages directly.
   */
  pages?: PageConfig[];
  /**
   * Standalone elements array if passing elements directly.
   */
  elements?: EditorElement[];
}

const DEFAULT_GLOBAL_STYLES: GlobalStylesConfig = {
  colors: { primary: "#2563eb", secondary: "#475569", accent: "#f59e0b", background: "#ffffff", text: "#0f172a" },
  typography: { fontFamily: "Inter, sans-serif", headingFontFamily: "Inter, sans-serif", baseFontSize: "16px" },
  buttonStyles: { borderRadius: "8px", padding: "10px 20px" },
};

/**
 * useEditorDocument
 * React adapter hook providing reactive document state reading over Phase 3 document selectors.
 * Operates dynamically on passed props/state to prevent duplicate stale state.
 */
export function useEditorDocument(options: UseEditorDocumentOptions = {}) {
  const { document, activePageId = "home", pages, elements } = options;

  const docRef = useMemo<ForgeEditorDocument | null>(() => {
    if (document) {
      return {
        version: document.version ?? 1,
        homePageId: document.homePageId ?? "home",
        pages: document.pages ?? pages ?? [],
        siteSettings: document.siteSettings ?? { siteName: "My Website" },
        globalStyles: document.globalStyles ?? DEFAULT_GLOBAL_STYLES,
        siteParts: document.siteParts ?? { header: { enabled: true, elements: [] }, footer: { enabled: true, elements: [] } },
        navigation: document.navigation ?? [],
        publishing: document.publishing ?? { status: "DRAFT", publishedVersion: 1 },
        deployment: document.deployment ?? { provider: "static" },
        elements: document.elements ?? elements ?? [],
        pageSettings: document.pageSettings,
        breakpoints: document.breakpoints,
        popups: document.popups,
        pageCss: document.pageCss,
        globalSettings: document.globalSettings,
      };
    }

    if (pages || elements) {
      return {
        version: 1,
        homePageId: "home",
        pages: pages ?? [],
        siteSettings: { siteName: "My Website" },
        globalStyles: DEFAULT_GLOBAL_STYLES,
        siteParts: { header: { enabled: true, elements: [] }, footer: { enabled: true, elements: [] } },
        navigation: [],
        publishing: { status: "DRAFT", publishedVersion: 1 },
        deployment: { provider: "static" },
        elements: elements ?? [],
      };
    }

    return null;
  }, [document, pages, elements]);

  const activePage = useMemo(() => {
    if (!docRef) return null;
    return getActivePage(docRef, activePageId);
  }, [docRef, activePageId]);

  const activePageElements = useMemo(() => {
    if (!docRef) return [];
    return getPageElements(docRef, activePageId);
  }, [docRef, activePageId]);

  return {
    document: docRef,
    activePageId,
    activePage,
    activePageElements,
  };
}
