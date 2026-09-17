import type { ForgeEditorDocument, PageConfig, EditorElement } from "../types";
import { findElement } from "../document/elementTree";

/**
 * getPageById
 * Returns a page by ID, slug, or path matching pageId.
 */
export function getPageById(
  doc: ForgeEditorDocument,
  pageId: string
): PageConfig | null {
  if (!doc || !Array.isArray(doc.pages)) return null;
  const normalized = pageId.toLowerCase().trim();
  return (
    doc.pages.find(
      (p) =>
        p.id === pageId ||
        p.slug === pageId ||
        p.slug === `/${pageId}` ||
        p.name.toLowerCase() === normalized
    ) || null
  );
}

/**
 * getActivePage
 * Returns the target page matching activePageId, or defaults to home page.
 */
export function getActivePage(
  doc: ForgeEditorDocument,
  activePageId?: string
): PageConfig | null {
  if (!doc || !Array.isArray(doc.pages) || doc.pages.length === 0) return null;
  if (activePageId) {
    const page = getPageById(doc, activePageId);
    if (page) return page;
  }
  return doc.pages.find((p) => p.isHome || p.slug === "/" || p.id === "home") || doc.pages[0];
}

/**
 * getPageElements
 * Returns the elements array for a given pageId or active home page.
 */
export function getPageElements(
  doc: ForgeEditorDocument,
  pageId?: string
): EditorElement[] {
  const page = getActivePage(doc, pageId);
  if (page && Array.isArray(page.elements)) {
    return page.elements;
  }
  if (Array.isArray(doc.elements)) {
    return doc.elements;
  }
  return [];
}

/**
 * getRootElements
 * Returns root elements depending on canvasMode ("page", "header", "footer").
 */
export function getRootElements(
  doc: ForgeEditorDocument,
  pageId?: string,
  canvasMode: "page" | "header" | "footer" = "page"
): EditorElement[] {
  if (canvasMode === "header") {
    return doc.siteParts?.header?.elements || [];
  }
  if (canvasMode === "footer") {
    return doc.siteParts?.footer?.elements || [];
  }
  return getPageElements(doc, pageId);
}

/**
 * getElementById
 * Searches the entire document (pages, header, footer) for an element by ID.
 */
export function getElementById(
  doc: ForgeEditorDocument,
  elementId: string
): EditorElement | null {
  if (!doc || !elementId) return null;

  // Search pages
  if (Array.isArray(doc.pages)) {
    for (const page of doc.pages) {
      if (Array.isArray(page.elements)) {
        const found = findElement(page.elements, elementId);
        if (found) return found;
      }
    }
  }

  // Search root elements
  if (Array.isArray(doc.elements)) {
    const found = findElement(doc.elements, elementId);
    if (found) return found;
  }

  // Search header
  if (doc.siteParts?.header?.elements) {
    const found = findElement(doc.siteParts.header.elements, elementId);
    if (found) return found;
  }

  // Search footer
  if (doc.siteParts?.footer?.elements) {
    const found = findElement(doc.siteParts.footer.elements, elementId);
    if (found) return found;
  }

  return null;
}

/**
 * getElementsByIds
 * Searches and returns array of elements for multiple element IDs.
 */
export function getElementsByIds(
  doc: ForgeEditorDocument,
  elementIds: string[]
): EditorElement[] {
  if (!doc || !Array.isArray(elementIds)) return [];
  const results: EditorElement[] = [];
  for (const id of elementIds) {
    const el = getElementById(doc, id);
    if (el) results.push(el);
  }
  return results;
}
