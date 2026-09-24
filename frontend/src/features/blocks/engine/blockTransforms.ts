import type { BlockNode } from "../types/block.types";
import { getRegisteredBlockType } from "../registry/blockRegistry";

export function getAvailableTransforms(block: BlockNode): { targetType: string; title: string }[] {
  const def = getRegisteredBlockType(block.name);
  if (!def || !def.transforms) return [];
  return def.transforms.map((t) => ({ targetType: t.targetType, title: t.title }));
}

export function executeBlockTransform(block: BlockNode, targetType: string): BlockNode {
  const def = getRegisteredBlockType(block.name);
  if (def && def.transforms) {
    const transformDef = def.transforms.find((t) => t.targetType === targetType);
    if (transformDef) {
      return transformDef.transform(block);
    }
  }

  // Generic fallback transformation
  return {
    ...block,
    name: targetType,
    attributes: {
      ...block.attributes,
    },
  };
}
