import { useCallback } from "react";
import type { EditorElement, ElementType, ElementStyles, DeviceMode, ElementState } from "../types";
import {
  generateId,
  findTreeElement,
  insertTreeElement,
  insertTreeElementAtPosition,
  updateTreeElement,
  deleteTreeElement,
  duplicateTreeElement,
  moveTreeElement,
  reorderTreeElement,
  isDescendant,
} from "../utils";
import { createDefaultElement } from "../defaults";

interface UseEditorMutationsProps {
  elements: EditorElement[];
  setElements: React.Dispatch<React.SetStateAction<EditorElement[]>>;
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  disabledWidgets?: ElementType[];
  pages?: any[];
  activePageId?: string;
}

export function useEditorMutations({
  elements,
  setElements,
  setSelectedId,
  setSelectedIds,
  disabledWidgets = [],
  pages = [],
  activePageId,
}: UseEditorMutationsProps) {
  /**
   * Add a new element of type at the target location.
   */
  const addElement = useCallback(
    (
      type: ElementType,
      targetId: string | null = null,
      position: "before" | "after" | "inside" | null = null
    ): EditorElement | null => {
      if (disabledWidgets.includes(type)) return null;

      const newEl = createDefaultElement(type);
      if (newEl.type === "button") {
        const defaultPage =
          pages.find((p) => p.id === activePageId) ||
          pages.find((p) => p.isHome || p.id === "home") ||
          pages[0];
        if (defaultPage) {
          newEl.pageId = defaultPage.id;
          newEl.href = defaultPage.slug.startsWith("/") ? defaultPage.slug : `/${defaultPage.slug}`;
          newEl.linkUrl = newEl.href;
          newEl.destinationType = "page";
          newEl.linkType = "page";
          newEl.target = "_self";
        }
      }

      setElements((prev) => {
        if (position) {
          return insertTreeElementAtPosition(prev, targetId, position, newEl);
        }
        return insertTreeElement(prev, targetId, newEl);
      });

      setSelectedId(newEl.id);
      setSelectedIds([newEl.id]);
      return newEl;
    },
    [disabledWidgets, pages, activePageId, setElements, setSelectedId, setSelectedIds]
  );

  /**
   * Update an element in the hierarchy immutably.
   */
  const updateElement = useCallback(
    (id: string, updater: (el: EditorElement) => EditorElement) => {
      setElements((prev) => updateTreeElement(prev, id, updater));
    },
    [setElements]
  );

  /**
   * Delete an element by ID.
   */
  const deleteElement = useCallback(
    (id: string) => {
      setElements((prev) => deleteTreeElement(prev, id));
      setSelectedId(null);
      setSelectedIds([]);
    },
    [setElements, setSelectedId, setSelectedIds]
  );

  /**
   * Duplicate an element by ID with new unique IDs recursively.
   */
  const duplicateElement = useCallback(
    (id: string): string | null => {
      let createdId: string | null = null;
      setElements((prev) => {
        const { updatedList, newId } = duplicateTreeElement(prev, id);
        createdId = newId;
        return updatedList;
      });
      if (createdId) {
        setSelectedId(createdId);
        setSelectedIds([createdId]);
      }
      return createdId;
    },
    [setElements, setSelectedId, setSelectedIds]
  );

  /**
   * Reorder an element up or down within its sibling list.
   */
  const reorderElement = useCallback(
    (id: string, direction: "up" | "down") => {
      setElements((prev) => reorderTreeElement(prev, id, direction));
    },
    [setElements]
  );

  /**
   * Move an existing element to a target position with cycle & parent-in-descendant safety checks.
   */
  const moveElement = useCallback(
    (
      sourceId: string,
      targetId: string | null,
      position: "before" | "after" | "inside" | null
    ): boolean => {
      if (sourceId === targetId) return false;
      if (targetId && isDescendant(elements, sourceId, targetId)) return false;

      const sourceEl = findTreeElement(elements, sourceId);
      if (!sourceEl) return false;

      setElements((prev) => moveTreeElement(prev, sourceId, targetId, position));
      setSelectedId(sourceId);
      setSelectedIds([sourceId]);
      return true;
    },
    [elements, setElements, setSelectedId, setSelectedIds]
  );

  /**
   * Update element style property for a specific device mode and hover/normal state.
   */
  const updateElementStyle = useCallback(
    (
      id: string,
      styleKey: keyof ElementStyles,
      value: any,
      device: DeviceMode = "desktop",
      state: ElementState = "normal"
    ) => {
      setElements((prev) =>
        updateTreeElement(prev, id, (el) => {
          if (state === "hover") {
            if (device === "desktop") {
              const newHover = { ...(el.hoverStyles || {}), [styleKey]: value };
              return { ...el, hoverStyles: newHover };
            } else {
              const deviceHover = { ...(el.responsiveHoverStyles?.[device] || {}), [styleKey]: value };
              return {
                ...el,
                responsiveHoverStyles: {
                  ...el.responsiveHoverStyles,
                  [device]: deviceHover,
                },
              };
            }
          } else {
            if (device === "desktop") {
              const newStyles = { ...(el.styles || {}), [styleKey]: value };
              return { ...el, styles: newStyles };
            } else {
              const deviceStyles = { ...(el.responsiveStyles?.[device] || {}), [styleKey]: value };
              return {
                ...el,
                responsiveStyles: {
                  ...el.responsiveStyles,
                  [device]: deviceStyles,
                },
              };
            }
          }
        })
      );
    },
    [setElements]
  );

  /**
   * Update text content of an element.
   */
  const updateElementContent = useCallback(
    (id: string, newContent: string) => {
      setElements((prev) => updateTreeElement(prev, id, (el) => ({ ...el, content: newContent })));
    },
    [setElements]
  );

  /**
   * Update arbitrary prop on an element.
   */
  const updateElementProp = useCallback(
    (id: string, key: string, value: any) => {
      setElements((prev) =>
        updateTreeElement(prev, id, (el) => ({
          ...el,
          [key]: value,
          props: {
            ...(el.props || {}),
            [key]: value,
          },
        }))
      );
    },
    [setElements]
  );

  return {
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    reorderElement,
    moveElement,
    updateElementStyle,
    updateElementContent,
    updateElementProp,
  };
}
