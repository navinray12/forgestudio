import type { BlockNode } from "../types/block.types";
import { getRegisteredBlockType } from "../registry/blockRegistry";

export function resolveFrontendBlockContext(
  block: BlockNode,
  parentContext: Record<string, any> = {}
): BlockNode {
  const def = getRegisteredBlockType(block.name);

  // Generate context provided by current block
  const providedContext: Record<string, any> = {};
  if (def?.providesContext) {
    for (const [attrName, contextKey] of Object.entries(def.providesContext)) {
      if (block.attributes[attrName] !== undefined) {
        providedContext[contextKey] = block.attributes[attrName];
      }
    }
  }

  const combinedContext = {
    ...parentContext,
    ...(block.context || {}),
    ...providedContext,
  };

  const processedInner = (block.innerBlocks || []).map((inner) =>
    resolveFrontendBlockContext(inner, combinedContext)
  );

  return {
    ...block,
    context: combinedContext,
    innerBlocks: processedInner,
  };
}
