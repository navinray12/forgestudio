import type { BlockNode } from "../types/block.types";

export interface DropTargetResult {
  allowed: boolean;
  position: "before" | "after" | "inside";
  reason?: string;
}

export class DragDropEngine {
  /**
   * Checks if targetBlockId is a descendant of sourceBlockId (circular nesting check).
   */
  static isChildOf(sourceBlockId: string, targetBlockId: string, blocks: BlockNode[]): boolean {
    if (!sourceBlockId || !targetBlockId) return false;
    if (sourceBlockId === targetBlockId) return true;

    const findBlock = (nodes: BlockNode[], id: string): BlockNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (Array.isArray(node.innerBlocks)) {
          const found = findBlock(node.innerBlocks, id);
          if (found) return found;
        }
      }
      return null;
    };

    const sourceNode = findBlock(blocks, sourceBlockId);
    if (!sourceNode || !Array.isArray(sourceNode.innerBlocks)) return false;

    const checkDescendants = (nodes: BlockNode[]): boolean => {
      for (const child of nodes) {
        if (child.id === targetBlockId) return true;
        if (Array.isArray(child.innerBlocks) && checkDescendants(child.innerBlocks)) {
          return true;
        }
      }
      return false;
    };

    return checkDescendants(sourceNode.innerBlocks);
  }

  /**
   * Validates whether dragging sourceId onto targetId is allowed.
   */
  static validateDropTarget(
    sourceBlockId: string,
    targetBlockId: string,
    position: "before" | "after" | "inside",
    blocks: BlockNode[]
  ): DropTargetResult {
    if (sourceBlockId === targetBlockId) {
      return { allowed: false, position, reason: "Cannot drop a block onto itself." };
    }

    if (this.isChildOf(sourceBlockId, targetBlockId, blocks)) {
      return { allowed: false, position, reason: "Cannot drop a block into its own child (circular nesting)." };
    }

    return { allowed: true, position };
  }

  /**
   * Keyboard reordering helper: moves a block node up or down in its parent array.
   */
  static moveBlockInList(
    blocks: BlockNode[],
    blockId: string,
    direction: "up" | "down"
  ): BlockNode[] {
    const copy = JSON.parse(JSON.stringify(blocks)) as BlockNode[];

    const index = copy.findIndex((b) => b.id === blockId);
    if (index !== -1) {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < copy.length) {
        const [moved] = copy.splice(index, 1);
        copy.splice(targetIndex, 0, moved);
        return copy;
      }
      return copy;
    }

    // Recursively check inner blocks
    return copy.map((b) => {
      if (Array.isArray(b.innerBlocks) && b.innerBlocks.length > 0) {
        return {
          ...b,
          innerBlocks: this.moveBlockInList(b.innerBlocks, blockId, direction),
        };
      }
      return b;
    });
  }
}
