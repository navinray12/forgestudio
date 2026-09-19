import type { ElementStyles } from "../../../pages/editor/WebsiteEditor";
import type { AtomicVariable } from "../types/variables.types";
import type { AtomicClass } from "../types/classes.types";
import type { ResolvedPropertyResult, ResolvedClassStyle, VariableClassUsageInfo } from "../types/variableClassSync.types";

/**
 * Checks if a string value is a variable reference e.g. "var(--primary-color)" or "var(var-123)"
 */
export function isVariableReference(val: string): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  return trimmed.startsWith("var(") && trimmed.endsWith(")");
}

/**
 * Extracts variable key/id from "var(--primary-color)" => "--primary-color" or "primary-color"
 */
export function extractVariableKey(val: string): string {
  if (!isVariableReference(val)) return val;
  const inner = val.trim().slice(4, -1).trim();
  return inner;
}

/**
 * Resolves a variable reference string to its raw CSS value
 */
export function resolveVariableValue(
  val: string,
  variables: AtomicVariable[],
  visitedKeys: Set<string> = new Set()
): ResolvedPropertyResult {
  if (!val) {
    return { value: "", isVariable: false };
  }

  if (!isVariableReference(val)) {
    return { value: val, isVariable: false };
  }

  const keyOrId = extractVariableKey(val);
  const cleanKey = keyOrId.startsWith("--") ? keyOrId.slice(2) : keyOrId;

  if (visitedKeys.has(cleanKey)) {
    return {
      value: "var(--circular-reference)",
      isVariable: true,
      variableKey: cleanKey,
      isCircular: true,
    };
  }

  // Find variable by key or id
  const targetVar = variables.find(
    (v) =>
      v.id === cleanKey ||
      v.key.toLowerCase() === cleanKey.toLowerCase() ||
      v.key.toLowerCase() === keyOrId.toLowerCase() ||
      `--${v.key}`.toLowerCase() === keyOrId.toLowerCase()
  );

  if (!targetVar) {
    return {
      value: `var(--missing-${cleanKey})`,
      isVariable: true,
      variableKey: cleanKey,
      isMissing: true,
    };
  }

  // Recursive resolution if variable value itself references another variable
  if (isVariableReference(targetVar.value)) {
    const nextVisited = new Set(visitedKeys);
    nextVisited.add(cleanKey);
    return resolveVariableValue(targetVar.value, variables, nextVisited);
  }

  return {
    value: targetVar.value,
    isVariable: true,
    variableKey: targetVar.key,
    variableId: targetVar.id,
    rawVariable: targetVar,
  };
}

/**
 * Resolves an entire ElementStyles object by expanding any var(...) references
 */
export function resolveClassStyles(
  styles: Partial<ElementStyles>,
  variables: AtomicVariable[]
): ResolvedClassStyle {
  const resolvedStyles: Partial<ElementStyles> = {};
  const missingVariables: string[] = [];
  const circularVariables: string[] = [];

  if (!styles || typeof styles !== "object") {
    return { resolvedStyles: {}, missingVariables: [], circularVariables: [] };
  }

  Object.entries(styles).forEach(([propKey, propVal]) => {
    if (typeof propVal === "string") {
      const res = resolveVariableValue(propVal, variables);
      (resolvedStyles as Record<string, any>)[propKey] = res.value;
      if (res.isMissing && res.variableKey) {
        missingVariables.push(res.variableKey);
      }
      if (res.isCircular && res.variableKey) {
        circularVariables.push(res.variableKey);
      }
    } else {
      (resolvedStyles as Record<string, any>)[propKey] = propVal;
    }
  });

  return {
    resolvedStyles,
    missingVariables,
    circularVariables,
  };
}

/**
 * Finds all classes referencing a given variable ID or Key
 */
export function findClassesUsingVariable(
  variable: AtomicVariable,
  classes: AtomicClass[]
): VariableClassUsageInfo {
  const referencingClasses: AtomicClass[] = [];

  for (const cls of classes) {
    if (!cls.styles) continue;
    let isUsed = false;

    for (const val of Object.values(cls.styles)) {
      if (typeof val === "string" && isVariableReference(val)) {
        const keyOrId = extractVariableKey(val);
        const cleanKey = keyOrId.startsWith("--") ? keyOrId.slice(2) : keyOrId;

        if (
          cleanKey.toLowerCase() === variable.id.toLowerCase() ||
          cleanKey.toLowerCase() === variable.key.toLowerCase() ||
          keyOrId.toLowerCase() === `--${variable.key}`.toLowerCase()
        ) {
          isUsed = true;
          break;
        }
      }
    }

    if (isUsed) {
      referencingClasses.push(cls);
    }
  }

  return {
    variableId: variable.id,
    variableKey: variable.key,
    referencingClasses,
    usageCount: referencingClasses.length,
  };
}
