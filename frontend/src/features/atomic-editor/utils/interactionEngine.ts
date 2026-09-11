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
const SAFE_CLASS_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const MAX_ID_LENGTH = 200;
const MAX_CLASS_NAME_LENGTH = 120;

function isSafeElementId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_ID_LENGTH;
}

function isSafeClassName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_CLASS_NAME_LENGTH &&
    SAFE_CLASS_NAME.test(value)
  );
}

function escapeSelector(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function resolveTarget(root: HTMLElement, targetId?: string): HTMLElement | null {
  if (!targetId) return root;
  if (!isSafeElementId(targetId)) return null;

  const escaped = escapeSelector(targetId);
  const target = root.querySelector<HTMLElement>(`[data-el-id="${escaped}"], #${escaped}`);
  return target && root.contains(target) ? target : null;
}

function mediaConditionMatches(condition?: InteractionCondition): boolean {
  if (!condition?.mediaQuery) return true;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;

  try {
    return window.matchMedia(condition.mediaQuery).matches;
  } catch {
    // Invalid media queries fail closed rather than unexpectedly running actions.
    return false;
  }
}

function runAction(source: HTMLElement, definition: InteractionDefinition, root: HTMLElement): void {
  if (!mediaConditionMatches(definition.condition)) return;

  const target = resolveTarget(root, definition.targetId) ?? source;
  if (!target) return;

  switch (definition.action.type) {
    case "toggle-class": {
      const className = definition.action.className.trim();
      if (!isSafeClassName(className)) return;
      target.classList.toggle(className);
      break;
    }
    case "show-hide": {
      const explicitVisibility = definition.action.visible;
      const visible = explicitVisibility === undefined ? !target.hidden : explicitVisibility;
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

  if (!definition.id || definition.id.length > MAX_ID_LENGTH) {
    errors.push(`Interaction id is required and must be <= ${MAX_ID_LENGTH} characters.`);
  }
  if (!isSafeElementId(definition.sourceId)) {
    errors.push(`Interaction sourceId is required and must be <= ${MAX_ID_LENGTH} characters.`);
  }
  if (!definition.trigger) errors.push("Interaction trigger is required.");
  if (!definition.action?.type) errors.push("Interaction action is required.");
  if (definition.targetId !== undefined && !isSafeElementId(definition.targetId)) {
    errors.push(`Target id must be a non-empty string <= ${MAX_ID_LENGTH} characters.`);
  }
  if (definition.action?.type === "toggle-class" && !isSafeClassName(definition.action.className.trim())) {
    errors.push("toggle-class requires one safe CSS class name.");
  }
  if (definition.action?.type === "set-attribute" && !SAFE_ATTRIBUTE_NAME.test(definition.action.name.trim())) {
    errors.push("set-attribute only permits data-* and aria-* attributes.");
  }
  if (definition.condition?.mediaQuery && definition.condition.mediaQuery.length > 500) {
    errors.push("mediaQuery must be <= 500 characters.");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Attach normalized interactions to a live editor/preview subtree.
 *
 * The binder is deliberately resilient to React re-renders: it observes added
 * nodes and binds them without stacking duplicate listeners. Cleanup disconnects
 * both DOM observers and all registered listeners.
 */
export function attachInteractions(
  root: HTMLElement,
  definitions: InteractionDefinition[],
): () => void {
  if (!root || !Array.isArray(definitions) || definitions.length === 0) return () => undefined;

  const validDefinitions = definitions.filter((definition) => {
    if (definition.enabled === false) return false;
    return validateInteraction(definition).valid;
  });

  if (validDefinitions.length === 0) return () => undefined;

  const definitionsBySource = new Map<string, InteractionDefinition[]>();
  for (const definition of validDefinitions) {
    const list = definitionsBySource.get(definition.sourceId) ?? [];
    list.push(definition);
    definitionsBySource.set(definition.sourceId, list);
  }

  const listenerCleanups = new Map<HTMLElement, Array<() => void>>();
  const viewportSeen = new WeakMap<HTMLElement, Set<string>>();
  const viewportObserver = typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const source = entry.target as HTMLElement;
          const sourceId = source.dataset.elId || source.id;
          if (!sourceId) continue;

          const seen = viewportSeen.get(source) ?? new Set<string>();
          viewportSeen.set(source, seen);

          for (const definition of definitionsBySource.get(sourceId) ?? []) {
            if (definition.trigger !== "viewport") continue;
            if (definition.once !== false && seen.has(definition.id)) continue;

            runAction(source, definition, root);
            if (definition.once !== false) seen.add(definition.id);
          }
        }
      }, { threshold: 0.15 })
    : null;

  const getSourceId = (element: HTMLElement): string | null => {
    const id = element.dataset.elId || element.id;
    return id && isSafeElementId(id) ? id : null;
  };

  const bindSource = (source: HTMLElement): void => {
    const sourceId = getSourceId(source);
    if (!sourceId || listenerCleanups.has(source)) return;

    const cleanups: Array<() => void> = [];
    const sourceDefinitions = definitionsBySource.get(sourceId) ?? [];

    for (const definition of sourceDefinitions) {
      if (definition.trigger === "viewport") {
        viewportObserver?.observe(source);
        continue;
      }

      const eventName = definition.trigger;
      let fired = false;
      const handler = () => {
        if (definition.once === true && fired) return;
        fired = true;
        runAction(source, definition, root);
        if (definition.once === true) {
          source.removeEventListener(eventName, handler);
        }
      };

      source.addEventListener(eventName, handler);
      cleanups.push(() => source.removeEventListener(eventName, handler));
    }

    listenerCleanups.set(source, cleanups);
  };

  const bindTree = (scope: ParentNode): void => {
    if (scope instanceof HTMLElement && (scope.dataset.elId || scope.id)) bindSource(scope);
    scope.querySelectorAll<HTMLElement>("[data-el-id], [id]").forEach(bindSource);
  };

  bindTree(root);

  const mutationObserver = typeof MutationObserver !== "undefined"
    ? new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement) bindTree(node);
          }
        }
      })
    : null;

  mutationObserver?.observe(root, { childList: true, subtree: true });

  return () => {
    mutationObserver?.disconnect();
    viewportObserver?.disconnect();

    for (const cleanups of listenerCleanups.values()) {
      for (const cleanup of cleanups) cleanup();
    }
    listenerCleanups.clear();
  };
}
