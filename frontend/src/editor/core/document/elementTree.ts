import type { EditorElement } from "../types";

/**
 * Helper to get child elements of an element.
 * Checks both `children` and fallback `elements` properties.
 */
function getDirectChildren(el: EditorElement): EditorElement[] {
  if (Array.isArray(el.children)) return el.children;
  if (Array.isArray((el as any).elements)) return (el as any).elements;
  return [];
}

/**
 * findElement
 * Recursively searches an element tree for an element by ID.
 */
export function findElement(
  tree: EditorElement[],
  targetId: string
): EditorElement | null {
  if (!Array.isArray(tree) || !targetId) return null;

  for (const node of tree) {
    if (node.id === targetId) return node;
    const children = getDirectChildren(node);
    if (children.length > 0) {
      const found = findElement(children, targetId);
      if (found) return found;
    }
  }

  return null;
}

/**
 * findParent
 * Recursively searches tree to find the parent element of targetId.
 */
export function findParent(
  tree: EditorElement[],
  targetId: string,
  parent: EditorElement | null = null
): EditorElement | null {
  if (!Array.isArray(tree) || !targetId) return null;

  for (const node of tree) {
    if (node.id === targetId) return parent;
    const children = getDirectChildren(node);
    if (children.length > 0) {
      const found = findParent(children, targetId, node);
      if (found !== null) return found;
    }
  }

  return null;
}

/**
 * containsElement
 * Returns true if targetId exists anywhere within the element tree.
 */
export function containsElement(
  tree: EditorElement[],
  targetId: string
): boolean {
  return findElement(tree, targetId) !== null;
}

/**
 * getChildren
 * Returns direct children array of element targetId.
 */
export function getChildren(
  tree: EditorElement[],
  targetId: string
): EditorElement[] {
  const node = findElement(tree, targetId);
  return node ? getDirectChildren(node) : [];
}

/**
 * getElementPath
 * Returns index path array to targetId within tree.
 */
export function getElementPath(
  tree: EditorElement[],
  targetId: string,
  currentPath: number[] = []
): number[] | null {
  if (!Array.isArray(tree) || !targetId) return null;

  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    const path = [...currentPath, i];
    if (node.id === targetId) return path;

    const children = getDirectChildren(node);
    if (children.length > 0) {
      const result = getElementPath(children, targetId, path);
      if (result) return result;
    }
  }

  return null;
}

/**
 * isDescendant
 * Returns true if targetId is a descendant of ancestorId.
 */
export function isDescendant(
  tree: EditorElement[],
  ancestorId: string,
  targetId: string
): boolean {
  const ancestor = findElement(tree, ancestorId);
  if (!ancestor) return false;
  const children = getDirectChildren(ancestor);
  return containsElement(children, targetId);
}

/**
 * getElementIndex
 * Returns index of targetId in its immediate parent's children array, or -1 if not found.
 */
export function getElementIndex(
  tree: EditorElement[],
  targetId: string
): number {
  if (!Array.isArray(tree) || !targetId) return -1;
  const parent = findParent(tree, targetId);
  const siblings = parent ? getDirectChildren(parent) : tree;
  return siblings.findIndex((el) => el.id === targetId);
}
