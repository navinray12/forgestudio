import type { ForgeEditorDocument, EditorElement, PageConfig } from "../types";
import { findElement, findParent } from "./elementTree";

/**
 * Immutably map element tree to update element matching targetId.
 */
function mapTree(
  tree: EditorElement[],
  targetId: string,
  transform: (node: EditorElement) => EditorElement
): EditorElement[] {
  return tree.map((node) => {
    if (node.id === targetId) {
      return transform(node);
    }
    const children = Array.isArray(node.children) ? node.children : Array.isArray((node as any).elements) ? (node as any).elements : null;
    if (children) {
      const updatedChildren = mapTree(children, targetId, transform);
      return {
        ...node,
        ...(Array.isArray(node.children) ? { children: updatedChildren } : { elements: updatedChildren }),
      };
    }
    return node;
  });
}

/**
 * Immutably filter element tree to remove element matching targetId.
 */
function filterTree(tree: EditorElement[], targetId: string): EditorElement[] {
  return tree
    .filter((node) => node.id !== targetId)
    .map((node) => {
      const children = Array.isArray(node.children) ? node.children : Array.isArray((node as any).elements) ? (node as any).elements : null;
      if (children) {
        const updatedChildren = filterTree(children, targetId);
        return {
          ...node,
          ...(Array.isArray(node.children) ? { children: updatedChildren } : { elements: updatedChildren }),
        };
      }
      return node;
    });
}

/**
 * Immutably insert element into tree at target location.
 */
function insertIntoTree(
  tree: EditorElement[],
  targetId: string | null,
  newElement: EditorElement,
  position: "inside" | "before" | "after" = "inside"
): EditorElement[] {
  if (!targetId) {
    return [...tree, newElement];
  }

  if (position === "before" || position === "after") {
    const index = tree.findIndex((node) => node.id === targetId);
    if (index !== -1) {
      const copy = [...tree];
      const insertIdx = position === "before" ? index : index + 1;
      copy.splice(insertIdx, 0, newElement);
      return copy;
    }
  }

  return tree.map((node) => {
    if (node.id === targetId && position === "inside") {
      const children = Array.isArray(node.children) ? node.children : Array.isArray((node as any).elements) ? (node as any).elements : [];
      const updatedChildren = [...children, newElement];
      return {
        ...node,
        ...(Array.isArray(node.children) ? { children: updatedChildren } : { elements: updatedChildren }),
      };
    }
    const children = Array.isArray(node.children) ? node.children : Array.isArray((node as any).elements) ? (node as any).elements : null;
    if (children) {
      return {
        ...node,
        ...(Array.isArray(node.children)
          ? { children: insertIntoTree(children, targetId, newElement, position) }
          : { elements: insertIntoTree(children, targetId, newElement, position) }),
      };
    }
    return node;
  });
}

/**
 * Helper to update document elements array for current/target page or fallback root.
 */
function updateDocumentTree(
  doc: ForgeEditorDocument,
  pageId: string | undefined,
  treeUpdater: (tree: EditorElement[]) => EditorElement[]
): ForgeEditorDocument {
  if (Array.isArray(doc.pages) && doc.pages.length > 0) {
    const targetPageId = pageId || doc.homePageId || doc.pages[0].id;
    const updatedPages = doc.pages.map((p) => {
      if (p.id === targetPageId || p.slug === targetPageId) {
        return {
          ...p,
          elements: treeUpdater(p.elements || []),
        };
      }
      return p;
    });
    return {
      ...doc,
      pages: updatedPages,
      elements: treeUpdater(doc.elements || []),
    };
  }

  return {
    ...doc,
    elements: treeUpdater(doc.elements || []),
  };
}

/**
 * updateElementProps
 * Immutably updates non-style properties of target element.
 */
export function updateElementProps(
  doc: ForgeEditorDocument,
  elementId: string,
  propsPatch: Partial<EditorElement>
): ForgeEditorDocument {
  return updateDocumentTree(doc, undefined, (tree) =>
    mapTree(tree, elementId, (node) => ({
      ...node,
      ...propsPatch,
    }))
  );
}

/**
 * updateElementStyles
 * Immutably updates inline styles of target element.
 */
export function updateElementStyles(
  doc: ForgeEditorDocument,
  elementId: string,
  stylesPatch: Partial<EditorElement["styles"]>
): ForgeEditorDocument {
  return updateDocumentTree(doc, undefined, (tree) =>
    mapTree(tree, elementId, (node) => ({
      ...node,
      styles: {
        ...(node.styles || {}),
        ...stylesPatch,
      },
    }))
  );
}

/**
 * addElement
 * Immutably adds new element to document at targetId location.
 */
export function addElement(
  doc: ForgeEditorDocument,
  targetId: string | null,
  newElement: EditorElement,
  pageId?: string
): ForgeEditorDocument {
  return updateDocumentTree(doc, pageId, (tree) =>
    insertIntoTree(tree, targetId, newElement, targetId ? "inside" : "after")
  );
}

/**
 * removeElement
 * Immutably removes element from document.
 */
export function removeElement(
  doc: ForgeEditorDocument,
  elementId: string,
  pageId?: string
): ForgeEditorDocument {
  return updateDocumentTree(doc, pageId, (tree) => filterTree(tree, elementId));
}

/**
 * duplicateElement
 * Immutably duplicates element by appending a cloned copy with new IDs after target element.
 */
export function duplicateElement(
  doc: ForgeEditorDocument,
  elementId: string,
  pageId?: string
): ForgeEditorDocument {
  let elementToClone: EditorElement | null = null;
  updateDocumentTree(doc, pageId, (tree) => {
    elementToClone = findElement(tree, elementId);
    return tree;
  });

  if (!elementToClone) return doc;

  const cloneNode = (node: EditorElement): EditorElement => {
    const newId = `${node.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const children = Array.isArray(node.children)
      ? node.children.map(cloneNode)
      : Array.isArray((node as any).elements)
      ? (node as any).elements.map(cloneNode)
      : undefined;
    return {
      ...node,
      id: newId,
      ...(children ? (Array.isArray(node.children) ? { children } : { elements: children }) : {}),
    };
  };

  const duplicated = cloneNode(elementToClone);
  return updateDocumentTree(doc, pageId, (tree) =>
    insertIntoTree(tree, elementId, duplicated, "after")
  );
}

/**
 * moveElement
 * Immutably moves source element to target element position.
 */
export function moveElement(
  doc: ForgeEditorDocument,
  sourceId: string,
  targetId: string,
  position: "before" | "after" | "inside" = "after"
): ForgeEditorDocument {
  let sourceNode: EditorElement | null = null;
  
  // Find source element
  updateDocumentTree(doc, undefined, (tree) => {
    sourceNode = findElement(tree, sourceId);
    return tree;
  });

  if (!sourceNode) return doc;

  // Remove source, then insert at target
  const docWithoutSource = updateDocumentTree(doc, undefined, (tree) =>
    filterTree(tree, sourceId)
  );

  return updateDocumentTree(docWithoutSource, undefined, (tree) =>
    insertIntoTree(tree, targetId, sourceNode!, position)
  );
}
