export type InteractionTrigger =
  | "click"
  | "dblclick"
  | "mouseenter"
  | "mouseleave"
  | "viewport";

export type InteractionAction =
  | { type: "toggle-class"; className: string }
  | { type: "show-hide"; visible?: boolean }
  | { type: "scroll-to"; behavior?: ScrollBehavior; block?: ScrollLogicalPosition }
  | { type: "set-attribute"; name: string; value: string | null }
  | { type: "focus" };

export interface InteractionCondition {
  mediaQuery?: string;
}

export interface InteractionDefinition {
  id: string;
  sourceId: string;
  trigger: InteractionTrigger;
  action: InteractionAction;
  targetId?: string;
  condition?: InteractionCondition;
  once?: boolean;
  enabled?: boolean;
}

export interface InteractionValidationResult {
  valid: boolean;
  errors: string[];
}

const SAFE_ATTRIBUTE_NAME = /^(?:data-[a-z0-9_.:-]+|aria-[a-z0-9_.:-]+)$/i;

function isSafeElementId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

function resolveTarget(root: HTMLElement, targetId?: string): HTMLElement | null {
  if (!targetId) return root;
  if (!isSafeElementId(targetId)) return null;
  const escaped = typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(targetId)
    : targetId.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  return root.querySelector<HTMLElement>(`[data-el-id="${escaped}"], #${escaped}`);
}

function mediaConditionMatches(condition?: InteractionCondition): boolean {
  if (!condition?.mediaQuery || typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  try {
    return window.matchMedia(condition.mediaQuery).matches;
  } catch {
    return false;
  }
}

function runAction(source: HTMLElement, definition: InteractionDefinition, root: HTMLElement): void {
  if (!mediaConditionMatches(definition.condition)) return;
  const target = resolveTarget(root, definition.targetId) ?? source;
  if (!target) return;

  switch (definition.action.type) {
    case "toggle-class":
      if (definition.action.className.trim()) {
        target.classList.toggle(definition.action.className.trim());
      }
      break;
    case "show-hide": {
      const visible = definition.action.visible ?? target.hidden;
      target.hidden = !visible;
      target.setAttribute("aria-hidden", String(!visible));
      break;
    }
    case "scroll-to":
      target.scrollIntoView({
        behavior: definition.action.behavior ?? "smooth",
        block: definition.action.block ?? "start",
      });
      break;
    case "set-attribute": {
      const name = definition.action.name.trim();
      if (!SAFE_ATTRIBUTE_NAME.test(name)) return;
      if (definition.action.value === null) target.removeAttribute(name);
      else target.setAttribute(name, definition.action.value);
      break;
    }
    case "focus":
      target.focus({ preventScroll: true });
      break;
  }
}

export function validateInteraction(definition: InteractionDefinition): InteractionValidationResult {
  const errors: string[] = [];

  if (!definition.id || definition.id.length > 200) {
    errors.push("Interaction id is required and must be <= 200 characters.");
  }
  if (!isSafeElementId(definition.sourceId)) {
    errors.push("Interaction sourceId is required and must be <= 200 characters.");
  }
  if (!definition.trigger) errors.push("Interaction trigger is required.");
  if (!definition.action?.type) errors.push("Interaction action is required.");
  if (definition.targetId !== undefined && !isSafeElementId(definition.targetId)) {
    errors.push("Target id must be a non-empty string <= 200 characters.");
  }
  if (definition.action?.type === "toggle-class" && !definition.action.className.trim()) {
    errors.push("toggle-class requires a class name.");
  }
  if (definition.action?.type === "set-attribute" && !SAFE_ATTRIBUTE_NAME.test(definition.action.name.trim())) {
    errors.push("set-attribute only permits data-* and aria-* attributes.");
  }

  return { valid: errors.length === 0, errors };
}

export function attachInteractions(
  root: HTMLElement,
  definitions: InteractionDefinition[],
): () => void {
  if (!root || !Array.isArray(definitions) || definitions.length === 0) return () => undefined;

  const cleanups: Array<() => void> = [];
  const viewportObserver = typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const source = entry.target as HTMLElement;
          const sourceId = source.dataset.elId || source.id;
          if (!sourceId) continue;

          const interactions = definitions.filter(
            (definition) =>
              definition.enabled !== false &&
              definition.trigger === "viewport" &&
              definition.sourceId === sourceId,
          );

          for (const definition of interactions) {
            runAction(source, definition, root);
            if (definition.once !== false) viewportObserver?.unobserve(source);
          }
        }
      }, { threshold: 0.15 })
    : null;

  const sourceElements = Array.from(root.querySelectorAll<HTMLElement>("[data-el-id], [id]"));
  if (root.matches("[data-el-id], [id]")) sourceElements.unshift(root);

  for (const source of sourceElements) {
    const sourceId = source.dataset.elId || source.id;
    if (!sourceId) continue;

    const sourceDefinitions = definitions.filter(
      (definition) => definition.enabled !== false && definition.sourceId === sourceId,
    );

    for (const definition of sourceDefinitions) {
      if (definition.trigger === "viewport") {
        viewportObserver?.observe(source);
        continue;
      }

      const handler = () => runAction(source, definition, root);
      const eventName: "click" | "dblclick" | "mouseenter" | "mouseleave" = definition.trigger;
      source.addEventListener(eventName, handler, { once: definition.once === true });
      cleanups.push(() => source.removeEventListener(eventName, handler));
    }
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
    viewportObserver?.disconnect();
  };
}
