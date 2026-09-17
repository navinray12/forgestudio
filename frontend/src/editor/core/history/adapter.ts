import type { ForgeEditorDocument } from "../types/document";
import type {
  PageConfig,
  EditorElement,
  SitePartsConfig,
  PublishingState,
  DeploymentConfig,
  Breakpoint,
} from "../types/document";
import { cloneDocument } from "./documentHistory";

export interface EditorStateAdapterState {
  elements: EditorElement[];
  pages: PageConfig[];
  pageSettings?: any;
  homePageId: string;
  siteParts: SitePartsConfig;
  globalSettings?: any;
  popups?: any[];
  pageCss?: string;
  breakpoints?: Breakpoint[];
  publishing: PublishingState;
  deployment: DeploymentConfig;
}

export interface EditorStateAdapterContext {
  activePageId: string;
  canvasMode: "page" | "header" | "footer";
}

function cloneObject<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Creates a canonical ForgeEditorDocument snapshot from live editor state and adapter context.
 */
export function createDocumentSnapshotFromState(
  state: EditorStateAdapterState,
  context?: EditorStateAdapterContext
): ForgeEditorDocument {
  const inputPages: PageConfig[] = state.pages ? cloneObject(state.pages) : [];
  const activePageId = context?.activePageId || state.homePageId || (inputPages[0] ? inputPages[0].id : "home");
  const canvasMode = context?.canvasMode || "page";

  const currentElements: EditorElement[] = state.elements ? cloneObject(state.elements) : [];
  const currentSiteParts: SitePartsConfig = state.siteParts
    ? cloneObject(state.siteParts)
    : { header: { enabled: true, elements: [] }, footer: { enabled: true, elements: [] } };

  let updatedHeaderElements = currentSiteParts.header?.elements || [];
  let updatedFooterElements = currentSiteParts.footer?.elements || [];

  if (canvasMode === "header") {
    updatedHeaderElements = currentElements;
  } else if (canvasMode === "footer") {
    updatedFooterElements = currentElements;
  }

  const updatedSiteParts: SitePartsConfig = {
    header: {
      enabled: currentSiteParts.header?.enabled ?? true,
      elements: updatedHeaderElements,
    },
    footer: {
      enabled: currentSiteParts.footer?.enabled ?? true,
      elements: updatedFooterElements,
    },
  };

  const updatedPages: PageConfig[] = inputPages.map((p) => {
    if (p.id === activePageId && canvasMode === "page") {
      return {
        ...p,
        elements: currentElements,
        pageSettings: state.pageSettings ? cloneObject(state.pageSettings) : p.pageSettings,
      };
    }
    return p;
  });

  const activePageFound = updatedPages.some((p) => p.id === activePageId);
  if (!activePageFound && canvasMode === "page") {
    updatedPages.push({
      id: activePageId,
      name: (state.pageSettings?.title as string) || "Page",
      slug: (state.pageSettings?.path as string) || "/",
      elements: currentElements,
      pageSettings: state.pageSettings ? cloneObject(state.pageSettings) : { title: "Page", path: "/" },
      isHome: activePageId === state.homePageId,
    });
  }

  const globalStylesVal = state.globalSettings?.globalStyles || {};

  const doc: ForgeEditorDocument = {
    version: 1,
    homePageId: state.homePageId || activePageId || "home",
    pages: updatedPages,
    siteSettings: {
      siteName: (state.globalSettings?.siteIdentity?.name as string) || "My Website",
      siteLanguage: (state.pageSettings?.siteLanguage as string) || "en",
      customHead: (state.pageSettings?.customHead as string) || "",
      isMaintenanceMode: Boolean(state.pageSettings?.isMaintenanceMode),
    },
    globalStyles: globalStylesVal,
    siteParts: updatedSiteParts,
    navigation: [],
    publishing: state.publishing ? cloneObject(state.publishing) : { status: "DRAFT", publishedVersion: 1 },
    deployment: state.deployment ? cloneObject(state.deployment) : { provider: "static" },
    elements: canvasMode === "page" ? currentElements : (updatedPages.find((p) => p.id === activePageId)?.elements || []),
    pageSettings: state.pageSettings ? cloneObject(state.pageSettings) : undefined,
    breakpoints: state.breakpoints ? cloneObject(state.breakpoints) : undefined,
    popups: state.popups ? cloneObject(state.popups) : undefined,
    pageCss: state.pageCss ?? "",
    globalSettings: state.globalSettings ? cloneObject(state.globalSettings) : undefined,
  };

  return cloneDocument(doc);
}

/**
 * Restores editor state from a canonical ForgeEditorDocument snapshot and adapter context.
 */
export function restoreDocumentSnapshot(
  document: ForgeEditorDocument,
  context: EditorStateAdapterContext
): EditorStateAdapterState {
  const clonedDoc = cloneDocument(document);
  const activePageId = context.activePageId || clonedDoc.homePageId || (clonedDoc.pages[0] ? clonedDoc.pages[0].id : "home");
  const canvasMode = context.canvasMode || "page";

  const targetPage = clonedDoc.pages ? clonedDoc.pages.find((p) => p.id === activePageId) : undefined;

  let activeElements: EditorElement[] = [];
  if (canvasMode === "header") {
    activeElements = clonedDoc.siteParts?.header?.elements || [];
  } else if (canvasMode === "footer") {
    activeElements = clonedDoc.siteParts?.footer?.elements || [];
  } else {
    activeElements = targetPage?.elements || clonedDoc.elements || [];
  }

  const activePageSettings = targetPage?.pageSettings || clonedDoc.pageSettings || {
    title: targetPage?.name || "Page",
    path: targetPage?.slug || "/",
  };

  return {
    elements: cloneObject(activeElements),
    pages: clonedDoc.pages ? cloneObject(clonedDoc.pages) : [],
    pageSettings: cloneObject(activePageSettings),
    homePageId: clonedDoc.homePageId || activePageId,
    siteParts: clonedDoc.siteParts ? cloneObject(clonedDoc.siteParts) : { header: { enabled: true, elements: [] }, footer: { enabled: true, elements: [] } },
    globalSettings: clonedDoc.globalSettings ? cloneObject(clonedDoc.globalSettings) : {},
    popups: clonedDoc.popups ? cloneObject(clonedDoc.popups) : [],
    pageCss: clonedDoc.pageCss || "",
    breakpoints: clonedDoc.breakpoints ? cloneObject(clonedDoc.breakpoints) : [],
    publishing: clonedDoc.publishing ? cloneObject(clonedDoc.publishing) : { status: "DRAFT", publishedVersion: 1 },
    deployment: clonedDoc.deployment ? cloneObject(clonedDoc.deployment) : { provider: "static" },
  };
}
