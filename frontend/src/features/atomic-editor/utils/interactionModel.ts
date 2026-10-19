import type { InteractionDefinition, InteractionTrigger, InteractionAction } from "./interactionEngine";

/**
 * Small, dependency-free adapter between ForgeStudio's editor JSON and the
 * runtime interaction engine. Keeping this translation layer separate lets the
 * persisted page schema evolve without coupling DOM execution to the editor UI.
 */
export interface LegacyInteractionElement {
  id: string;
  interactionTrigger?: "none" | "click" | "hover" | "dblclick";
  interactionAction?: "none" | "toggle-class" | "show-hide" | "alert" | "scroll-to";
  interactionTargetId?: string;
  interactionActionValue?: string;
  interactions?: unknown;
}

export interface InteractionModelResult {
  definitions: InteractionDefinition[];
  warnings: string[];
}

const MAX_INTERACTIONS_PER_ELEMENT = 50;
const MAX_CLASS_NAME = 120;
const MAX_ACTION_VALUE = 1000;

function cleanId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 200 ? normalized : undefined;
}

function cleanActionValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= MAX_ACTION_VALUE ? normalized : undefined;
}

function toTrigger(trigger: LegacyInteractionElement["interactionTrigger"]): InteractionTrigger | undefined {
  switch (trigger) {
    case "click":
      return "click";
    case "dblclick":
      return "dblclick";
    case "hover":
      return "mouseenter";
    default:
      return undefined;
  }
}

function parseVisibility(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  switch (value.toLowerCase()) {
    case "show":
    case "visible":
    case "true":
    case "1":
      return true;
    case "hide":
    case "hidden":
    case "false":
    case "0":
      return false;
    default:
      return undefined;
  }
}

function toAction(
  action: LegacyInteractionElement["interactionAction"],
  value?: string,
): InteractionAction | undefined {
  switch (action) {
    case "toggle-class": {
      const className = value?.trim();
      if (!className || className.length > MAX_CLASS_NAME) return undefined;
      return { type: "toggle-class", className };
    }
    case "show-hide":
      return { type: "show-hide", visible: parseVisibility(value) };
    case "scroll-to":
      return { type: "scroll-to", behavior: "smooth", block: "start" };
    default:
      return undefined;
  }
}

/**
 * Converts the editor's existing single-interaction fields into the normalized
 * runtime contract. Unsupported legacy actions are reported rather than
 * silently executed.
 */
export function interactionDefinitionsFromElement(
  element: LegacyInteractionElement,
): InteractionModelResult {
  const warnings: string[] = [];
  const sourceId = cleanId(element.id);

  if (!sourceId || !element.interactionTrigger || element.interactionTrigger === "none") {
    return { definitions: [], warnings };
  }

  const trigger = toTrigger(element.interactionTrigger);
  if (!trigger) return { definitions: [], warnings };

  const action = element.interactionAction;
  if (!action || action === "none") {
    warnings.push(`Interaction on ${sourceId} has a trigger but no action.`);
    return { definitions: [], warnings };
  }

  if (action === "alert") {
    warnings.push(`Legacy alert interaction on ${sourceId} is ignored by the safe runtime.`);
    return { definitions: [], warnings };
  }

  const value = cleanActionValue(element.interactionActionValue);
  const normalizedAction = toAction(action, value);
  if (!normalizedAction) {
    warnings.push(`Invalid ${action} interaction configuration on ${sourceId}.`);
    return { definitions: [], warnings };
  }

  const targetId = cleanId(element.interactionTargetId);
  if (element.interactionTargetId && !targetId) {
    warnings.push(`Invalid interaction target on ${sourceId}; using the source element.`);
  }

  return {
    definitions: [
      {
        id: `interaction:${sourceId}:${trigger}:${action}`,
        sourceId,
        trigger,
        action: normalizedAction,
        targetId,
        enabled: true,
      },
    ],
    warnings,
  };
}

/**
 * Flattens a nested editor tree into a bounded interaction manifest.
 * This is intentionally pure so it can be reused by preview, published-site
 * rendering, export generation, and future collaboration workers.
 */
export function interactionManifestFromTree(
  elements: LegacyInteractionElement[],
): InteractionModelResult {
  const definitions: InteractionDefinition[] = [];
  const warnings: string[] = [];

  const visit = (items: LegacyInteractionElement[]) => {
    for (const element of items) {
      if (definitions.length >= MAX_INTERACTIONS_PER_ELEMENT * Math.max(1, elements.length)) {
        warnings.push("Interaction manifest limit reached; remaining interactions were skipped.");
        return;
      }

      const result = interactionDefinitionsFromElement(element);
      definitions.push(...result.definitions);
      warnings.push(...result.warnings);

      const children = (element as LegacyInteractionElement & { children?: LegacyInteractionElement[] }).children;
      if (Array.isArray(children) && children.length > 0) visit(children);
    }
  };

  visit(elements);
  return { definitions, warnings };
}
