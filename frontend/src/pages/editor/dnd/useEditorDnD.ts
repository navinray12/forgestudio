import { useState, useCallback } from "react";
import type { EditorElement, ElementType } from "../types";
import { isDescendant, findTreeElement } from "../utils";

interface UseEditorDnDProps {
  elements: EditorElement[];
  onAddElement: (type: ElementType, targetId: string | null, position: "before" | "after" | "inside" | null) => EditorElement | null;
  onMoveElement: (sourceId: string, targetId: string | null, position: "before" | "after" | "inside" | null) => boolean;
  disabledWidgets?: ElementType[];
}

export function useEditorDnD({
  elements,
  onAddElement,
  onMoveElement,
  disabledWidgets = [],
}: UseEditorDnDProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "inside" | null>(null);

  /**
   * Cleans up all transient drag/drop hover states
   */
  const cleanupDragState = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
    setDropPosition(null);
  }, []);

  /**
   * Handles element dragging over another canvas element, resolving position (before, inside, after).
   */
  const handleDragOverElement = useCallback(
    (e: React.DragEvent, elId: string, isContainer: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";

      // Self-drop or descendant-drop prevention
      if (draggingId === elId || (draggingId && isDescendant(elements, draggingId, elId))) {
        setDropTargetId(null);
        setDropPosition(null);
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const height = rect.height;

      let pos: "before" | "after" | "inside";
      if (isContainer) {
        if (offsetY < Math.min(height * 0.25, 30)) {
          pos = "before";
        } else if (offsetY > height - Math.min(height * 0.25, 30)) {
          pos = "after";
        } else {
          pos = "inside";
        }
      } else {
        if (offsetY < height * 0.5) {
          pos = "before";
        } else {
          pos = "after";
        }
      }

      setDropTargetId(elId);
      setDropPosition(pos);
    },
    [draggingId, elements]
  );

  /**
   * Auto-scrolls canvas container when dragging near viewport edges.
   */
  const handleCanvasAutoScroll = useCallback((e: React.DragEvent) => {
    const mainContainer = e.currentTarget.closest("main") || document.querySelector("main");
    if (!mainContainer) return;

    const rect = mainContainer.getBoundingClientRect();
    const edgeThreshold = 60;
    const scrollSpeed = 15;

    if (e.clientY - rect.top < edgeThreshold) {
      mainContainer.scrollTop -= scrollSpeed;
    } else if (rect.bottom - e.clientY < edgeThreshold) {
      mainContainer.scrollTop += scrollSpeed;
    }
  }, []);

  /**
   * Commits element drop (new widget insertion or existing element movement).
   */
  const handleDrop = useCallback(
    (
      e: React.DragEvent,
      targetId: string | null = null,
      position: "before" | "after" | "inside" | null = null
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const dataString =
        e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");

      let effectiveTargetId = targetId || dropTargetId;
      let effectivePosition: "before" | "after" | "inside" = position || dropPosition || "after";

      cleanupDragState();

      // Nearest element fallback if dropped in open canvas space
      if (!effectiveTargetId && elements.length > 0) {
        let closestId: string | null = null;
        let minDist = Infinity;
        let calculatedPos: "before" | "after" = "after";

        const nodes = document.querySelectorAll("[data-el-id]");
        nodes.forEach((node) => {
          const id = node.getAttribute("data-el-id");
          if (!id) return;
          const rect = node.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const dist = Math.abs(e.clientY - midY);
          if (dist < minDist) {
            minDist = dist;
            closestId = id;
            calculatedPos = e.clientY < midY ? "before" : "after";
          }
        });

        if (closestId) {
          effectiveTargetId = closestId;
          effectivePosition = calculatedPos;
        }
      }

      if (!dataString) return;

      try {
        const data = JSON.parse(dataString);
        if (data.type === "new" && data.widgetType) {
          if (disabledWidgets.includes(data.widgetType as ElementType)) return;
          onAddElement(data.widgetType as ElementType, effectiveTargetId, effectivePosition);
        } else if (data.type === "move" && data.id) {
          // Reject invalid drops
          if (effectiveTargetId && (data.id === effectiveTargetId || isDescendant(elements, data.id, effectiveTargetId))) {
            return;
          }
          onMoveElement(data.id, effectiveTargetId, effectivePosition);
        }
      } catch (err) {
        console.error("Drag and drop parse error:", err);
      }
    },
    [dropTargetId, dropPosition, cleanupDragState, elements, disabledWidgets, onAddElement, onMoveElement]
  );

  return {
    draggingId,
    dropTargetId,
    dropPosition,
    setDraggingId,
    setDropTargetId,
    setDropPosition,
    cleanupDragState,
    handleDragOverElement,
    handleCanvasAutoScroll,
    handleDrop,
  };
}
