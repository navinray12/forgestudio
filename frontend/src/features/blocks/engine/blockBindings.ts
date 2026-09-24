import type { BindingProviderContext, BlockNode } from "../types/block.types";

export function resolveFrontendBlockBindings(
  block: BlockNode,
  context: BindingProviderContext
): BlockNode {
  if (!block.bindings || Object.keys(block.bindings).length === 0) {
    return block;
  }

  const resolvedAttributes = { ...block.attributes };

  for (const [attrKey, binding] of Object.entries(block.bindings)) {
    let boundVal: any = undefined;

    switch (binding.provider) {
      case "static":
        boundVal = binding.defaultValue;
        break;

      case "site": {
        const key = binding.field || binding.key;
        if (key && context.site) {
          boundVal = (context.site as any)[key];
        }
        break;
      }

      case "post": {
        const key = binding.field || binding.key;
        if (key && context.post) {
          boundVal = (context.post as any)[key];
        }
        break;
      }

      case "user": {
        const key = binding.field || binding.key;
        if (key && context.user) {
          boundVal = (context.user as any)[key];
        }
        break;
      }

      case "media": {
        const key = binding.field || binding.key;
        if (key && context.media) {
          boundVal = context.media[key];
        }
        break;
      }

      case "custom_field": {
        const key = binding.metaKey || binding.field || binding.key;
        if (key && context.customFields) {
          boundVal = context.customFields[key];
        }
        break;
      }

      default:
        boundVal = binding.defaultValue;
        break;
    }

    if (boundVal !== undefined) {
      resolvedAttributes[attrKey] = boundVal;
    }
  }

  const resolvedInner = (block.innerBlocks || []).map((inner) =>
    resolveFrontendBlockBindings(inner, context)
  );

  return {
    ...block,
    attributes: resolvedAttributes,
    innerBlocks: resolvedInner,
  };
}
